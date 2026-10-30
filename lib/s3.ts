const GITHUB_API = "https://api.github.com";
const API_VERSION = "2022-11-28";

const OWNER = process.env.GITHUB_OWNER ?? "";
const REPO = process.env.GITHUB_REPO ?? "";
const BRANCH = process.env.GITHUB_BRANCH ?? "main";
const TOKEN = process.env.GITHUB_TOKEN ?? "";
const BUCKET_DIR = (process.env.GITHUB_BUCKET_DIR ?? "med-learn").replace(
  /^\/+|\/+$/g,
  "",
);

export const BUCKET = BUCKET_DIR;

function requireConfig() {
  if (!OWNER || !REPO || !TOKEN) {
    throw new Error(
      "GitHub storage is not configured. Set GITHUB_OWNER, GITHUB_REPO and GITHUB_TOKEN.",
    );
  }
  if (!BUCKET_DIR) {
    throw new Error("GITHUB_BUCKET_DIR must not be empty.");
  }
}

function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function fullKey(key: string) {
  return `${BUCKET_DIR}/${key.replace(/^\/+/, "")}`;
}

async function gh<T>(path: string, init: RequestInit = {}): Promise<T> {
  requireConfig();
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${TOKEN}`,
      "X-GitHub-Api-Version": API_VERSION,
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(
      `GitHub ${res.status}: ${body?.message ?? res.statusText}`,
    );
  }

  return (await res.json()) as T;
}

interface RefResponse {
  object: { sha: string };
}

interface CommitResponse {
  tree: { sha: string };
}

interface TreeResponse {
  sha: string;
  tree: { path: string; type: string; sha: string }[];
}

interface BlobResponse {
  content: string;
  encoding: string;
}

interface ContentsResponse {
  sha: string;
  size: number;
}

let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function getHead(): Promise<{ commitSha: string; treeSha: string }> {
  const ref = await gh<RefResponse>(
    `/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(REPO)}/git/ref/heads/${encodeURIComponent(BRANCH)}`,
  );
  const commit = await gh<CommitResponse>(
    `/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(REPO)}/git/commits/${ref.object.sha}`,
  );
  return { commitSha: ref.object.sha, treeSha: commit.tree.sha };
}

async function commitTree(
  baseTreeSha: string,
  parentCommitSha: string,
  entries: {
    path: string;
    mode: "100644";
    type: "blob";
    sha: string | null;
  }[],
  message: string,
) {
  const tree = await gh<{ sha: string }>(
    `/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(REPO)}/git/trees`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base_tree: baseTreeSha, tree: entries }),
    },
  );

  const commit = await gh<{ sha: string }>(
    `/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(REPO)}/git/commits`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        tree: tree.sha,
        parents: [parentCommitSha],
      }),
    },
  );

  await gh(
    `/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(REPO)}/git/refs/heads/${encodeURIComponent(BRANCH)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sha: commit.sha, force: false }),
    },
  );

  return commit.sha;
}

export function courseKey(courseId: string, fileName: string) {
  return `courses/${courseId}/${fileName}`;
}

export function courseSourceKey(courseId: string) {
  return `courses/${courseId}/source.pdf`;
}

export function pageKey(courseId: string, pageNumber: number) {
  return `courses/${courseId}/page-${String(pageNumber).padStart(3, "0")}.png`;
}

/** Internal, auth-gated URL served by our proxy routes. */
export function imageUrlFor(courseId: string, fileName: string) {
  return `/api/courses/${courseId}/image/${encodeURIComponent(fileName)}`;
}

export function pdfUrlFor(courseId: string) {
  return `/api/courses/${courseId}/pdf`;
}

export async function putObject(
  key: string,
  body: Buffer | Uint8Array,
  _contentType: string,
) {
  requireConfig();
  const path = fullKey(key);

  await enqueue(async () => {
    const { commitSha, treeSha } = await getHead();

    const blob = await gh<{ sha: string }>(
      `/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(REPO)}/git/blobs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: Buffer.from(body).toString("base64"),
          encoding: "base64",
        }),
      },
    );

    await commitTree(
      treeSha,
      commitSha,
      [{ path, mode: "100644", type: "blob", sha: blob.sha }],
      `Upload ${path}`,
    );
  });
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  requireConfig();
  const path = fullKey(key);

  const contents = await gh<ContentsResponse>(
    `/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(REPO)}/contents/${encodePath(path)}?ref=${encodeURIComponent(BRANCH)}`,
  );

  const blob = await gh<BlobResponse>(
    `/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(REPO)}/git/blobs/${contents.sha}`,
  );

  if (blob.encoding !== "base64") {
    throw new Error(`Unsupported GitHub blob encoding: ${blob.encoding}`);
  }

  return Buffer.from(blob.content.replace(/\n/g, ""), "base64");
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

export async function deleteCourseObjects(courseId: string) {
  requireConfig();
  const prefix = fullKey(`courses/${courseId}/`);

  await enqueue(async () => {
    const { commitSha, treeSha } = await getHead();

    const tree = await gh<TreeResponse>(
      `/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(REPO)}/git/trees/${treeSha}?recursive=1`,
    );

    const matches = tree.tree.filter(
      (entry) => entry.type === "blob" && entry.path.startsWith(prefix),
    );

    if (matches.length === 0) return;

    await commitTree(
      treeSha,
      commitSha,
      matches.map((entry) => ({
        path: entry.path,
        mode: "100644" as const,
        type: "blob" as const,
        sha: null,
      })),
      `Delete course ${courseId} files`,
    );
  });
}
