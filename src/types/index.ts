export type GenerateVideoRequest = {
  jobId: string;
  fileName: string;
  mimeType?: string;
  imageBase64?: string;
  imageUrl?: string;
  prompt: string;
  durationSeconds?: 4 | 6 | 8;
};

export type TaskStatus = "queued" | "running" | "succeeded" | "failed";

export type TaskRecord = {
  taskId: string;
  jobId: string;
  status: TaskStatus;
  operationName?: string;
  videoFileName?: string;
  videoMimeType?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};