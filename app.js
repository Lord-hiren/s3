import express from "express";
import cors from "cors";
import path from "path";
import { config } from "./config.js";
import assetRoutes from "./api/routes/asset.routes.js";
import authRoutes from "./api/routes/auth.routes.js";
import userRoutes from "./api/routes/user.routes.js";
import { serveAssetFile } from "./api/controller/asset.controller.js";
import { sessionOptional } from "./api/middleware/auth.middleware.js";

const app = express();
const normalizeOrigin = (origin) =>
  String(origin || "")
    .trim()
    .replace(/\/$/, "");

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (config.app.allowedOrigins.includes(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(sessionOptional);
app.use("/static", express.static(config.app.publicDir));

app.get("/", (req, res) => {
  res.redirect(req.sessionUser ? "/dashboard" : "/login");
});

app.get("/login", (req, res) => {
  if (req.sessionUser) {
    return res.redirect("/dashboard");
  }

  return res.sendFile(path.join(config.app.publicDir, "login.html"));
});

app.get("/dashboard", (req, res) => {
  if (!req.sessionUser) {
    return res.redirect("/login");
  }

  return res.sendFile(path.join(config.app.publicDir, "dashboard.html"));
});

app.get("/health", (_req, res) => {
  res.json({ message: "ok" });
});

app.get("/storage/data/:id/:fileName", serveAssetFile);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/assets", assetRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    message: error.message || "Internal server error.",
  });
});

export default app;
