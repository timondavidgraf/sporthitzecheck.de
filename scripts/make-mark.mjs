import sharp from "sharp";
import fs from "fs";

const src =
  "C:/Users/timon/.cursor/projects/c-Users-timon-Documents-SportHitzeCheck/assets/c__Users_timon_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Logo_SportHitzeCheck-794e80d5-9c04-4b95-82d6-5a658db05f8d.png";

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height } = info;
const seen = new Uint8Array(width * height);

function isBg(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum >= 200 && max - min < 48;
}

const stack = [];
for (let x = 0; x < width; x++) stack.push(x, 0, x, height - 1);
for (let y = 0; y < height; y++) stack.push(0, y, width - 1, y);

while (stack.length) {
  const y = stack.pop();
  const x = stack.pop();
  if (x < 0 || y < 0 || x >= width || y >= height) continue;
  const p = y * width + x;
  if (seen[p]) continue;
  seen[p] = 1;
  const i = p * 4;
  if (!isBg(data[i], data[i + 1], data[i + 2])) continue;
  data[i + 3] = 0;
  stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
}

const eroded = Buffer.from(data);
for (let y = 1; y < height - 1; y++) {
  for (let x = 1; x < width - 1; x++) {
    let minA = 255;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const a = data[((y + dy) * width + (x + dx)) * 4 + 3];
        if (a < minA) minA = a;
      }
    }
    eroded[(y * width + x) * 4 + 3] = minA;
  }
}
eroded.copy(data);

let minX = width;
let minY = height;
let maxX = 0;
let maxY = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] < 16) continue;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
}

const cropped = await sharp(data, {
  raw: { width, height, channels: 4 },
})
  .extract({
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  })
  .png()
  .toBuffer();

const size = 256;
const pad = 18;
const inner = size - pad * 2;

const fitted = await sharp(cropped)
  .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const icon = await sharp({
  create: {
    width: size,
    height: size,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([{ input: fitted, left: pad, top: pad }])
  .png({ compressionLevel: 9, effort: 10 })
  .toBuffer();

await sharp(icon).toFile("public/brand/icon.png");
await sharp(icon).toFile("public/brand/mark.png");
await sharp(icon).resize(192, 192).png({ compressionLevel: 9 }).toFile("app/icon.png");

const appleBg = { r: 248, g: 250, b: 252, alpha: 1 };
const apple = await sharp({
  create: { width: size, height: size, channels: 4, background: appleBg },
})
  .composite([{ input: icon }])
  .png({ compressionLevel: 9 })
  .toBuffer();

await sharp(apple).resize(180, 180).png({ compressionLevel: 9 }).toFile("public/brand/apple-touch-icon.png");
await sharp(apple).resize(180, 180).png({ compressionLevel: 9 }).toFile("app/apple-icon.png");

console.log("icon bytes", fs.statSync("public/brand/icon.png").size, "bbox", minX, minY, maxX, maxY);
