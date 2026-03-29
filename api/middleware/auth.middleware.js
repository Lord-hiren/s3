import { config } from "../../config.js";
import {
  deleteSession,
  getSessionUser,
  getUserByApiKey,
} from "../services/database.service.js";

const parseCookies = (cookieHeader = "") =>
  cookieHeader.split(";").reduce((acc, cookiePart) => {
    const [key, ...valueParts] = cookiePart.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(valueParts.join("=") || "");
    return acc;
  }, {});

const getBearerToken = (authHeader = "") => {
  if (!authHeader.startsWith("Bearer ")) {
    return "";
  }

  return authHeader.slice(7).trim();
};

const buildSecretAuthUser = () => ({
  id: null,
  name: "Secret Key",
  email: "secret@s3.local",
  role: "admin",
  api_key: null,
  is_active: true,
  created_at: null,
  updated_at: null,
  is_secret_key: true,
});

const resolveBearerAuthUser = async (authHeader = "") => {
  const token = getBearerToken(authHeader);
  if (!token) {
    return null;
  }

  if (token === config.auth.secretKey) {
    return buildSecretAuthUser();
  }

  const user = await getUserByApiKey(token);
  if (!user || !user.is_active) {
    return null;
  }

  return user;
};

export const sessionOptional = async (req, _res, next) => {
  const cookies = parseCookies(req.headers.cookie || "");
  const sessionToken = cookies[config.auth.sessionCookieName];

  if (!sessionToken) {
    req.sessionUser = null;
    return next();
  }

  const user = await getSessionUser(sessionToken);
  if (!user) {
    await deleteSession(sessionToken);
    req.sessionUser = null;
    return next();
  }

  req.sessionToken = sessionToken;
  req.sessionUser = user;
  next();
};

export const sessionRequired = (req, res, next) => {
  sessionOptional(req, res, () => {
    if (!req.sessionUser) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    next();
  });
};

export const adminSessionRequired = (req, res, next) => {
  sessionOptional(req, res, () => {
    if (!req.sessionUser) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    if (req.sessionUser.role !== "admin") {
      return res.status(403).json({ message: "Admin access is required." });
    }

    next();
  });
};

export const apiKeyOrSessionAuth = (req, res, next) => {
  sessionOptional(req, res, async () => {
    if (req.sessionUser) {
      req.authUser = req.sessionUser;
      return next();
    }

    const user = await resolveBearerAuthUser(req.headers.authorization || "");
    if (!user) {
      return res.status(401).json({
        message: "Access denied. Session or bearer secret/API key is required.",
      });
    }

    req.authUser = user;
    next();
  });
};

export const adminApiOrSessionRequired = (req, res, next) => {
  apiKeyOrSessionAuth(req, res, () => {
    if (req.authUser?.role !== "admin") {
      return res.status(403).json({ message: "Admin access is required." });
    }

    next();
  });
};
