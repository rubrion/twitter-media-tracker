import { ApifyClient } from "apify-client";
import { config } from "../config";
import { ApifyService } from "./ApifyService";
import * as fs from "fs/promises";
import * as path from "path";

export interface CacheEntry {
  data: any[];
  timestamp: string;
  lastCheck: string;
}

export interface TimeFilterOptions {
  checkSince?: string; // Data a partir da qual verificar (formato ISO)
  maxCacheAge?: number; // Idade máxima do cache em horas (padrão: 24h)
}

export interface ProductionVerificationResult {
  interacoes: UserInteraction;
  cacheUsed: boolean;
  newDataSince?: string;
}

export interface UserInteraction {
  seguindo: boolean;
  retweetou: boolean;
  comentou: boolean;
  curtiu: null; // Sempre null - limitação técnica
}

export interface InteractionResult {
  usuario: string;
  tweetUrl: string;
  paginaAlvo: string;
  interacoes: UserInteraction;
  score: number; // 0-100%
  timestamp: string;
  source: "development" | "production";
  cacheUsed?: boolean; // Indica se usou cache temporal
  newDataSince?: string; // Data desde quando há dados novos
}

export interface TwitterUserScraperResult {
  userName: string;
  name: string;
  id: string;
  followers: number;
  following: number;
  [key: string]: any;
}

export class InteractionService {
  private apifyService: ApifyService;
  private apifyClient: ApifyClient;
  private tweetScraperId = "61RPP7dywgiy0JPD0"; // Tweet Scraper
  private userScraperId = "apidojo/twitter-user-scraper"; // User Scraper
  private examplesDir = path.join(process.cwd(), "examples");
  private cacheDir = path.join(process.cwd(), "cache"); // Novo: diretório de cache temporal

  constructor() {
    this.apifyService = new ApifyService();
    this.apifyClient = new ApifyClient({
      token: config.apify.token,
    });
  }

  /**
   * Gerar exemplos reais e salvar em arquivos JSON para desenvolvimento
   */
  async gerarExemplosReais(): Promise<void> {
    console.log("🔄 Gerando exemplos reais dos scrapers...");

    // Criar diretório de exemplos se não existir
    await fs.mkdir(this.examplesDir, { recursive: true });

    const testParams = {
      usuario: "blairjdaniel",
      tweetUrl: "https://x.com/RoguesNFT/status/1960014365333299601",
      tweetId: "1960014365333299601",
      paginaAlvo: "RoguesNFT",
    };

    try {
      // 1. Gerar exemplo de seguidores da página alvo (followers)
      console.log("📥 Obtendo lista de seguidores da página alvo...");
      const followingData = await this.obterSeguidoresDaPagina(
        testParams.paginaAlvo
      );
      await this.salvarExemplo("followers_of_target_page.json", followingData);

      // 2. Gerar exemplo de retweets do usuário
      console.log("🔄 Obtendo timeline de retweets do usuário...");
      const retweetData = await this.obterTimelineUsuarioParaRetweets(
        testParams.usuario,
        testParams.paginaAlvo
      );
      await this.salvarExemplo("user_timeline_retweets.json", retweetData);

      // 3. Gerar exemplo de comentários
      console.log("💬 Obtendo comentários...");
      const comentariosData = await this.obterComentariosReal(
        testParams.tweetId
      );
      await this.salvarExemplo("comments_example.json", comentariosData);

      console.log("✅ Exemplos reais gerados com sucesso!");
    } catch (error) {
      console.error("❌ Erro ao gerar exemplos:", error);
      throw error;
    }
  }

  /**
   * Verificar todas as interações de um usuário com filtros temporais
   */
  async verificarInteracoes(
    usuario: string,
    tweetUrl: string,
    paginaAlvo: string,
    timeFilter?: TimeFilterOptions
  ): Promise<InteractionResult> {
    const isDevelopment = config.app.env === "development";

    console.log(
      `🔍 Verificando interações (modo: ${
        isDevelopment ? "development" : "production"
      })${timeFilter?.checkSince ? ` desde: ${timeFilter.checkSince}` : ""}`
    );

    let interacoes: UserInteraction;
    let cacheUsed = false;
    let newDataSince: string | undefined;

    if (isDevelopment) {
      interacoes = await this.verificarInteracoesDevelopment(
        usuario,
        tweetUrl,
        paginaAlvo
      );
    } else {
      const result = await this.verificarInteracoesProduction(
        usuario,
        tweetUrl,
        paginaAlvo,
        timeFilter
      );
      interacoes = result.interacoes;
      cacheUsed = result.cacheUsed || false;
      newDataSince = result.newDataSince;
    }

    const score = this.calcularScore(interacoes);

    return {
      usuario,
      tweetUrl,
      paginaAlvo,
      interacoes,
      score,
      timestamp: new Date().toISOString(),
      source: isDevelopment ? "development" : "production",
      cacheUsed,
      newDataSince,
    };
  }

