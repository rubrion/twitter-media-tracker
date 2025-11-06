import { ApifyClient } from "apify-client";
import { config } from "../config";
import { ApifyService } from "./ApifyService";
import { TweetData } from "../types";
import * as fs from "fs/promises";
import * as path from "path";

export interface CacheEntry {
  data: TwitterUserScraperResult[];
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
  comentou: boolean;
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
  private cacheDir = path.join(process.cwd(), "cache");

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
      tweetUrl: "https://x.com/RoguesNFT/status/1960014365333299601",
      tweetId: "1960014365333299601",
      paginaAlvo: "RoguesNFT",
    };

    try {
      // 1. Tentar obter seguidores da página alvo usando estratégia alternativa
      console.log("🔄 Obtendo seguidores da página alvo...");

      try {
        // Primeira tentativa: User Scraper (pode falhar devido às limitações atuais)
        const followersData = await this.obterSeguidoresDaPagina(
          testParams.paginaAlvo
        );
        await this.salvarExemplo(
          "followers_of_target_page.json",
          followersData
        );
        console.log(
          `✅ Seguidores obtidos via User Scraper: ${followersData.length}`
        );
      } catch (userScraperError) {
        console.log(
          "⚠️ User Scraper falhou, tentando estratégia alternativa..."
        );
        console.log("Erro:", userScraperError);

        // Estratégia alternativa: buscar usuários que interagiram com a página
        const alternativeFollowers = await this.obterSeguidoresAlternativo(
          testParams.paginaAlvo
        );
        await this.salvarExemplo(
          "followers_of_target_page.json",
          alternativeFollowers
        );
        console.log(
          `✅ Seguidores obtidos via estratégia alternativa: ${alternativeFollowers.length}`
        );
      }

      // 2. Gerar exemplo de comentários
      console.log("🔄 Obtendo comentários do tweet...");
      const commentData = await this.apifyService.searchTweets({
        searchTerms: [`conversation_id:${testParams.tweetId}`],
        maxItems: 200,
      });
      console.log(
        `📊 Obtidos ${commentData.length} comentários para tweet ${testParams.tweetId}`
      );
      if (commentData.length > 0) {
        console.log(
          `📊 Primeiros comentários:`,
          JSON.stringify(
            commentData.slice(0, 3).map((c) => ({
              author: c.author?.userName,
              text: c.text?.substring(0, 100),
            })),
            null,
            2
          )
        );
      }
      await this.salvarExemplo("comments_example.json", commentData);

      console.log("✅ Exemplos gerados com sucesso!");
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
 * Verificar se o usuário segue uma página alvo
 */
async verificarSeguidor(
  usuario: string,
  paginaAlvo: string
): Promise<{ usuario: string; paginaAlvo: string; segue: boolean }> {
  const isDevelopment = config.app.env === "development";

  console.log(
    `🔍 Verificando se ${usuario} segue ${paginaAlvo} (modo: ${
      isDevelopment ? "development" : "production"
    })`
  );

  let segue = false;

  if (isDevelopment) {
    segue = await this.verificarSeguidorDevelopment(usuario, paginaAlvo);
  } else {
    segue = await this.verificarSeguidorProduction(usuario, paginaAlvo);
  }

  return {
    usuario,
    paginaAlvo,
    segue,
  };
}

/**
 * Verificar se o usuário comentou em um tweet
 */
async verificarComentario(
  usuario: string,
  tweetUrl: string,
  timeFilter?: TimeFilterOptions
): Promise<{ usuario: string; tweetUrl: string; comentou: boolean; newDataSince?: string }> {
  const isDevelopment = config.app.env === "development";

  console.log(
    `💬 Verificando comentário de ${usuario} em ${tweetUrl} (modo: ${
      isDevelopment ? "development" : "production"
    })${timeFilter?.checkSince ? ` desde: ${timeFilter.checkSince}` : ""}`
  );

  let comentou = false;
  let newDataSince: string | undefined;

  if (isDevelopment) {
    // mock de ambiente de desenvolvimento
    comentou = await this.verificarComentarioDevelopment(usuario, tweetUrl);
  } else {
    const result = await this.verificarComentarioProduction(
      usuario,
      tweetUrl,
      timeFilter
    );
    comentou = result.comentou;
    newDataSince = result.newDataSince;
  }

  return {
    usuario,
    tweetUrl,
    comentou,
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
      const followingData = (await this.carregarExemplo(
        "followers_of_target_page.json"
      )) as TwitterUserScraperResult[];
      const comentariosData = (await this.carregarExemplo(
        "comments_example.json"
      )) as TweetData[];

      // Verificar cada interação nos dados de exemplo
      const seguindo = this.verificarSeguidorNosExemplos(
        usuario,
        paginaAlvo,
        followingData
      );
      const comentou = this.verificarComentarioNosExemplos(
        usuario,
        comentariosData
      );

      return {
        seguindo,
        comentou,
      };
    } catch (error) {
      console.error("❌ Erro ao verificar interações em development:", error);
      throw error;
    }
  }

  /**
   * Verificar SEGUIDOR usando exemplos salvos (development)
   */
  private async verificarSeguidorDevelopment(
    usuario: string,
    paginaAlvo: string
  ): Promise<boolean> {
    console.log("📂 Carregando dados de exemplo (seguidores)...");

    try {
      const followingData = (await this.carregarExemplo(
        "followers_of_target_page.json"
      )) as TwitterUserScraperResult[];

      return this.verificarSeguidorNosExemplos(
        usuario,
        paginaAlvo,
        followingData
      );
    } catch (error) {
      console.error("❌ Erro ao verificar seguidor em development:", error);
      throw error;
    }
  }

  /**
   * Verificar COMENTÁRIO usando exemplos salvos (development)
   */
  private async verificarComentarioDevelopment(
    usuario: string,
    tweetUrl: string
  ): Promise<boolean> {
    console.log("📂 Carregando dados de exemplo (comentários)...");

    try {
      const comentariosData = (await this.carregarExemplo(
        "comments_example.json"
      )) as TweetData[];

      return this.verificarComentarioNosExemplos(usuario, comentariosData);
    } catch (error) {
      console.error("❌ Erro ao verificar comentário em development:", error);
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

      // Verificar comentários com filtro temporal
      const comentou = await this.verificarComentarioComFiltroTemporal(
        usuario,
        tweetId,
        timeFilter
      );

      const interacoes: UserInteraction = {
        seguindo,
        comentou,
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
   * Verificar SEGUIDOR fazendo chamadas reais (production) com cache temporal
   */
  private async verificarSeguidorProduction(
    usuario: string,
    paginaAlvo: string
  ): Promise<boolean> {
    console.log("🌐 Verificando seguidor em produção...");

    try {
      const { seguindo } = await this.verificarSeguidorComCache(
        usuario,
        paginaAlvo
      );
      return seguindo;
    } catch (error) {
      console.error("❌ Erro ao verificar seguidor em production:", error);
      throw error;
    }
  }

  /**
   * Verificar COMENTÁRIO fazendo chamadas reais (production) com filtro temporal
   */
  private async verificarComentarioProduction(
    usuario: string,
    tweetUrl: string,
    timeFilter?: TimeFilterOptions
  ): Promise<{ comentou: boolean; newDataSince?: string }> {
    console.log("🌐 Verificando comentário em produção...");

    try {
      const tweetId = this.extrairTweetId(tweetUrl);

      const comentou = await this.verificarComentarioComFiltroTemporal(
        usuario,
        tweetId,
        timeFilter
      );

      return {
        comentou,
        newDataSince: timeFilter?.checkSince,
      };
    } catch (error) {
      console.error("❌ Erro ao verificar comentário em production:", error);
      throw error;
    }
  }


  /**
   * Obter comentários do tweet (Tweet Scraper)
   * OTIMIZADO: Limitado para reduzir custos
   */
  private async obterComentariosReal(tweetId: string): Promise<TweetData[]> {
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

    // Buscar o usuário na lista de seguidores
    const segue = seguidoresDaPagina.some(
      (seguidor) =>
        seguidor.userName.toLowerCase() ===
        usuario.replace("@", "").toLowerCase()
    );

    console.log(
      `${segue ? "✅" : "❌"} ${usuario} ${
        segue ? "SEGUE" : "NÃO SEGUE"
      } @${paginaAlvo}`
    );

    return segue;
  }

  /**
   * Verificar comentário em tweet específico com filtro temporal
   * OTIMIZADO: Com filtros since/until quando disponíveis
   */
  private async verificarComentarioComFiltroTemporal(
    usuario: string,
    tweetId: string,
    timeFilter?: TimeFilterOptions
  ): Promise<boolean> {
    console.log(
      `💬 Verificando comentários de ${usuario} no tweet ${tweetId}${
        timeFilter?.checkSince ? ` desde ${timeFilter.checkSince}` : ""
      }`
    );

    try {
      // Criar query com filtro temporal se disponível
      const searchQuery: {
        searchTerms: string[];
        maxItems: number;
        start?: string;
      } = {
        searchTerms: [`conversation_id:${tweetId}`],
        maxItems: 500,
      };

      // Adicionar filtro temporal se especificado
      if (timeFilter?.checkSince) {
        const sinceDate = new Date(timeFilter.checkSince)
          .toISOString()
          .split("T")[0];
        searchQuery.start = sinceDate;
        console.log(`📅 Buscando comentários desde: ${sinceDate}`);
      }

      const comentarios = await this.apifyService.searchTweets(searchQuery);

      const comentou = comentarios.some(
        (tweet) =>
          tweet.author?.userName?.toLowerCase() ===
          usuario.replace("@", "").toLowerCase()
      );

      console.log(
        `${comentou ? "✅" : "❌"} ${usuario} ${
          comentou ? "COMENTOU" : "NÃO COMENTOU"
        } no tweet`
      );

      return comentou;
    } catch (error) {
      console.error("❌ Erro ao verificar comentário:", error);
      return false;
    }
  }

  /**
   * NOVO: Verificar seguidor com cache temporal para otimização
   * Cache TTL de 24h para dados estáveis como seguidores
   */
  private async verificarSeguidorComCache(
    usuario: string,
    paginaAlvo: string,
    timeFilter?: TimeFilterOptions
  ): Promise<{ seguindo: boolean; seguidoresFromCache: boolean }> {
    console.log(
      `👥 Verificando se ${usuario} segue @${paginaAlvo} (com cache)`
    );

    const cacheKey = `followers_${paginaAlvo.toLowerCase()}`;
    const maxCacheAgeHours = timeFilter?.maxCacheAge || 24; // 24h padrão

    try {
      // Verificar cache primeiro
      const cachedData = await this.lerCache(cacheKey);

      if (cachedData && this.isCacheValid(cachedData, maxCacheAgeHours)) {
        console.log(
          `📦 Usando dados do cache (${cachedData.data.length} seguidores)`
        );

        const seguindo = cachedData.data.some(
          (seguidor: TwitterUserScraperResult) =>
            seguidor.userName?.toLowerCase() ===
            usuario.replace("@", "").toLowerCase()
        );

        console.log(
          `${seguindo ? "✅" : "❌"} ${usuario} ${
            seguindo ? "SEGUE" : "NÃO SEGUE"
          } @${paginaAlvo} (cache)`
        );

        return { seguindo, seguidoresFromCache: true };
      }

      // Cache expirado ou inexistente - buscar dados frescos
      console.log("🔄 Cache expirado, buscando dados frescos...");
      const seguidoresFrescos = await this.obterSeguidoresDaPagina(paginaAlvo);

      // Salvar no cache
      await this.salvarNoCache(cacheKey, seguidoresFrescos);

      const seguindo = seguidoresFrescos.some(
        (seguidor) =>
          seguidor.userName?.toLowerCase() ===
          usuario.replace("@", "").toLowerCase()
      );

      console.log(
        `${seguindo ? "✅" : "❌"} ${usuario} ${
          seguindo ? "SEGUE" : "NÃO SEGUE"
        } @${paginaAlvo} (fresh)`
      );

      return { seguindo, seguidoresFromCache: false };
    } catch (error) {
      console.error("❌ Erro na verificação com cache:", error);
      // Fallback: tentar verificação direta
      const seguindo = await this.verificarSeguidorReal(usuario, paginaAlvo);
      return { seguindo, seguidoresFromCache: false };
    }
  }

  /**
   * Obter seguidores da página usando User Scraper
   * ESTRATÉGIA OTIMIZADA: Buscar seguidores da página ao invés de seguindo do usuário
   */
  private async obterSeguidoresDaPagina(
    paginaAlvo: string
  ): Promise<TwitterUserScraperResult[]> {
    console.log(`👥 Obtendo seguidores da página @${paginaAlvo}...`);

    try {
      const input = {
        twitterHandles: [paginaAlvo], // Correto conforme documentação
        getFollowers: true,
        getFollowing: false,
        getRetweeters: false,
        includeUnavailableUsers: false,
        maxRequestRetries: 3,
        maxItems: 50000, // OTIMIZADO: Limitado para reduzir custos
      };

      console.log(
        `🔧 Input para User Scraper:`,
        JSON.stringify(input, null, 2)
      );

      const run = await this.apifyClient
        .actor(this.userScraperId)
        .call(input, { waitSecs: 120 });

      console.log(`📋 Run ID: ${run.id}, Dataset ID: ${run.defaultDatasetId}`);

      const response = await this.apifyClient
        .dataset(run.defaultDatasetId)
        .listItems();

      console.log(`📊 Raw response total: ${response.items.length} items`);
      console.log(
        `📊 First few items:`,
        JSON.stringify(response.items.slice(0, 3), null, 2)
      );

      const rawItems = response.items as Record<string, unknown>[];
      const seguidores = rawItems
        .filter((item) => item.userName && item.followers !== undefined)
        .map((item) => ({
          userName: item.userName as string,
          name: (item.name || item.displayName || "") as string,
          id: (item.id || "") as string,
          followers: (item.followers || 0) as number,
          following: (item.following || 0) as number,
          verified: (item.verified || false) as boolean,
          profilePicture: (item.profilePicture || "") as string,
          description: (item.description || "") as string,
        })) as TwitterUserScraperResult[];

      console.log(
        `✅ Obtidos ${seguidores.length} seguidores da página @${paginaAlvo}`
      );

      return seguidores;
    } catch (error) {
      console.error(
        `❌ Erro ao obter seguidores da página ${paginaAlvo}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Estratégia alternativa para obter seguidores usando Tweet Scraper
   * Busca usuários que interagiram com a página para identificar potenciais seguidores
   */
  private async obterSeguidoresAlternativo(
    paginaAlvo: string
  ): Promise<TwitterUserScraperResult[]> {
    console.log(
      `👥 Obtendo seguidores alternativos da página @${paginaAlvo}...`
    );

    try {
      // Estratégia 1: Buscar usuários que curtiram tweets da página
      const likersQuery = await this.apifyService.searchTweets({
        searchTerms: [`from:${paginaAlvo} min_faves:1`],
        maxItems: 50,
      });

      // Estratégia 2: Buscar usuários que comentaram nos tweets da página
      const recentTweets = await this.apifyService.searchTweets({
        searchTerms: [`from:${paginaAlvo}`],
        maxItems: 10,
      });

      const commenters: Record<string, TwitterUserScraperResult> = {};

      for (const tweet of recentTweets) {
        if (tweet.id) {
          try {
            const comments = await this.apifyService.searchTweets({
              searchTerms: [`conversation_id:${tweet.id}`],
              maxItems: 20,
            });

            for (const comment of comments) {
              if (
                comment.author?.userName &&
                comment.author.userName !== paginaAlvo
              ) {
                commenters[comment.author.userName] = {
                  userName: comment.author.userName,
                  name: comment.author.name || "",
                  id: comment.author.id || "",
                  followers: comment.author.followers || 0,
                  following: comment.author.following || 0,
                  verified: comment.author.isVerified || false,
                  profilePicture: comment.author.profilePicture || "",
                  description: comment.author.description || "",
                };
              }
            }
          } catch (commentError) {
            console.log(
              `⚠️ Erro ao buscar comentários do tweet ${tweet.id}:`,
              commentError
            );
          }
        }
      }

      const alternativeFollowers = Object.values(commenters);

      console.log(
        `✅ Obtidos ${alternativeFollowers.length} seguidores alternativos via interações`
      );

      return alternativeFollowers;
    } catch (error) {
      console.error(`❌ Erro ao obter seguidores alternativos:`, error);
      return [];
    }
  }

  /**
   * Verificar seguidor nos exemplos (development)
   */
  private verificarSeguidorNosExemplos(
    usuario: string,
    paginaAlvo: string,
    seguidoresData: TwitterUserScraperResult[]
  ): boolean {
    const seguindo = seguidoresData.some(
      (seguidor) =>
        seguidor.userName?.toLowerCase() ===
        usuario.replace("@", "").toLowerCase()
    );

    console.log(
      `${seguindo ? "✅" : "❌"} ${usuario} ${
        seguindo ? "SEGUE" : "NÃO SEGUE"
      } @${paginaAlvo} (exemplo)`
    );

    return seguindo;
  }

  /**
   * Verificar comentário nos exemplos (development)
   */
  private verificarComentarioNosExemplos(
    usuario: string,
    comentariosData: TweetData[]
  ): boolean {
    const comentou = comentariosData.some(
      (tweet) =>
        tweet.author?.userName?.toLowerCase() ===
        usuario.replace("@", "").toLowerCase()
    );

    console.log(
      `${comentou ? "✅" : "❌"} ${usuario} ${
        comentou ? "COMENTOU" : "NÃO COMENTOU"
      } (exemplo)`
    );

    return comentou;
  }

  /**
   * Calcular score de engajamento (0-100%)
   */
  private calcularScore(interacoes: UserInteraction): number {
    const acoes = [interacoes.seguindo, interacoes.comentou];
    const positivas = acoes.filter(Boolean).length;
    return Math.round((positivas / 2) * 100);
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
  private async salvarExemplo(
    filename: string,
    data: TwitterUserScraperResult[] | TweetData[]
  ): Promise<void> {
    const filepath = path.join(this.examplesDir, filename);
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    console.log(`💾 Exemplo salvo: ${filename}`);
  }

  /**
   * Carregar exemplo de arquivo JSON
   */
  private async carregarExemplo(
    filename: string
  ): Promise<TwitterUserScraperResult[] | TweetData[]> {
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
  private async salvarNoCache(
    key: string,
    data: TwitterUserScraperResult[]
  ): Promise<void> {
    await fs.mkdir(this.cacheDir, { recursive: true });

    const cacheEntry: CacheEntry = {
      data,
      timestamp: new Date().toISOString(),
      lastCheck: new Date().toISOString(),
    };

    const filepath = path.join(this.cacheDir, `${key}.json`);
    await fs.writeFile(filepath, JSON.stringify(cacheEntry, null, 2));

    console.log(`📦 Cache salvo: ${key} (${data.length} itens)`);
  }

  /**
   * Ler dados do cache temporal
   */
  private async lerCache(key: string): Promise<CacheEntry | null> {
    const filepath = path.join(this.cacheDir, `${key}.json`);

    try {
      const data = await fs.readFile(filepath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      return null; // Cache não existe
    }
  }

  /**
   * Verificar se cache ainda é válido
   */
  private isCacheValid(cache: CacheEntry, maxAgeHours: number): boolean {
    const now = new Date();
    const cacheTime = new Date(cache.timestamp);
    const ageHours = (now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60);

    return ageHours < maxAgeHours;
  }
}
