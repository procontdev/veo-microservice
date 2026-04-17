export type GenerateVideoRequest = {
  jobId: string;
  fileName: string;
  mimeType?: string;
  imageBase64?: string;
  imageUrl?: string;
  locationImageUrl?: string;
  prompt: string;
  durationSeconds?: 4 | 6 | 8;
  provider?: "google" | "deapi";
};

export type TaskStatus = "queued" | "running" | "succeeded" | "failed";

export type TaskRecord = {
  taskId: string;
  jobId: string;
  provider?: "google" | "deapi";
  status: TaskStatus;
  operationName?: string;
  providerRequestId?: string;
  resultUrl?: string;
  videoFileName?: string;
  videoMimeType?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};