import { Router } from "express";
import crypto from "node:crypto";

import type { GenerateVideoRequest } from "../types";
import { getTask, saveTask, updateTask } from "../services/taskStore";
import { resolveImageInput } from "../services/imageResolver";
import { startVideoGeneration, checkVideoOperation } from "../services/veoService";
import { startDeapiGeneration, checkDeapiGeneration } from "../services/deapiService";

const router = Router();

router.post("/generate-video", async (req, res) => {
  try {
    const body = req.body as GenerateVideoRequest;

    if (!body.jobId || !body.fileName || !body.prompt) {
      return res.status(400).json({
        ok: false,
        error: "Missing required fields",
      });
    }

    const provider = body.provider || "google";
    const duration = body.durationSeconds ?? 8;

    if (![4, 6, 8].includes(duration)) {
      return res.status(400).json({
        ok: false,
        error: "durationSeconds must be 4, 6, or 8",
      });
    }

    const taskId = crypto.randomUUID();

    saveTask({
      taskId,
      jobId: body.jobId,
      provider,
      status: "queued",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (provider === "deapi") {
      if (!body.imageUrl) {
        return res.status(400).json({
          ok: false,
          error: "imageUrl is required for deapi provider",
        });
      }

      const startResult = await startDeapiGeneration({
        prompt: body.prompt,
        imageUrl: body.imageUrl,
      });

      updateTask(taskId, {
        status: "running",
        providerRequestId: startResult.requestId,
      });

      return res.json({
        ok: true,
        taskId,
        status: "queued",
        providerRequestId: startResult.requestId,
      });
    }

    if (!body.imageBase64 && !body.imageUrl) {
      return res.status(400).json({
        ok: false,
        error: "imageBase64 or imageUrl is required",
      });
    }

    const resolvedImage = await resolveImageInput({
      mimeType: body.mimeType,
      imageBase64: body.imageBase64,
      imageUrl: body.imageUrl,
    });

    const startResult = await startVideoGeneration({
      prompt: body.prompt,
      mimeType: resolvedImage.mimeType,
      imageBase64: resolvedImage.imageBase64,
      durationSeconds: duration,
    });

    updateTask(taskId, {
      status: "running",
      operationName: startResult.operationName,
    });

    return res.json({
      ok: true,
      taskId,
      status: "queued",
      operationName: startResult.operationName,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/tasks/:id", async (req, res) => {
  const task = getTask(req.params.id);

  if (!task) {
    return res.status(404).json({
      ok: false,
      error: "Task not found",
    });
  }

  try {
    if (task.provider === "deapi") {
      if (!task.providerRequestId) {
        return res.json({
          ok: true,
          ...task,
        });
      }

      const result = await checkDeapiGeneration(task.providerRequestId);

      if (!result.done) {
        return res.json({
          ok: true,
          ...task,
          status: "running",
        });
      }

      const updated = updateTask(task.taskId, {
        status: "succeeded",
        resultUrl: result.resultUrl,
        videoFileName: result.videoFileName,
        videoMimeType: result.videoMimeType,
      });

      return res.json({
        ok: true,
        ...updated,
      });
    }

    if (!task.operationName) {
      return res.json({
        ok: true,
        ...task,
      });
    }

    const op = await checkVideoOperation(task.operationName);

    if (!op.done) {
      return res.json({
        ok: true,
        ...task,
        status: "running",
      });
    }

    const updated = updateTask(task.taskId, {
      status: "succeeded",
      videoFileName: op.videoFileName,
      videoMimeType: op.videoMimeType,
    });

    return res.json({
      ok: true,
      ...updated,
    });
  } catch (error) {
    const updated = updateTask(task.taskId, {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return res.json({
      ok: true,
      ...updated,
    });
  }
});

export default router;