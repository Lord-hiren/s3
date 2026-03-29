import fs from "fs";
import {
  createAssetRecord,
  deleteAssetRecord,
  getAssetById,
  listAssets,
  updateAssetRecord,
} from "../services/asset_store.service.js";

export const uploadAssets = async (req, res) => {
  try {
    const files = req.files || [];

    if (!files.length) {
      return res.status(400).json({ message: "At least one file is required." });
    }

    const assets = await Promise.all(
      files.map((file) =>
        createAssetRecord({
          file,
          uploadedBy: req.authUser || null,
        }),
      ),
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
      data: await listAssets(),
    });
  } catch (error) {
    console.error("Get assets error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const { original_name } = req.body;

    const asset = await getAssetById(id);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found." });
    }

    if (!String(original_name || "").trim()) {
      return res.status(400).json({
        message: "original_name is required.",
      });
    }

    const updatedAsset = await updateAssetRecord({
      id,
      originalName: original_name,
    });

    return res.status(200).json({
      message: "Asset updated successfully.",
      data: updatedAsset,
    });
  } catch (error) {
    console.error("Update asset error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const deleteAsset = async (req, res) => {
  try {
    const asset = await deleteAssetRecord(req.params.id);

    if (!asset) {
      return res.status(404).json({ message: "Asset not found." });
    }

    return res.status(200).json({
      message: "Asset deleted successfully.",
      data: asset,
    });
  } catch (error) {
    console.error("Delete asset error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const getAssetMeta = async (req, res) => {
  try {
    const asset = await getAssetById(req.params.id);

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
    const asset = await getAssetById(req.params.id);

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
