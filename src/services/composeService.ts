import sharp from "sharp";

type ComposeResult = {
  imageBuffer: Buffer;
  mimeType: string;
};

async function fetchBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function buildAlphaChannel(
  rgba: Buffer,
  width: number,
  height: number,
  threshold = 242
): Buffer {
  const alpha = Buffer.alloc(width * height);

  for (let i = 0, p = 0; i < rgba.length; i += 4, p++) {
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];

    const isNearWhite = r >= threshold && g >= threshold && b >= threshold;
    alpha[p] = isNearWhite ? 0 : 255;
  }

  return alpha;
}

export async function composeCarOnLocation(input: {
  carImageUrl: string;
  locationImageUrl: string;
}): Promise<ComposeResult> {
  const sceneWidth = 1280;
  const sceneHeight = 720;

  const [carBuffer, locationBuffer] = await Promise.all([
    fetchBuffer(input.carImageUrl),
    fetchBuffer(input.locationImageUrl),
  ]);

  const background = sharp(locationBuffer).resize(sceneWidth, sceneHeight, {
    fit: "cover",
    position: "centre",
  });

  const carBase = sharp(carBuffer).resize({
    width: 900,
    height: 520,
    fit: "inside",
    withoutEnlargement: true,
  });

  const carMeta = await carBase
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const alpha = buildAlphaChannel(
    carMeta.data,
    carMeta.info.width,
    carMeta.info.height,
    242
  );

  const carPng = await sharp(carMeta.data, {
    raw: {
      width: carMeta.info.width,
      height: carMeta.info.height,
      channels: 4,
    },
  })
    .joinChannel(alpha)
    .png()
    .toBuffer();

  const carPlacedWidth = carMeta.info.width;
  const carPlacedHeight = carMeta.info.height;

  const left = Math.round((sceneWidth - carPlacedWidth) / 2);
  const top = Math.round(sceneHeight - carPlacedHeight - 40);

  const shadowSvg = `
    <svg width="${sceneWidth}" height="${sceneHeight}" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="${sceneWidth / 2}" cy="${top + carPlacedHeight - 8}" rx="${Math.round(
        carPlacedWidth * 0.33
      )}" ry="26" fill="rgba(0,0,0,0.28)"/>
    </svg>
  `;

  const composed = await background
    .composite([
      {
        input: Buffer.from(shadowSvg),
        top: 0,
        left: 0,
      },
      {
        input: carPng,
        top,
        left,
      },
    ])
    .jpeg({ quality: 92 })
    .toBuffer();

  return {
    imageBuffer: composed,
    mimeType: "image/jpeg",
  };
}