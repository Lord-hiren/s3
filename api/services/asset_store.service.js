import fs from "fs";
import path from "path";
import crypto from "crypto";
import { config } from "../../config.js";
import {
  createAsset,
  deleteAsset as deleteAssetRowById,
  getAssetById as getAssetRowById,
  listAssets as listAssetRows,
  updateAsset as updateAssetRowById,
} from "./database.service.js";

const ensureDirectory = (targetPath) => {
  fs.mkdirSync(targetPath, { recursive: true });
};

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
]);

const allowedInstallerExtensions = new Set([
  ".apk",
  ".aab",
  ".exe",
  ".msi",
  ".appimage",
  ".deb",
  ".dmg",
  ".pkg",
  ".ipa",
  ".zip",
]);

const allowedInstallerMimeTypes = new Set([
  "application/octet-stream",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.android.package-archive",
  "application/vnd.debian.binary-package",
  "application/x-debian-package",
  "application/x-msdownload",
  "application/x-msi",
  "application/x-apple-diskimage",
  "application/vnd.microsoft.portable-executable",
]);

export const isAllowedMimeType = (mimeType) => allowedMimeTypes.has(mimeType);

export const isAllowedUploadFile = (file = {}) => {
  if (isAllowedMimeType(file.mimetype)) return true;

  const extension = path.extname(file.originalname || "").toLowerCase();
  return (
    allowedInstallerExtensions.has(extension) &&
    (!file.mimetype || allowedInstallerMimeTypes.has(file.mimetype))
  );
};

const slugifyFileName = (name) =>
  (name || "file")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const buildAssetUrl = (assetOrId, originalName) => {
  const id = typeof assetOrId === "object" ? assetOrId.id : assetOrId;
  const fileName =
    typeof assetOrId === "object"
      ? assetOrId.original_name
      : originalName || "file";

  return `${config.storage.publicBaseUrl.replace(/\/$/, "")}/storage/data/${id}/${slugifyFileName(fileName)}`;
};

const mapAsset = (asset) =>
  asset
    ? {
        ...asset,
        url: buildAssetUrl(asset),
        absolute_path: path.join(config.storage.rootDir, asset.relative_path),
      }
    : null;

export const createAssetRecord = async ({ file, uploadedBy }) => {
  const id = crypto.randomUUID();
  const ext = path.extname(file.originalname || "");
  const storedFileName = `${id}${ext}`;

  ensureDirectory(config.storage.rootDir);

  const finalPath = path.join(config.storage.rootDir, storedFileName);
  fs.renameSync(file.path, finalPath);

  return mapAsset(
    await createAsset({
      id,
      originalName: file.originalname,
      storedName: storedFileName,
      mimeType: file.mimetype,
      size: file.size,
      relativePath: storedFileName,
      uploadedBy: uploadedBy?.id || null,
      uploadedByEmail: uploadedBy?.email || null,
    }),
  );
};

export const getAssetById = async (id) => mapAsset(await getAssetRowById(id));

export const listAssets = async () => (await listAssetRows()).map(mapAsset);

export const updateAssetRecord = async ({ id, originalName }) => {
  const nextName = String(originalName || "").trim();
  if (!nextName) {
    throw new Error("Original name is required.");
  }

  return mapAsset(
    await updateAssetRowById({
      id,
      originalName: nextName,
    }),
  );
};

export const deleteAssetRecord = async (id) => {
  const asset = await getAssetById(id);
  if (!asset) {
    return null;
  }

  if (asset.absolute_path && fs.existsSync(asset.absolute_path)) {
    fs.unlinkSync(asset.absolute_path);
  }

  await deleteAssetRowById(id);
  return asset;
};
