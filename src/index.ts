import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cron from "node-cron";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";

import routes from "./Routes";
import swaggerSpec from "./swagger";
import requestLogger from "./middlewares/requestLogger";
import {
  deleteExpiredZaps,
  deleteOverLimitZaps,
} from "./utils/cleanup";

// ✅ Load environment variables
dotenv.config();

const app = express();

// ✅ Trust proxy (important for rate limit & deployment)
app.set("trust proxy", 1);

// ✅ Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ✅ Logger (must be before routes)
app.use(requestLogger);

// ✅ Security headers
app.use(helmet());

// ✅ CORS configuration
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || "http://localhost:5173")
      .split(",")
      .map((origin) => origin.trim()),
    credentials: true,
  })
);

// ✅ Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "development" ? 1000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(apiLimiter);

// ✅ API Routes
app.use("/api", routes);

// ✅ Basic Routes
app.get("/", (_req: Request, res: Response): void => {
  res.status(200).send("ZapLink API Root");
});

app.get("/health", (_req: Request, res: Response): void => {
  res.status(200).json({ status: "OK" });
});

// Prevent favicon error
app.get("/favicon.ico", (_req: Request, res: Response): void => {
  res.status(204).end();
});

// ✅ Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ✅ Cron Job (Runs every hour)
cron.schedule("0 * * * *", async () => {
  console.log("[Cron] Running scheduled Zap cleanup...");
  try {
    await deleteExpiredZaps();
    await deleteOverLimitZaps();
    console.log("[Cron] Cleanup complete.");
  } catch (error) {
    console.error("[Cron] Cleanup failed:", error);
  }
});

// ✅ Start Server
const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});