import sharp from "sharp";
import fs from "node:fs/promises";

type ComposeResult = {
  imageBuffer: Buffer;
  mimeType: string;
};

async function fetchOrReadBuffer(source: string): Promise<Buffer> {
  const isHttp = source.startsWith("http://") || source.startsWith("https://");

  if (!isHttp) {
    return await fs.readFile(source);
  }

  const response = await fetch(source, {
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (contentType && !contentType.startsWith("image/")) {
    const preview = buffer.toString("utf8", 0, Math.min(buffer.length, 200));
    throw new Error(
      `Fetched content is not an image. content-type=${contentType}. Preview=${preview}`
    );
  }

  return buffer;
}

function applyWhiteToTransparentWithSoftEdges(
  rgba: Buffer,
  threshold = 228,
  softThreshold = 205
): Buffer {
  const out = Buffer.from(rgba);

  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const avg = (r + g + b) / 3;

    let alpha = 255;

    if (r >= threshold && g >= threshold && b >= threshold) {
      alpha = 0;
    } else if (avg >= softThreshold) {
      const range = threshold - softThreshold;
      const t = Math.max(0, Math.min(1, (threshold - avg) / range));
      alpha = Math.round(255 * t);
    }

    out[i + 3] = alpha;
  }

  return out;
}

function addGroundContactShadowSvg(
  sceneWidth: number,
  sceneHeight: number,
  cx: number,
  cy: number,
  w: number,
  h: number
): Buffer {
  const svg = `
    <svg width="${sceneWidth}" height="${sceneHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="blur1" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id="blur2" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>

      <ellipse
        cx="${cx}"
        cy="${cy}"
        rx="${Math.round(w * 0.22)}"
        ry="${Math.round(h * 0.12)}"
        fill="rgba(0,0,0,0.22)"
        filter="url(#blur1)"
      />

      <ellipse
        cx="${cx}"
        cy="${cy + 2}"
        rx="${Math.round(w * 0.12)}"
        ry="${Math.round(h * 0.07)}"
        fill="rgba(0,0,0,0.28)"
        filter="url(#blur2)"
      />
    </svg>
  `;
  return Buffer.from(svg);
}

function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, "base64");
}

export function decodeOptionalBase64(base64?: string): Buffer | undefined {
  if (!base64) return undefined;
  return base64ToBuffer(base64);
}

export async function composeCarOnLocation(input: {
  carImageUrl?: string;
  locationImageUrl?: string;
  carImageBuffer?: Buffer;
  locationImageBuffer?: Buffer;
}): Promise<ComposeResult> {
  const sceneWidth = 1280;
  const sceneHeight = 720;

  const carBuffer = input.carImageBuffer
    ? input.carImageBuffer
    : await fetchOrReadBuffer(input.carImageUrl || "");

  const locationBuffer = input.locationImageBuffer
    ? input.locationImageBuffer
    : await fetchOrReadBuffer(input.locationImageUrl || "");

  const backgroundBuffer = await sharp(locationBuffer)
    .resize(sceneWidth, sceneHeight, {
      fit: "cover",
      position: "centre",
    })
    .modulate({
      brightness: 0.97,
      saturation: 0.94,
    })
    .jpeg({ quality: 92 })
    .toBuffer();

  const preparedCar = sharp(carBuffer)
    .resize({
      width: 640,
      height: 390,
      fit: "inside",
      withoutEnlargement: true,
    })
    .modulate({
      brightness: 0.92,
      saturation: 0.90,
    });

  const carMeta = await preparedCar
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgbaWithAlpha = applyWhiteToTransparentWithSoftEdges(
    carMeta.data,
    228,
    205
  );

  const cleanedCar = await sharp(rgbaWithAlpha, {
    raw: {
      width: carMeta.info.width,
      height: carMeta.info.height,
      channels: 4,
    },
  })
    .blur(0.35)
    .png()
    .toBuffer();

  const perspectiveCar = await sharp(cleanedCar)
    .affine(
      [
        [1, -0.04],
        [0, 0.95],
      ],
      {
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        interpolate: "bilinear",
      }
    )
    .png()
    .toBuffer();

  const placedMeta = await sharp(perspectiveCar).metadata();
  const carPlacedWidth = placedMeta.width || 640;
  const carPlacedHeight = placedMeta.height || 390;

  const left = Math.round((sceneWidth - carPlacedWidth) / 2);
  const top = Math.round(sceneHeight - carPlacedHeight - 72);

  const shadow = addGroundContactShadowSvg(
    sceneWidth,
    sceneHeight,
    Math.round(sceneWidth / 2),
    top + carPlacedHeight - 4,
    carPlacedWidth,
    Math.max(18, Math.round(carPlacedHeight * 0.08))
  );

  const composedBuffer = await sharp(backgroundBuffer)
    .composite([
      { input: shadow, top: 0, left: 0 },
      { input: perspectiveCar, top, left },
    ])
    .jpeg({ quality: 93 })
    .toBuffer();

  return {
    imageBuffer: composedBuffer,
    mimeType: "image/jpeg",
  };
}