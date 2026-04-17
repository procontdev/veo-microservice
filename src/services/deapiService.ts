type StartDeapiInput = {
  prompt: string;
  imageUrl: string;
  durationSeconds?: number;
};

type StartDeapiResult = {
  requestId: string;
};

type CheckDeapiResult =
  | { done: false }
  | {
      done: true;
      resultUrl: string;
      videoFileName: string;
      videoMimeType: string;
    };

async function fetchImageAsBlob(imageUrl: string): Promise<Blob> {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch source image: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();

  return new Blob([arrayBuffer], { type: contentType });
}

function normalizeDurationSeconds(durationSeconds?: number): number {
  if (durationSeconds === 4 || durationSeconds === 6 || durationSeconds === 8) {
    return durationSeconds;
  }

  if (!durationSeconds || Number.isNaN(durationSeconds)) {
    return 4;
  }

  if (durationSeconds <= 4) return 4;
  if (durationSeconds <= 6) return 6;
  return 8;
}

export async function startDeapiGeneration(input: StartDeapiInput): Promise<StartDeapiResult> {
  const apiKey = process.env.DEAPI_API_KEY;
  if (!apiKey) {
    throw new Error("DEAPI_API_KEY is not configured");
  }

  const imageBlob = await fetchImageAsBlob(input.imageUrl);

  const durationSeconds = normalizeDurationSeconds(input.durationSeconds);
  const fps = 30;
  const frames = fps * durationSeconds;

  const form = new FormData();
  form.append("prompt", input.prompt);
  form.append("first_frame_image", imageBlob, "first-frame.jpg");
  form.append("width", "512");
  form.append("height", "512");
  form.append("guidance", "7.5");
  form.append("steps", "1");
  form.append("frames", String(frames));
  form.append("fps", String(fps));
  form.append("seed", "42");
  form.append("model", "Ltxv_13B_0_9_8_Distilled_FP8");

  const response = await fetch("https://api.deapi.ai/api/v1/client/img2video", {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`deAPI start failed: ${response.status} ${text}`);
  }

  const json = JSON.parse(text);
  const requestId = json?.data?.request_id;

  if (!requestId) {
    throw new Error("deAPI did not return request_id");
  }

  return { requestId };
}

export async function checkDeapiGeneration(requestId: string): Promise<CheckDeapiResult> {
  const apiKey = process.env.DEAPI_API_KEY;
  if (!apiKey) {
    throw new Error("DEAPI_API_KEY is not configured");
  }

  const response = await fetch(`https://api.deapi.ai/api/v1/client/request-status/${requestId}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`deAPI status failed: ${response.status} ${text}`);
  }

  const json = JSON.parse(text);
  const status = json?.data?.status;

  if (status !== "done") {
    return { done: false };
  }

  const resultUrl = json?.data?.result_url;
  if (!resultUrl) {
    throw new Error("deAPI status is done but result_url is missing");
  }

  return {
    done: true,
    resultUrl,
    videoFileName: "generated-video.mp4",
    videoMimeType: "video/mp4",
  };
}