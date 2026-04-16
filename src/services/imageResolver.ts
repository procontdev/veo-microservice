type ResolvedImage = {
  mimeType: string;
  imageBase64: string;
};

export async function resolveImageInput(input: {
  mimeType?: string;
  imageBase64?: string;
  imageUrl?: string;
}): Promise<ResolvedImage> {
  if (input.imageBase64) {
    return {
      mimeType: input.mimeType || "image/jpeg",
      imageBase64: input.imageBase64,
    };
  }

  if (!input.imageUrl) {
    throw new Error("Missing imageBase64 or imageUrl");
  }

  const response = await fetch(input.imageUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch imageUrl: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || input.mimeType || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    mimeType: contentType,
    imageBase64: buffer.toString("base64"),
  };
}