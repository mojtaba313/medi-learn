import fs from "node:fs";
import path from "node:path";

const BUCKET_DIR = (process.env.GITHUB_BUCKET_DIR ?? "med-learn").replace(
  /^\/+|\/+$/g,
  "");
const REPO_ROOT = path.resolve(process.cwd(), "server", "assets");

export const BUCKET = BUCKET_DIR;

function requireConfig() {
  if (!BUCKET_DIR) {
    throw new Error("GITHUB_BUCKET_DIR must not be empty.");
  }
}

function fullKey(key: string) {
  return path.join(REPO_ROOT, key.replace(/^\/+/, ""));
}

export function noteAssetKey(noteId: string, assetId: string, fileName: string) {
  return `notes/${noteId}/assets/${assetId}-${fileName}`;
}

export async function putObject(
  key: string,
  body: Buffer | Uint8Array,
  _contentType: string,
) {
  requireConfig();
  const filePath = fullKey(key);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, Buffer.from(body));
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  requireConfig();
  const filePath = fullKey(key);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Object not found: ${key}`);
  }
  return fs.promises.readFile(filePath);
}

function contentTypeFor(key: string) {
  const lower = key.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}

export async function streamObject(key: string) {
  const buffer = await getObjectBuffer(key);
  return {
    stream: new Blob([new Uint8Array(buffer)]).stream(),
    contentType: contentTypeFor(key),
    size: buffer.length,
  };
}

export async function deleteNoteAssets(noteId: string) {
  requireConfig();
  const prefix = path.join(REPO_ROOT, `notes/${noteId}/`);
  if (!fs.existsSync(prefix)) return;
  await fs.promises.rm(prefix, { recursive: true, force: true });
}

export async function deleteObject(key: string) {
  requireConfig();
  const filePath = fullKey(key);
  try {
    await fs.promises.unlink(filePath);
  } catch {
    /* ignore missing */
  }
}