  /**
   * Verificar interações usando exemplos salvos (development)
   */
  private async verificarInteracoesDevelopment(
    usuario: string,
    tweetUrl: string,
    paginaAlvo: string
  ): Promise<UserInteraction> {
    console.log("📂 Carregando dados de exemplo...");

    try {
      // Carregar exemplos
      const followingData = await this.carregarExemplo(
        "followers_of_target_page.json"
      );
      const retweetData = await this.carregarExemplo(
        "user_timeline_retweets.json"
      );
      const comentariosData = await this.carregarExemplo(
        "comments_example.json"
      );

      // Verificar cada interação nos dados de exemplo
      const seguindo = this.verificarSeguidorNosExemplos(
        usuario,
        paginaAlvo,
        followingData
      );
      const retweetou = this.verificarRetweetNosExemplos(
        usuario,
        paginaAlvo,
        retweetData
      );
      const comentou = this.verificarComentarioNosExemplos(
        usuario,
        comentariosData
      );

      return {
        seguindo,
        retweetou,
        comentou,
        curtiu: null,
      };
    } catch (error) {
      console.error("❌ Erro ao verificar interações em development:", error);
      throw error;
    }
  }

  /**
   * Verificar interações fazendo chamadas reais (production) com cache temporal
   */
  private async verificarInteracoesProduction(
    usuario: string,
    tweetUrl: string,
    paginaAlvo: string,
    timeFilter?: TimeFilterOptions
  ): Promise<ProductionVerificationResult> {
    console.log("🌐 Fazendo chamadas reais aos scrapers...");

    try {
      const tweetId = this.extrairTweetId(tweetUrl);

      // Verificar cache temporal para seguidores (mais estável)
      const { seguindo, seguidoresFromCache } =
        await this.verificarSeguidorComCache(usuario, paginaAlvo, timeFilter);

      // Verificar retweets na timeline do usuário
      const retweetou = await this.verificarRetweetNaTimeline(
        usuario,
        paginaAlvo
      );

      // Verificar comentários com filtro temporal
      const comentou = await this.verificarComentarioComFiltroTemporal(
        usuario,
        tweetId,
        timeFilter
      );

      const interacoes: UserInteraction = {
        seguindo,
        retweetou,
        comentou,
        curtiu: null,
      };

      return {
        interacoes,
        cacheUsed: seguidoresFromCache,
        newDataSince: timeFilter?.checkSince,
      };
    } catch (error) {
      console.error("❌ Erro ao verificar interações em production:", error);
      throw error;
    }
  }

  /**
   * Obter seguidores da página alvo (mais eficiente e cacheável)
   * OTIMIZADO: Busca seguidores da página em vez de quem o usuário segue
   */
  private async obterSeguidoresDaPagina(
    paginaAlvo: string
  ): Promise<TwitterUserScraperResult[]> {
    const input = {
      twitterHandles: [paginaAlvo],
      getFollowers: true, // MUDANÇA: getFollowers em vez de getFollowing
      maxItems: 5000, // Página alvo tem número mais previsível de seguidores
    };

    const run = await this.apifyClient.actor(this.userScraperId).call(input);
    const response = await this.apifyClient
      .dataset(run.defaultDatasetId)
      .listItems();

    return response.items as TwitterUserScraperResult[];
  }

  /**
   * Obter timeline do usuário para verificar retweets da página específica
   * NOVA ESTRATÉGIA: Busca últimos tweets do usuário e verifica se há retweets da página alvo
   */
  private async obterTimelineUsuarioParaRetweets(
    usuario: string,
    paginaAlvo: string
  ): Promise<any[]> {
    const searchQuery = {
      searchTerms: [`from:${usuario} filter:nativeretweets`],
      maxItems: 50, // Últimos 50 tweets do usuário que são retweets
    };

    const timelineData = await this.apifyService.searchTweets(searchQuery);
    return timelineData;
  }

