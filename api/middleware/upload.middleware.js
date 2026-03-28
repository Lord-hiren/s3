import fs from "fs";
import multer from "multer";
import { config } from "../../config.js";
import { isAllowedMimeType } from "../services/asset_store.service.js";

const tempDir = config.storage.tempDir;
fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tempDir),
  filename: (_req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    cb(null, safeName);
  },
});

const fileFilter = (_req, file, cb) => {
  if (!isAllowedMimeType(file.mimetype)) {
    cb(new Error("Only images, svg, pdf, and video files are allowed."));
    return;
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 10,
  },
});
