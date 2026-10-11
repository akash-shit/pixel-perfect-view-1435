import "./config/loadEnv.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import authRoutes from "./routes/authRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import phoneCheckRoutes from "./routes/phoneCheck.js";
import scamRoutes from "./routes/scamRoutes.js";
import screenshotRoutes from "./routes/screenshotRoutes.js";
import assistantRoutes from "./routes/assistantRoutes.js";
import { errorMiddleware, notFoundMiddleware } from "./middleware/errorMiddleware.js";
import { getSpeechTranscriptionStatus } from "./services/speechTranscriptionService.js";

const app = express();
const allowedOrigins = new Set(
  (process.env.CLIENT_URL || "http://localhost:5174").split(",").map((origin) => origin.trim()).filter(Boolean),
);

function isDevelopmentLoopbackAlias(origin) {
  if (process.env.NODE_ENV === "production") return false;
  let requestOrigin;
  try {
    requestOrigin = new URL(origin);
  } catch {
    return false;
  }
  if (
    requestOrigin.protocol !== "http:" ||
    !["localhost", "127.0.0.1"].includes(requestOrigin.hostname)
  ) {
    return false;
  }
  return [...allowedOrigins].some((allowedOrigin) => {
    try {
      const configuredOrigin = new URL(allowedOrigin);
      return (
        configuredOrigin.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(configuredOrigin.hostname) &&
        configuredOrigin.port === requestOrigin.port
      );
    } catch {
      return false;
    }
  });
}

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin) || isDevelopmentLoopbackAlias(origin)) return callback(null, true);
    const error = new Error("This website is not allowed to connect.");
    error.status = 403;
    callback(error);
  },
  credentials: true,
}));
app.use(express.json({ limit: "20kb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Backend is running",
    speechToText: getSpeechTranscriptionStatus(),
  });
});
app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/phone", phoneCheckRoutes);
app.use("/api/scam", scamRoutes);
app.use("/api/screenshot", screenshotRoutes);
app.use("/api/assistant", assistantRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
