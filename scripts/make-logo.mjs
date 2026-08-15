import sharp from "sharp";
import fs from "fs";

const src =
  "C:/Users/timon/.cursor/projects/c-Users-timon-Documents-SportHitzeCheck/assets/c__Users_timon_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Logo_SportHitzeCheck-794e80d5-9c04-4b95-82d6-5a658db05f8d.png";

/** Tailwind slate-50 – gleicher Ton wie body (`bg-slate-50`). */
const PAGE_BG = { r: 248, g: 250, b: 252 };

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height } = info;
const seen = new Uint8Array(width * height);

function isPageBackground(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum >= 200 && max - min < 48;
}

const stack = [];
for (let x = 0; x < width; x++) {
  stack.push(x, 0, x, height - 1);
}
for (let y = 0; y < height; y++) {
  stack.push(0, y, width - 1, y);
}

while (stack.length) {
  const y = stack.pop();
  const x = stack.pop();
  if (x < 0 || y < 0 || x >= width || y >= height) continue;
  const p = y * width + x;
  if (seen[p]) continue;
  seen[p] = 1;
  const i = p * 4;
  if (!isPageBackground(data[i], data[i + 1], data[i + 2])) continue;
  data[i + 3] = 0;
  stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
}

for (let i = 0; i < data.length; i += 4) {
  const a = data[i + 3] / 255;
  if (a >= 1) continue;
  data[i] = Math.round(data[i] * a + PAGE_BG.r * (1 - a));
  data[i + 1] = Math.round(data[i + 1] * a + PAGE_BG.g * (1 - a));
  data[i + 2] = Math.round(data[i + 2] * a + PAGE_BG.b * (1 - a));
  data[i + 3] = 255;
}

await sharp(data, {
  raw: { width, height, channels: 4 },
})
  .resize(512, 512)
  .png({ compressionLevel: 9, effort: 10 })
  .toFile("public/brand/logo.png");

const out = fs.statSync("public/brand/logo.png");
console.log("out bytes", out.size);
