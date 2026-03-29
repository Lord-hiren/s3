import fs from "fs";
import path from "path";
import crypto from "crypto";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { config } from "../../config.js";

fs.mkdirSync(path.dirname(config.storage.dbFile), { recursive: true });

const db = await open({
  filename: config.storage.dbFile,
  driver: sqlite3.Database,
});

await db.exec(`
  PRAGMA foreign_keys = ON;
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

const ensureDefaultAdmin = async () => {
  const existingAdmin = await db.get(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [normalizeEmail(config.auth.adminEmail)],
  );

  if (existingAdmin) {
    return;
  }

  const timestamp = nowIso();
  await db.run(
    `
      INSERT INTO users (name, email, password_hash, role, api_key, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 'admin', ?, 1, ?, ?)
    `,
    [
      config.auth.adminName,
      normalizeEmail(config.auth.adminEmail),
      hashPassword(config.auth.adminPassword),
      randomToken(24),
      timestamp,
      timestamp,
    ],
  );
};

await ensureDefaultAdmin();

export const mapUser = (row) =>
  row
    ? {
        id: Number(row.id),
        name: row.name,
        email: row.email,
        role: row.role,
        api_key: row.api_key,
        is_active: Boolean(row.is_active),
        created_at: row.created_at,
        updated_at: row.updated_at,
      }
    : null;

export const createUser = async ({ name, email, password, role = "user" }) => {
  const timestamp = nowIso();
  const apiKey = randomToken(24);

  const result = await db.run(
    `
      INSERT INTO users (name, email, password_hash, role, api_key, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `,
    [
      name.trim(),
      normalizeEmail(email),
      hashPassword(password),
      role,
      apiKey,
      timestamp,
      timestamp,
    ],
  );

  return getUserById(Number(result.lastID));
};

export const listUsers = async () =>
  (await db.all(
    `
      SELECT id, name, email, role, api_key, is_active, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `,
  )).map(mapUser);

export const getUserById = async (id) =>
  mapUser(
    await db.get(
      `
        SELECT id, name, email, role, api_key, is_active, created_at, updated_at
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [id],
    ),
  );

export const getUserWithPasswordByEmail = (email) =>
  db.get(
    `
      SELECT id, name, email, password_hash, role, api_key, is_active, created_at, updated_at
      FROM users
      WHERE email = ?
      LIMIT 1
    `,
    [normalizeEmail(email)],
  );

export const getUserByApiKey = async (apiKey) =>
  mapUser(
    await db.get(
      `
        SELECT id, name, email, role, api_key, is_active, created_at, updated_at
        FROM users
        WHERE api_key = ?
        LIMIT 1
      `,
      [apiKey],
    ),
  );

export const updateUserPassword = async (userId, password) => {
  await db.run(
    `
      UPDATE users
      SET password_hash = ?, updated_at = ?
      WHERE id = ?
    `,
    [hashPassword(password), nowIso(), userId],
  );

  return getUserById(userId);
};

export const createSession = async ({ userId, userAgent = "" }) => {
  const token = randomToken(32);
  const timestamp = nowIso();
  const expiresAt = new Date(
    Date.now() + config.auth.sessionDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  await db.run(
    `
      INSERT INTO sessions (user_id, token_hash, user_agent, created_at, last_seen_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [userId, sha256(token), userAgent, timestamp, timestamp, expiresAt],
  );

  return {
    token,
    expiresAt,
  };
};

export const deleteSession = (token) =>
  db.run("DELETE FROM sessions WHERE token_hash = ?", [sha256(token)]);

export const getSessionUser = async (token) => {
  if (!token) return null;

  const row = await db.get(
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
    [sha256(token)],
  );

  if (!row) return null;
  if (new Date(row.expires_at) <= new Date()) {
    await db.run("DELETE FROM sessions WHERE id = ?", [row.session_id]);
    return null;
  }

  await db.run(
    `
      UPDATE sessions
      SET last_seen_at = ?
      WHERE id = ?
    `,
    [nowIso(), row.session_id],
  );

  return mapUser(row);
};

export const validateUserPassword = async (email, password) => {
  const user = await getUserWithPasswordByEmail(email);
  if (!user || !user.is_active) {
    return null;
  }

  if (!verifyPassword(password, user.password_hash)) {
    return null;
  }

  return mapUser(user);
};

export const createAsset = async ({
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

  await db.run(
    `
      INSERT INTO assets (
        id, original_name, stored_name, mime_type, type_group, size,
        relative_path, uploaded_by, uploaded_by_email, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
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
    ],
  );

  return getAssetById(id);
};

export const updateAsset = async ({ id, originalName }) => {
  await db.run(
    `
      UPDATE assets
      SET original_name = ?
      WHERE id = ?
    `,
    [originalName, id],
  );

  return getAssetById(id);
};

export const deleteAsset = (id) =>
  db.run("DELETE FROM assets WHERE id = ?", [id]);

export const getAssetById = (id) =>
  db.get(
    `
      SELECT *
      FROM assets
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  );

export const listAssets = () =>
  db.all(
    `
      SELECT *
      FROM assets
      ORDER BY created_at DESC
    `,
  );
