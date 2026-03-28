import fs from "fs";
import {
  createAssetRecord,
  getAssetById,
  listAssets,
} from "../services/asset_store.service.js";

export const uploadAssets = async (req, res) => {
  try {
    const files = req.files || [];

    if (!files.length) {
      return res.status(400).json({ message: "At least one file is required." });
    }

    const assets = files.map((file) =>
      createAssetRecord({
        file,
        uploadedBy: req.authUser || null,
      }),
    );

    return res.status(201).json({
      message: "Assets uploaded successfully.",
      data: assets,
    });
  } catch (error) {
    console.error("Upload assets error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const getAssets = async (_req, res) => {
  try {
    return res.status(200).json({
      message: "Assets retrieved successfully.",
      data: listAssets(),
    });
  } catch (error) {
    console.error("Get assets error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const getAssetMeta = async (req, res) => {
  try {
    const asset = getAssetById(req.params.id);

    if (!asset) {
      return res.status(404).json({ message: "Asset not found." });
    }

    return res.status(200).json({
      message: "Asset retrieved successfully.",
      data: asset,
    });
  } catch (error) {
    console.error("Get asset meta error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const serveAssetFile = async (req, res) => {
  try {
    const asset = getAssetById(req.params.id);

    if (!asset) {
      return res.status(404).json({ message: "Asset not found." });
    }

    if (!fs.existsSync(asset.absolute_path)) {
      return res.status(404).json({ message: "Stored file not found." });
    }

    res.setHeader("Content-Type", asset.mime_type);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${asset.original_name}"`,
    );

    return res.sendFile(asset.absolute_path);
  } catch (error) {
    console.error("Serve asset error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};
