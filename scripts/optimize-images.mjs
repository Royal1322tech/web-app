import { readdir, mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve("public");
const output = path.join(root, "optimized");
await mkdir(output, { recursive: true });
const manifest = {};
// Full-bleed heroes crop hard on phones, so each gets its own phone-shaped image instead of a
// wide file that is mostly cropped away. The value is the subject's horizontal position (0 to 1).
const phoneCrops = {
  "/images/home/flight/hero-clean.png": 0.76,
  "/images/home/hero/maldives-ai.png": 0.68,
  "/images/home/hero/dubai-ai.png": 0.56,
  "/images/home/hero/santorini-ai.png": 0.7,
  "/images/home/hero/switzerland-ai.png": 0.64,
  "/images/welcome/resort-aerial.jpg": 0.55,
  "/images/home/cinematic/coastal-resort.png": 0.62,
  "/images/services/apartment-rentals.jpg": 0.32,
  "/images/services/flights.jpg": 0.62,
  "/images/home/cinematic/airport-transfers.png": 0.53,
  "/images/rental/luxury-arrival.webp": 0.62,
  "/images/rental/hero-open-road.jpg": 0.55,
  "/images/rental/hero-city-dusk.jpg": 0.7,
  "/images/rental/hero-sedan-motion.jpg": 0.55,
};
const PHONE_WIDTH = 900;
const PHONE_RATIO = 1.15;
async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(file);
      continue;
    }
    if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
    const original = await readFile(file);
    const { width, height } = await sharp(original).metadata();
    const hash = createHash("sha256")
      .update(original)
      .update("webp-q85-v1")
      .digest("hex")
      .slice(0, 16);
    const widths = [
      ...new Set(
        [320, 480, 768, 1024, 1440, width].filter((size) => size <= width),
      ),
    ].sort((a, b) => a - b);
    const variants = [];
    for (const size of widths) {
      const name = `${hash}-${size}.webp`;
      const destination = path.join(output, name);
      if (!(await stat(destination).catch(() => null))) {
        await sharp(original)
          .resize({ width: size, withoutEnlargement: true })
          .webp({ quality: 85 })
          .toFile(destination);
      }
      variants.push(`/optimized/${name} ${size}w`);
    }
    const key = "/" + path.relative(root, file).split(path.sep).join("/");
    manifest[key] = variants.join(", ");
    if (phoneCrops[key] !== undefined) {
      const focus = phoneCrops[key];
      const cropWidth = Math.min(width, Math.round(height * PHONE_RATIO));
      const left = Math.max(0, Math.min(width - cropWidth, Math.round(width * focus - cropWidth / 2)));
      const name = `${hash}-phone${Math.round(focus * 100)}-${PHONE_WIDTH}.webp`;
      const destination = path.join(output, name);
      if (!(await stat(destination).catch(() => null))) {
        await sharp(original)
          .extract({ left, top: 0, width: cropWidth, height })
          .resize({ width: PHONE_WIDTH, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(destination);
      }
      manifest[`${key}#phone`] = `/optimized/${name} ${Math.min(PHONE_WIDTH, cropWidth)}w`;
    }
  }
}
await visit(path.join(root, "images"));
await mkdir("src/generated", { recursive: true });
await writeFile(
  "src/generated/image-sources.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  `Prepared responsive WebP variants for ${Object.keys(manifest).length} original images.`,
);
