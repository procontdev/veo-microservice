const sharp = require("sharp");
const fs = require("fs");

async function test(path) {
  try {
    const buffer = fs.readFileSync(path);
    const meta = await sharp(buffer).metadata();
    console.log("OK:", path);
    console.log(meta);
  } catch (err) {
    console.error("ERROR:", path);
    console.error(err.message);
  }
}

(async () => {
  await test("E:/DESARROLLO/PixelStudio/Cars-Image-Video-IA/car1.jpeg");
  await test("E:/DESARROLLO/PixelStudio/Cars-Image-Video-IA/location1.png");
})();