import fs from "fs";
import path from "path";
import crypto from "crypto";
import { DatabaseSync } from "node:sqlite";
import { config } from "../../config.js";

fs.mkdirSync(path.dirname(config.storage.dbFile), { recursive: true });
const db = new DatabaseSync(config.storage.dbFile);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    api_key TEXT NOT NULL UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    user_agent TEXT,
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    type_group TEXT NOT NULL,
    size INTEGER NOT NULL,
    relative_path TEXT NOT NULL,
    uploaded_by INTEGER,
    uploaded_by_email TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
  );
`);

const normalizeEmail = (email) => email.trim().toLowerCase();

const nowIso = () => new Date().toISOString();

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const randomToken = (size = 32) => crypto.randomBytes(size).toString("hex");

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, originalHash] = storedHash.split(":");
  const nextHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(
    Buffer.from(originalHash, "hex"),
    Buffer.from(nextHash, "hex"),
  );
};

const buildTypeGroup = (mimeType) => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "pdf";
  return "document";
};

const ensureDefaultAdmin = () => {
  const existingAdmin = db
    .prepare("SELECT id FROM users WHERE email = ? LIMIT 1")
    .get(config.auth.adminEmail);

  if (existingAdmin) {
    return;
  }

  const timestamp = nowIso();
  db.prepare(
    `
      INSERT INTO users (name, email, password_hash, role, api_key, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 'admin', ?, 1, ?, ?)
    `,
  ).run(
    config.auth.adminName,
    normalizeEmail(config.auth.adminEmail),
    hashPassword(config.auth.adminPassword),
    randomToken(24),
    timestamp,
    timestamp,
  );
};

const migrateLegacyAssets = () => {
  if (!fs.existsSync(config.storage.legacyMetaFile)) {
    return;
  }

  const countRow = db.prepare("SELECT COUNT(*) as count FROM assets").get();
  if (countRow?.count) {
    return;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(config.storage.legacyMetaFile, "utf8"));
    const assets = Array.isArray(raw?.assets) ? raw.assets : [];

    const insert = db.prepare(
      `
        INSERT OR IGNORE INTO assets (
          id, original_name, stored_name, mime_type, type_group, size,
          relative_path, uploaded_by, uploaded_by_email, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
      `,
    );

    for (const asset of assets) {
      insert.run(
        asset.id,
        asset.original_name,
        asset.stored_name,
        asset.mime_type,
        buildTypeGroup(asset.mime_type),
        asset.size || 0,
        asset.relative_path,
        asset.uploaded_by || null,
        asset.created_at || nowIso(),
      );
    }
  } catch (error) {
    console.error("Legacy asset migration failed:", error);
  }
};

ensureDefaultAdmin();
migrateLegacyAssets();

export const mapUser = (row) =>
  row
    ? {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        api_key: row.api_key,
        is_active: Boolean(row.is_active),
        created_at: row.created_at,
        updated_at: row.updated_at,
      }
    : null;

export const createUser = ({ name, email, password, role = "user" }) => {
  const timestamp = nowIso();
  const apiKey = randomToken(24);
  const result = db
    .prepare(
      `
        INSERT INTO users (name, email, password_hash, role, api_key, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
      `,
    )
    .run(
      name.trim(),
      normalizeEmail(email),
      hashPassword(password),
      role,
      apiKey,
      timestamp,
      timestamp,
    );

  return getUserById(result.lastInsertRowid);
};

export const listUsers = () =>
  db
    .prepare(
      `
        SELECT id, name, email, role, api_key, is_active, created_at, updated_at
        FROM users
        ORDER BY created_at DESC
      `,
    )
    .all()
    .map(mapUser);

export const getUserById = (id) =>
  mapUser(
    db.prepare(
      `
        SELECT id, name, email, role, api_key, is_active, created_at, updated_at
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
    ).get(id),
  );

export const getUserWithPasswordByEmail = (email) =>
  db
    .prepare(
      `
        SELECT id, name, email, password_hash, role, api_key, is_active, created_at, updated_at
        FROM users
        WHERE email = ?
        LIMIT 1
      `,
    )
    .get(normalizeEmail(email));

export const getUserByApiKey = (apiKey) =>
  mapUser(
    db.prepare(
      `
        SELECT id, name, email, role, api_key, is_active, created_at, updated_at
        FROM users
        WHERE api_key = ?
        LIMIT 1
      `,
    ).get(apiKey),
  );

export const updateUserPassword = (userId, password) => {
  db.prepare(
    `
      UPDATE users
      SET password_hash = ?, updated_at = ?
      WHERE id = ?
    `,
  ).run(hashPassword(password), nowIso(), userId);

  return getUserById(userId);
};

export const createSession = ({ userId, userAgent = "" }) => {
  const token = randomToken(32);
  const timestamp = nowIso();
  const expiresAt = new Date(
    Date.now() + config.auth.sessionDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  db.prepare(
    `
      INSERT INTO sessions (user_id, token_hash, user_agent, created_at, last_seen_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
  ).run(userId, sha256(token), userAgent, timestamp, timestamp, expiresAt);

  return {
    token,
    expiresAt,
  };
};

export const deleteSession = (token) => {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
};

export const getSessionUser = (token) => {
  if (!token) return null;

  const row = db
    .prepare(
      `
        SELECT
          sessions.id as session_id,
          sessions.expires_at,
          users.id,
          users.name,
          users.email,
          users.role,
          users.api_key,
          users.is_active,
          users.created_at,
          users.updated_at
        FROM sessions
        INNER JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = ?
        LIMIT 1
      `,
    )
    .get(sha256(token));

  if (!row) return null;
  if (new Date(row.expires_at) <= new Date()) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(row.session_id);
    return null;
  }

  db.prepare(
    `
      UPDATE sessions
      SET last_seen_at = ?
      WHERE id = ?
    `,
  ).run(nowIso(), row.session_id);

  return mapUser(row);
};

export const validateUserPassword = (email, password) => {
  const user = getUserWithPasswordByEmail(email);
  if (!user || !user.is_active) {
    return null;
  }

  if (!verifyPassword(password, user.password_hash)) {
    return null;
  }

  return mapUser(user);
};

export const createAsset = ({
  id,
  originalName,
  storedName,
  mimeType,
  size,
  relativePath,
  uploadedBy,
  uploadedByEmail,
}) => {
  const timestamp = nowIso();

  db.prepare(
    `
      INSERT INTO assets (
        id, original_name, stored_name, mime_type, type_group, size,
        relative_path, uploaded_by, uploaded_by_email, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    id,
    originalName,
    storedName,
    mimeType,
    buildTypeGroup(mimeType),
    size,
    relativePath,
    uploadedBy || null,
    uploadedByEmail || null,
    timestamp,
  );

  return getAssetById(id);
};

export const getAssetById = (id) =>
  db
    .prepare(
      `
        SELECT *
        FROM assets
        WHERE id = ?
        LIMIT 1
      `,
    )
    .get(id);

export const listAssets = () =>
  db
    .prepare(
      `
        SELECT *
        FROM assets
        ORDER BY created_at DESC
      `,
    )
    .all();