  /**
   * Obter comentários do tweet (Tweet Scraper)
   * OTIMIZADO: Limitado para reduzir custos
   */
  private async obterComentariosReal(tweetId: string): Promise<any[]> {
    const searchQuery = {
      searchTerms: [`conversation_id:${tweetId}`],
      maxItems: 500, // OTIMIZADO: Reduzido de 1000 para 500
    };

    const comentarios = await this.apifyService.searchTweets(searchQuery);
    return comentarios;
  }

  /**
   * Verificar se usuário segue página específica
   * OTIMIZADO: Busca na lista de seguidores da página (mais eficiente)
   */
  private async verificarSeguidorReal(
    usuario: string,
    paginaAlvo: string
  ): Promise<boolean> {
    const seguidoresDaPagina = await this.obterSeguidoresDaPagina(paginaAlvo);
    return seguidoresDaPagina.some(
      (user: TwitterUserScraperResult) =>
        user.userName.toLowerCase() === usuario.replace("@", "").toLowerCase()
    );
  }

  /**
   * Verificar se usuário retweetou da página específica analisando sua timeline
   * NOVA ESTRATÉGIA: Busca retweets na timeline do usuário da página alvo
   */
  private async verificarRetweetNaTimeline(
    usuario: string,
    paginaAlvo: string
  ): Promise<boolean> {
    console.log(
      `🔄 Verificando retweets de ${usuario} da página ${paginaAlvo} na timeline`
    );

    const timelineData = await this.obterTimelineUsuarioParaRetweets(
      usuario,
      paginaAlvo
    );

    // Verificar se há tweets retweetados da página alvo
    const retweetouPagina = timelineData.some((tweet) => {
      // Verificar se o tweet original é da página alvo
      return (
        tweet.isRetweet &&
        tweet.retweetedTweet?.author?.userName?.toLowerCase() ===
          paginaAlvo.toLowerCase()
      );
    });

    console.log(
      `✅ Usuário ${usuario} ${
        retweetouPagina ? "retweetou" : "NÃO retweetou"
      } da página ${paginaAlvo}`
    );
    return retweetouPagina;
  }

  /**
   * Verificar se usuário comentou tweet específico com filtro temporal
   * OTIMIZADO: Busca apenas comentários desde uma data específica
   */
  private async verificarComentarioComFiltroTemporal(
    usuario: string,
    tweetId: string,
    timeFilter?: TimeFilterOptions
  ): Promise<boolean> {
    console.log(
      `💬 Verificando comentários de ${usuario} ${
        timeFilter?.checkSince ? `desde ${timeFilter.checkSince}` : ""
      }`
    );

    // Construir query com filtro temporal se disponível
    let searchQuery: any = {
      searchTerms: [`conversation_id:${tweetId}`],
      maxItems: 100,
    };

    if (timeFilter?.checkSince) {
      // Converter ISO para formato Twitter (YYYY-MM-DD)
      const sinceDate = new Date(timeFilter.checkSince)
        .toISOString()
        .split("T")[0];
      searchQuery = {
        searchTerms: [`conversation_id:${tweetId} since:${sinceDate}`],
        maxItems: 100,
      };
    }

    const comentariosData = await this.apifyService.searchTweets(searchQuery);

    const resultado = comentariosData.some(
      (tweet) =>
        tweet.author.userName.toLowerCase() ===
          usuario.replace("@", "").toLowerCase() && tweet.isReply
    );

    console.log(
      `✅ Usuário ${usuario} ${resultado ? "comentou" : "NÃO comentou"} ${
        timeFilter?.checkSince ? `desde ${timeFilter.checkSince}` : ""
      }`
    );
    return resultado;
  }

