import fs from "fs";
import path from "path";
import crypto from "crypto";
import { config } from "../../config.js";
import {
  createAsset,
  getAssetById as getAssetRowById,
  listAssets as listAssetRows,
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

export const isAllowedMimeType = (mimeType) => allowedMimeTypes.has(mimeType);

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

export const createAssetRecord = ({ file, uploadedBy }) => {
  const id = crypto.randomUUID();
  const ext = path.extname(file.originalname || "");
  const storedFileName = `${id}${ext}`;

  ensureDirectory(config.storage.rootDir);

  const finalPath = path.join(config.storage.rootDir, storedFileName);
  fs.renameSync(file.path, finalPath);

  return mapAsset(
    createAsset({
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

export const getAssetById = (id) => mapAsset(getAssetRowById(id));

export const listAssets = () => listAssetRows().map(mapAsset);
