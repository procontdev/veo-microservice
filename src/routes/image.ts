import { Router } from "express";
import { composeCarOnLocation } from "../services/composeService";

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

export default router;