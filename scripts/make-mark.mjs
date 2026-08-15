import sharp from "sharp";
import fs from "fs";

const size = 256;
const r = size / 2;
const svg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${r}" cy="${r}" r="${r}" fill="white"/></svg>`
);

const mark = await sharp("public/brand/icon.png")
  .resize(size, size)
  .ensureAlpha()
  .composite([{ input: svg, blend: "dest-in" }])
  .png({ compressionLevel: 9 })
  .toBuffer();

await sharp(mark).toFile("public/brand/mark.png");
await sharp(mark).resize(192, 192).png({ compressionLevel: 9 }).toFile("app/icon.png");
await sharp(mark).resize(180, 180).png({ compressionLevel: 9 }).toFile("public/brand/apple-touch-icon.png");
await sharp(mark).resize(180, 180).png({ compressionLevel: 9 }).toFile("app/apple-icon.png");

console.log("mark bytes", fs.statSync("public/brand/mark.png").size);
