import express from "express";
import { InteractionService } from "../services/InteractionService";
import { config } from "../config";

const router = express.Router();
const interactionService = new InteractionService();

/**
 * POST /api/interactions/verify
 * Verificar interações de usuário específico com filtros temporais opcionais
 */
router.post("/verify", async (req, res) => {
  try {
    const { usuario, tweetUrl, paginaAlvo, timeFilter } = req.body;

    // Validação dos parâmetros
    if (!usuario || !tweetUrl || !paginaAlvo) {
      return res.status(400).json({
        success: false,
        error: "Parâmetros obrigatórios: usuario, tweetUrl, paginaAlvo",
      });
    }

    console.log(`🔍 Verificando interações:`, {
      usuario,
      tweetUrl,
      paginaAlvo,
      timeFilter,
    });

    const resultado = await interactionService.verificarInteracoes(
      usuario,
      tweetUrl,
      paginaAlvo,
      timeFilter
    );

    return res.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    console.error("❌ Erro ao verificar interações:", error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Erro interno do servidor",
    });
  }
});

/**
 * POST /api/interactions/generate-examples
 * Gerar exemplos reais dos scrapers (para desenvolvimento)
 */
router.post("/generate-examples", async (req, res) => {
  try {
    console.log("🔄 Iniciando geração de exemplos reais...");

    await interactionService.gerarExemplosReais();

    return res.json({
      success: true,
      message: "Exemplos reais gerados com sucesso!",
      data: {
        timestamp: new Date().toISOString(),
        mode: "development",
        examples: ["followers_of_target_page.json", "comments_example.json"],
      },
    });
  } catch (error) {
    console.error("❌ Erro ao gerar exemplos:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Erro ao gerar exemplos",
    });
  }
});

/**
 * GET /api/interactions/test
 * Endpoint de teste com parâmetros pré-definidos
 */
router.get("/test", async (req, res) => {
  try {
    const testParams = {
      usuario: "blairjdaniel",
      tweetUrl: "https://x.com/RoguesNFT/status/1960014365333299601",
      paginaAlvo: "RoguesNFT",
    };

    console.log(
      "🧪 Executando teste com parâmetros pré-definidos:",
      testParams
    );

    const resultado = await interactionService.verificarInteracoes(
      testParams.usuario,
      testParams.tweetUrl,
      testParams.paginaAlvo
    );

    return res.json({
      success: true,
      data: resultado,
      testParams,
    });
  } catch (error) {
    console.error("❌ Erro no teste:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Erro no teste",
    });
  }
});

/**
 * GET /api/interactions/status
 * Verificar status do serviço
 */
router.get("/status", (req, res) => {
  const isDevelopment = config.app.env === "development";

  return res.json({
    success: true,
    data: {
      service: "InteractionService",
      mode: isDevelopment ? "development" : "production",
      timestamp: new Date().toISOString(),
      capabilities: {
        seguindo: true,
        comentou: true,
        curtiu: false, // Limitação técnica
      },
      examplesRequired: isDevelopment,
      message: isDevelopment
        ? "Em modo development - usando exemplos salvos"
        : "Em modo production - fazendo chamadas reais",
    },
  });
});

export default router;
