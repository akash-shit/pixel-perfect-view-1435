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
import { errorMiddleware, notFoundMiddleware } from "./middleware/errorMiddleware.js";

const app = express();
const allowedOrigins = new Set(
  (process.env.CLIENT_URL || "http://localhost:5174").split(",").map((origin) => origin.trim()).filter(Boolean),
);

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    const error = new Error("This website is not allowed to connect.");
    error.status = 403;
    callback(error);
  },
  credentials: true,
}));
app.use(express.json({ limit: "20kb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "Backend is running" });
});
app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/phone", phoneCheckRoutes);
app.use("/api/scam", scamRoutes);
app.use("/api/screenshot", screenshotRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;