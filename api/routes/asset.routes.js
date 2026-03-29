import express from "express";
import {
  deleteAsset,
  getAssetMeta,
  getAssets,
  updateAsset,
  uploadAssets,
} from "../controller/asset.controller.js";
import {
  adminApiOrSessionRequired,
  apiKeyOrSessionAuth,
} from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/upload", apiKeyOrSessionAuth, upload.array("files", 10), uploadAssets);

router.get("/", apiKeyOrSessionAuth, getAssets);
router.get("/:id", apiKeyOrSessionAuth, getAssetMeta);
router.patch("/:id", adminApiOrSessionRequired, updateAsset);
router.delete("/:id", adminApiOrSessionRequired, deleteAsset);

export default router;
