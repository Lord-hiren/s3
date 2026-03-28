import express from "express";
import {
  getAssetMeta,
  getAssets,
  uploadAssets,
} from "../controller/asset.controller.js";
import { apiKeyOrSessionAuth } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/upload", apiKeyOrSessionAuth, upload.array("files", 10), uploadAssets);

router.get("/", getAssets);
router.get("/:id", getAssetMeta);

export default router;
