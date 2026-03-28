import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parseOrigins = (value) =>
  (value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const normalizeOrigin = (origin) => String(origin || "").trim().replace(/\/$/, "");

const getOriginFromUrl = (value) => {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
};

const resolveAppPath = (targetPath, fallbackPath) => {
  const selectedPath = targetPath || fallbackPath;
  if (path.isAbsolute(selectedPath)) {
    return selectedPath;
  }
  return path.resolve(__dirname, selectedPath);
};

const publicBaseUrl = process.env.PUBLIC_BASE_URL || "http://localhost:4100";
const configuredOrigins = parseOrigins(
  process.env.ALLOWED_ORIGINS ||
    "http://localhost:4000,http://localhost:4100,http://localhost:5173",
);
const appOrigin = getOriginFromUrl(publicBaseUrl);
const allowedOrigins = Array.from(
  new Set(
    [...configuredOrigins, appOrigin]
      .map(normalizeOrigin)
      .filter(Boolean),
  ),
);

export const config = {
  app: {
    port: parseInt(process.env.PORT || "4100", 10),
    nodeEnv: process.env.NODE_ENV || "development",
    allowedOrigins,
    publicDir: resolveAppPath(process.env.PUBLIC_DIR, "./public"),
  },
  auth: {
    sessionCookieName: process.env.SESSION_COOKIE_NAME || "s3_session",
    sessionDays: parseInt(process.env.SESSION_DAYS || "7", 10),
    adminEmail: process.env.ADMIN_EMAIL || "admin@example.com",
    adminPassword: process.env.ADMIN_PASSWORD || "123456",
    adminName: process.env.ADMIN_NAME || "Admin",
  },
  storage: {
    rootDir: resolveAppPath(process.env.STORAGE_ROOT_DIR, "./storage/files"),
    tempDir: resolveAppPath(process.env.STORAGE_TEMP_DIR, "./storage/temp"),
    legacyMetaFile: resolveAppPath(
      process.env.STORAGE_META_FILE,
      "./storage/data/assets.json",
    ),
    dbFile: resolveAppPath(process.env.SQLITE_DB_FILE, "./storage/data/app.sqlite"),
    publicBaseUrl,
  },
};
