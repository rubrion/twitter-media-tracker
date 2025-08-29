export const config = {
  app: {
    port: Number(process.env.PORT) || 3000,
    env: process.env.NODE_ENV || "development",
  },
  apify: {
    token: process.env.APIFY_TOKEN,
    actorId: "61RPP7dywgiy0JPD0", // Updated to v2 actor ID
  },
};

// Debug log para verificar configurações
console.log("🔧 Configurações carregadas:", {
  env: config.app.env,
  port: config.app.port,
  hasApifyToken: !!config.apify.token,
  tokenStart: config.apify.token?.substring(0, 10) + "...",
});
