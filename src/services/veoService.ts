import crypto from "node:crypto";

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

const USE_MOCK = true;

export async function startVideoGeneration(_input: StartVideoInput): Promise<StartVideoResult> {
  if (USE_MOCK) {
    return {
      operationName: `mock-op-${crypto.randomUUID()}`,
    };
  }

  throw new Error("Integración real con Google pendiente de habilitar en veoService.ts");
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
  }

  throw new Error("Consulta real de operación pendiente de habilitar en veoService.ts");
}