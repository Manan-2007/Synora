/* =========================================================
   Attachments — photos, PDFs and documents on tasks and notes.

   The bytes go to the API (/api/files, stored in MySQL); the task
   or note keeps only { id, name, mime, size }, which syncs like the
   rest of it. So attaching needs an account that's connected to the
   database (not browser-only storage, and not the shared demo).

   Big photos are shrunk in the browser first (longest side 2000px,
   JPEG), so a 6 MB phone picture uploads as a few hundred KB.
   ========================================================= */

import { api } from "./api.js";

export const FILE_MAX = 3.5 * 1024 * 1024;
export const ACCEPT = "image/*,application/pdf,.pdf,.txt,.doc,.docx,.ppt,.pptx,.xls,.xlsx";

const EXT_TYPES = {
  pdf: "application/pdf", txt: "text/plain", doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", heic: "image/heic", heif: "image/heif",
};

export const canAttach = () => !!api.token();
export const isImage = (f) => /^image\//.test(f.mime);

export function sizeLabel(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function typeOf(file) {
  if (file.type) return file.type.toLowerCase();
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  return EXT_TYPES[ext] || "";
}

/* Shrink a photo the browser can decode; anything else is sent as it is.
   `force` always re-encodes to JPEG (the timetable scanner wants a format
   every AI service reads, not HEIC). */
export async function shrinkImage(file, maxSide = 2000, quality = 0.85, force = false) {
  if (!/^image\/(png|jpeg|webp|heic|heif)$/.test(typeOf(file))) return file;
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { return file; }   // e.g. HEIC on Chrome
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (!force && scale === 1 && file.size < 1.2 * 1024 * 1024) { bitmap.close(); return file; }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", quality));
  if (!blob || (!force && blob.size >= file.size)) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

const ERRORS = {
  403: "The shared demo account can't store files. Create your own account to attach them.",
  413: "That file is too big: the limit is 3.5 MB.",
  415: "That kind of file can't be attached. Photos, PDFs, Word, PowerPoint, Excel and text files work.",
  507: "Your account is full: 50 MB of attachments. Remove some to add more.",
};

/* Uploads one file for an owner ("task:<id>" or "note:<id>").
   Resolves to { id, name, mime, size }; throws an Error with a message
   that can be shown as it is. */
export async function uploadFile(file, owner) {
  const token = api.token();
  if (!token) throw new Error("Attachments need your account to be connected. Check your connection and try again.");
  const ready = await shrinkImage(file);
  const mime = typeOf(ready);
  if (!mime) throw new Error(ERRORS[415]);
  if (ready.size > FILE_MAX) throw new Error(ERRORS[413]);
  const q = new URLSearchParams({ owner, name: ready.name, type: mime });
  let res;
  try {
    res = await fetch("/api/files?" + q, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/octet-stream" },
      body: ready,
    });
  } catch {
    throw new Error("Couldn't upload: you seem to be offline.");
  }
  if (!res.ok) throw new Error(ERRORS[res.status] || "Couldn't upload that file. Please try again.");
  return res.json();
}

/* The file's bytes as an object URL, fetched once per page load. */
const urls = new Map();
export async function fileURL(f) {
  if (urls.has(f.id)) return urls.get(f.id);
  const promise = (async () => {
    const res = await fetch("/api/files/" + encodeURIComponent(f.id), { headers: { Authorization: "Bearer " + (api.token() || "") } });
    if (!res.ok) throw new Error("not-found");
    return URL.createObjectURL(await res.blob());
  })();
  urls.set(f.id, promise);
  promise.catch(() => urls.delete(f.id));
  return promise;
}

export async function downloadFile(f) {
  const url = await fileURL(f);
  const a = document.createElement("a");
  a.href = url;
  a.download = f.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function deleteFile(id) {
  const token = api.token();
  if (!token) return;
  try {
    await fetch("/api/files/" + encodeURIComponent(id), { method: "DELETE", headers: { Authorization: "Bearer " + token } });
  } catch { /* offline: the file stays until its task or note is deleted */ }
}
