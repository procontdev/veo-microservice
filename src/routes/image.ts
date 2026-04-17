import { Router } from "express";
import { composeCarOnLocation, decodeOptionalBase64 } from "../services/composeService";

const router = Router();

router.post("/compose-preview", async (req, res) => {
  try {
    const { carImageUrl, locationImageUrl } = req.body as {
      carImageUrl?: string;
      locationImageUrl?: string;
    };

    if (!carImageUrl || !locationImageUrl) {
      return res.status(400).json({
        ok: false,
        error: "carImageUrl and locationImageUrl are required",
      });
    }

    const composed = await composeCarOnLocation({
      carImageUrl,
      locationImageUrl,
    });

    res.setHeader("Content-Type", composed.mimeType);
    return res.send(composed.imageBuffer);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.post("/compose-preview-base64", async (req, res) => {
  try {
    const {
      imageBase64,
      locationImageBase64,
    } = req.body as {
      imageBase64?: string;
      locationImageBase64?: string;
    };

    if (!imageBase64 || !locationImageBase64) {
      return res.status(400).json({
        ok: false,
        error: "imageBase64 and locationImageBase64 are required",
      });
    }

    const composed = await composeCarOnLocation({
      carImageBuffer: decodeOptionalBase64(imageBase64),
      locationImageBuffer: decodeOptionalBase64(locationImageBase64),
    });

    res.setHeader("Content-Type", composed.mimeType);
    return res.send(composed.imageBuffer);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;