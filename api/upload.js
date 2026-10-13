// Uploads for the dashboard (PDF decks, covers, folder icons).
// On Vercel: the browser uploads straight to Vercel Blob; this route only hands out a short-lived
// token after checking the owner is signed in (so large PDFs never pass through the function).
// Locally: the file is POSTed here and written to .data/uploads.
import { guard, isSignedIn, json } from "./_lib/auth.js";
import { saveFile, storageMode } from "./_lib/store.js";

const TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 50 * 1024 * 1024;

export async function POST(request) {
  if (storageMode === "local") {
    const denied = guard(request);
    if (denied) return denied;
    const pathname = new URL(request.url).searchParams.get("name") || "";
    const type = request.headers.get("content-type") || "";
    if (!/^uploads\/[\w./-]+$/.test(pathname) || pathname.includes("..")) return json({ error: "Bad file name" }, 400);
    if (!TYPES.includes(type)) return json({ error: "Only PDF, JPG, PNG or WebP files" }, 415);
    const data = await request.arrayBuffer();
    if (data.byteLength > MAX_BYTES) return json({ error: "File is larger than 50 MB" }, 413);
    return json({ url: await saveFile(pathname.replace(/^uploads\//, ""), data, type) });
  }

  const { handleUpload } = await import("@vercel/blob/client");
  try {
    const body = await request.json();
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Vercel's upload-finished callback skips this step, so the sign-in check lives here only.
        if (request.headers.get("x-seanos") !== "1" || !isSignedIn(request)) throw new Error("Not signed in");
        if (!pathname.startsWith("uploads/")) throw new Error("Bad file name");
        return { allowedContentTypes: TYPES, maximumSizeInBytes: MAX_BYTES, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return json(result);
  } catch (e) {
    return json({ error: e.message || "Upload failed" }, 400);
  }
}
