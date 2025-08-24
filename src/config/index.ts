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