  /**
   * Verificar seguidor com sistema de cache temporal
   */
  private async verificarSeguidorComCache(
    usuario: string,
    paginaAlvo: string,
    timeFilter?: TimeFilterOptions
  ): Promise<{ seguindo: boolean; seguidoresFromCache: boolean }> {
    console.log(
      `👥 Verificando seguidor ${usuario} em ${paginaAlvo} com cache`
    );

    const cacheKey = `followers_${paginaAlvo}`;
    const maxCacheAge = timeFilter?.maxCacheAge || 24; // 24 horas padrão

    // Tentar carregar do cache
    const cacheData = await this.carregarCache(cacheKey);
    const ageCacheHours = cacheData
      ? this.calcularIdadeCache(cacheData.timestamp)
      : Infinity;

    let seguidoresDaPagina: TwitterUserScraperResult[];
    let seguidoresFromCache = false;

    if (cacheData && ageCacheHours < maxCacheAge) {
      console.log(
        `📋 Usando cache de seguidores (${ageCacheHours.toFixed(1)}h de idade)`
      );
      seguidoresDaPagina = cacheData.data;
      seguidoresFromCache = true;
    } else {
      console.log(
        `🔄 Cache expirado ou inexistente, buscando novos seguidores`
      );
      seguidoresDaPagina = await this.obterSeguidoresDaPagina(paginaAlvo);

      // Salvar no cache
      await this.salvarCache(cacheKey, {
        data: seguidoresDaPagina,
        timestamp: new Date().toISOString(),
        lastCheck: new Date().toISOString(),
      });
    }

    const seguindo = seguidoresDaPagina.some(
      (user: TwitterUserScraperResult) =>
        user.userName.toLowerCase() === usuario.replace("@", "").toLowerCase()
    );

    return { seguindo, seguidoresFromCache };
  }
  /**
   * Verificar seguidor nos exemplos salvos
   * OTIMIZADO: Procura o usuário na lista de seguidores da página
   */
  private verificarSeguidorNosExemplos(
    usuario: string,
    paginaAlvo: string,
    seguidoresDaPagina: TwitterUserScraperResult[]
  ): boolean {
    return seguidoresDaPagina.some(
      (user) =>
        user.userName.toLowerCase() === usuario.replace("@", "").toLowerCase()
    );
  }

  /**
   * Verificar retweet nos exemplos salvos
   * NOVA ESTRATÉGIA: Procura retweets da página alvo na timeline do usuário
   */
  private verificarRetweetNosExemplos(
    usuario: string,
    paginaAlvo: string,
    timelineData: any[]
  ): boolean {
    return timelineData.some((tweet) => {
      return (
        tweet.isRetweet &&
        tweet.retweetedTweet?.author?.userName?.toLowerCase() ===
          paginaAlvo.toLowerCase()
      );
    });
  }

  /**
   * Verificar comentário nos exemplos salvos
   */
  private verificarComentarioNosExemplos(
    usuario: string,
    comentariosData: any[]
  ): boolean {
    return comentariosData.some(
      (tweet) =>
        tweet.author?.userName?.toLowerCase() ===
          usuario.replace("@", "").toLowerCase() && tweet.isReply
    );
  }

  /**
   * Calcular score de engajamento (0-100%)
   */
  private calcularScore(interacoes: UserInteraction): number {
    const acoes = [
      interacoes.seguindo,
      interacoes.retweetou,
      interacoes.comentou,
    ];
    const positivas = acoes.filter(Boolean).length;
    return Math.round((positivas / 3) * 100);
  }

  /**
   * Extrair ID do tweet da URL
   */
  private extrairTweetId(tweetUrl: string): string {
    const match = tweetUrl.match(/status\/(\d+)/);
    if (!match) {
      throw new Error(`URL do tweet inválida: ${tweetUrl}`);
    }
    return match[1];
  }

  /**
   * Salvar exemplo em arquivo JSON
   */
  private async salvarExemplo(filename: string, data: any): Promise<void> {
    const filepath = path.join(this.examplesDir, filename);
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    console.log(`💾 Exemplo salvo: ${filename}`);
  }

  /**
   * Carregar exemplo de arquivo JSON
   */
  private async carregarExemplo(filename: string): Promise<any> {
    const filepath = path.join(this.examplesDir, filename);
    try {
      const data = await fs.readFile(filepath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      throw new Error(
        `Não foi possível carregar exemplo: ${filename}. Execute /generate-examples primeiro.`
      );
    }
  }

  /**
   * Salvar dados no cache temporal
   */
  private async salvarCache(key: string, data: CacheEntry): Promise<void> {
    await fs.mkdir(this.cacheDir, { recursive: true });
    const filepath = path.join(this.cacheDir, `${key}.json`);
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    console.log(`💾 Cache salvo: ${key}`);
  }

  /**
   * Carregar dados do cache temporal
   */
  private async carregarCache(key: string): Promise<CacheEntry | null> {
    const filepath = path.join(this.cacheDir, `${key}.json`);
    try {
      const data = await fs.readFile(filepath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      return null; // Cache não existe
    }
  }

  /**
   * Calcular idade do cache em horas
   */
  private calcularIdadeCache(timestamp: string): number {
    const cacheTime = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - cacheTime.getTime();
    return diffMs / (1000 * 60 * 60); // Converter para horas
  }
}
