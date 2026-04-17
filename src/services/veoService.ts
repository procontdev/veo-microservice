import crypto from "node:crypto";
import { GoogleGenAI } from "@google/genai";

type StartVideoInput = {
  prompt: string;
  mimeType: string;
  imageBase64: string;
  durationSeconds: 4 | 6 | 8;
};

type StartVideoResult = {
  operationName: string;
};

type CheckVideoResult =
  | { done: false }
  | {
      done: true;
      videoFileName: string;
      videoMimeType: string;
    };

const USE_MOCK = false;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  return new GoogleGenAI({ apiKey });
}

export async function startVideoGeneration(input: StartVideoInput): Promise<StartVideoResult> {
  if (USE_MOCK) {
    return {
      operationName: `mock-op-${crypto.randomUUID()}`,
    };
  }

  const ai = getAiClient();

  const operation = await ai.models.generateVideos({
    model: "veo-3.1-lite-generate-preview",
    prompt: input.prompt,
    image: {
      imageBytes: input.imageBase64,
      mimeType: input.mimeType,
    },
    config: {
      numberOfVideos: 1,
      durationSeconds: input.durationSeconds,
      resolution: "720p",
      aspectRatio: "16:9",
      personGeneration: "allow_adult",
    },
  });

  const operationName =
    (operation as any)?.name ||
    (operation as any)?.operation?.name ||
    "";

  if (!operationName) {
    throw new Error("Google Veo did not return an operation name");
  }

  return { operationName };
}

export async function checkVideoOperation(operationName: string): Promise<CheckVideoResult> {
  if (USE_MOCK) {
    if (operationName.startsWith("mock-op-")) {
      return {
        done: true,
        videoFileName: "mock-video.mp4",
        videoMimeType: "video/mp4",
      };
    }

    return { done: false };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/${operationName}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-goog-api-key": apiKey,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get operation status: ${response.status} ${text}`);
  }

  const operation = (await response.json()) as any;

  if (!operation.done) {
    return { done: false };
  }

  const generatedVideo = operation?.response?.generatedVideos?.[0];
  const video = generatedVideo?.video;

  if (!video?.uri) {
    throw new Error("Operation completed but no generated video URI was returned");
  }

  const downloadResponse = await fetch(video.uri, {
    method: "GET",
    headers: {
      "x-goog-api-key": apiKey,
    },
  });

  if (!downloadResponse.ok) {
    const text = await downloadResponse.text();
    throw new Error(`Failed to download generated video: ${downloadResponse.status} ${text}`);
  }

  const arrayBuffer = await downloadResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await import("node:fs/promises").then((fs) =>
    fs.writeFile("/tmp/generated-video.mp4", buffer)
  );

  return {
    done: true,
    videoFileName: "generated-video.mp4",
    videoMimeType: "video/mp4",
  };
}