import path from "node:path";
import sharp from "sharp";

const assetDir = path.resolve("public/assets");
const frames = ["start-frame", "end-frame"];

for (const frame of frames) {
  const input = path.join(assetDir, `${frame}.png`);
  const webpOutput = path.join(assetDir, `${frame}.webp`);
  const avifOutput = path.join(assetDir, `${frame}.avif`);

  await sharp(input)
    .webp({ quality: 72 })
    .toFile(webpOutput);

  await sharp(input)
    .avif({ quality: 50 })
    .toFile(avifOutput);

  console.log(`converted ${frame}`);
}
