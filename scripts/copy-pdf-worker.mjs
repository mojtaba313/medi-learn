import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(import.meta.url), "../..");
const src = path.join(
  root,
  "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs",
);
const destDir = path.join(root, "public");
const dest = path.join(destDir, "pdf.worker.min.js");

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log(`copied pdf.worker.min.mjs -> public/pdf.worker.min.js`);
