import { readdir, mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve("public");
const output = path.join(root, "optimized");
await mkdir(output, { recursive: true });
const manifest = {};
async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(file);
      continue;
    }
    if (!/\.(png|jpe?g)$/i.test(file)) continue;
    const original = await readFile(file);
    const { width } = await sharp(original).metadata();
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
    manifest["/" + path.relative(root, file).split(path.sep).join("/")] =
      variants.join(", ");
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
