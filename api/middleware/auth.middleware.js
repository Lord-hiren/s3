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

export const sessionOptional = (req, _res, next) => {
  const cookies = parseCookies(req.headers.cookie || "");
  const sessionToken = cookies[config.auth.sessionCookieName];

  if (!sessionToken) {
    req.sessionUser = null;
    return next();
  }

  const user = getSessionUser(sessionToken);
  if (!user) {
    deleteSession(sessionToken);
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
  sessionOptional(req, res, () => {
    if (req.sessionUser) {
      req.authUser = req.sessionUser;
      return next();
    }

    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Access denied. Session or bearer API key is required.",
      });
    }

    const apiKey = authHeader.slice(7).trim();
    const user = getUserByApiKey(apiKey);

    if (!user || !user.is_active) {
      return res.status(401).json({
        message: "Invalid API key.",
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
