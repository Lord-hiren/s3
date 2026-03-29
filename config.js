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

const normalizeOrigin = (origin) =>
  String(origin || "")
    .trim()
    .replace(/\/$/, "");

const getOriginFromUrl = (value) => {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
};

const resolveAppPath = (targetPath, fallbackPath) => {
  const selectedPath = targetPath || fallbackPath;
  if (!selectedPath) {
    return __dirname;
  }
  if (path.isAbsolute(selectedPath)) {
    return selectedPath;
  }
  return path.resolve(__dirname, selectedPath);
};

const publicBaseUrl = process.env.PUBLIC_BASE_URL;
const configuredOrigins = parseOrigins(process.env.ALLOWED_ORIGINS);
const appOrigin = getOriginFromUrl(publicBaseUrl);
const allowedOrigins = Array.from(
  new Set(
    [...configuredOrigins, appOrigin].map(normalizeOrigin).filter(Boolean),
  ),
);

export const config = {
  app: {
    port: parseInt(process.env.PORT, 10),
    nodeEnv: process.env.NODE_ENV,
    allowedOrigins,
    publicDir: resolveAppPath(process.env.PUBLIC_DIR, "./public"),
  },
  auth: {
    sessionCookieName: process.env.SESSION_COOKIE_NAME,
    sessionDays: parseInt(process.env.SESSION_DAYS, 10),
    adminEmail: process.env.ADMIN_EMAIL,
    adminPassword: process.env.ADMIN_PASSWORD,
    adminName: process.env.ADMIN_NAME,
    secretKey: process.env.SECRET_KEY || process.env.API_SECRET_KEY,
  },
  storage: {
    rootDir: resolveAppPath(process.env.STORAGE_ROOT_DIR, "./storage/files"),
    tempDir: resolveAppPath(process.env.STORAGE_TEMP_DIR, "./storage/temp"),
    dbFile: resolveAppPath(
      process.env.SQLITE_DB_FILE,
      "./storage/data/app.sqlite",
    ),
    publicBaseUrl,
  },
};
