import "dotenv/config";
import express from "express";
import { config } from "./config";
import trackingRoutes from "./routes/tracking";
import interactionRoutes from "./routes/interactions";

const app = express();

// Basic middleware
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Routes (no authentication needed)
app.use("/api/track", trackingRoutes);
app.use("/api/interactions", interactionRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
