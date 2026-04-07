const path = require("path");
const {
  CONTAINERS,
  uploadToContainer,
  deleteBlobByUrl,
  blobBelongsToUser,
  parseBlobUrl,
} = require("./azureStorage");

const IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const VIDEO_MIMES = new Set(["video/mp4", "video/quicktime"]);

function extFromMime(mimeType) {
  const mt = (mimeType || "").toLowerCase();
  if (mt === "image/jpeg" || mt === "image/jpg") return ".jpg";
  if (mt === "image/png") return ".png";
  if (mt === "image/webp") return ".webp";
  if (mt === "video/mp4") return ".mp4";
  if (mt === "video/quicktime") return ".mov";
  return "";
}

function safeOriginalBase(originalname) {
  const ext = path.extname(originalname || "");
  const base = path.basename(originalname || "file", ext);
  return String(base || "file")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase() || "file";
}

/**
 * Blob path: userId_timestamp_originalname
 * @param {string} userId
 * @param {string} originalname
 * @param {string} mimetype
 */
function buildBlobName(userId, originalname, mimetype) {
  const ts = Date.now();
  const ext = path.extname(originalname || "") || extFromMime(mimetype) || "";
  const base = safeOriginalBase(originalname);
  return `${userId}_${ts}_${base}${ext}`;
}

/**
 * @param {'profile'|'cover'|'post'|'video'|'institution-post'} kind
 */
function containerForKind(kind) {
  switch (kind) {
    case "profile":
      return CONTAINERS.PROFILE;
    case "cover":
      return CONTAINERS.COVER;
    case "post":
      return CONTAINERS.POSTS;
    case "video":
      return CONTAINERS.VIDEOS;
    case "institution-post":
      return CONTAINERS.INSTITUTION_POSTS;
    default:
      throw new Error("Invalid media kind");
  }
}

/**
 * Post images → `posts`, post videos → `videos`.
 */
function resolveContainer(kind, mimetype) {
  const mt = (mimetype || "").toLowerCase();
  if (kind === "post") {
    if (VIDEO_MIMES.has(mt)) return CONTAINERS.VIDEOS;
    if (IMAGE_MIMES.has(mt)) return CONTAINERS.POSTS;
    throw new Error("Post media must be image (jpg/png/webp) or video (mp4/mov)");
  }
  return containerForKind(kind);
}

/**
 * Upload buffer to Azure with naming convention.
 * @param {object} opts
 * @param {string} opts.userId
 * @param {Buffer} opts.buffer
 * @param {string} opts.originalname
 * @param {string} opts.mimetype
 * @param {'profile'|'cover'|'post'|'video'|'institution-post'} opts.kind
 * @param {'image'|'video'} [opts.forceType] validate mime against image vs video limits
 */
async function uploadUserMedia(opts) {
  const { userId, buffer, originalname, mimetype, kind, forceType } = opts;
  if (!buffer || !userId) throw new Error("Missing buffer or userId");

  const mt = (mimetype || "application/octet-stream").toLowerCase();

  const maxImage = 5 * 1024 * 1024;
  const maxVideo = 50 * 1024 * 1024;
  if (IMAGE_MIMES.has(mt) && buffer.length > maxImage) {
    throw new Error("Image size must be at most 5MB");
  }
  if (VIDEO_MIMES.has(mt) && buffer.length > maxVideo) {
    throw new Error("Video size must be at most 50MB");
  }

  if (forceType === "image" && !IMAGE_MIMES.has(mt)) {
    throw new Error("Only jpg, jpeg, png, webp images are allowed");
  }
  if (forceType === "video" && !VIDEO_MIMES.has(mt)) {
    throw new Error("Only mp4 and mov videos are allowed");
  }
  if (!forceType) {
    if (!IMAGE_MIMES.has(mt) && !VIDEO_MIMES.has(mt)) {
      throw new Error("Unsupported file type");
    }
  }

  const container = kind === "post" ? resolveContainer(kind, mt) : containerForKind(kind);
  const blobName = buildBlobName(String(userId), originalname, mt);
  return uploadToContainer(container, buffer, blobName, mt);
}

/**
 * Delete previous blob if it is our Azure URL and blob name is owned by userId.
 * @param {string|null|undefined} previousUrl
 * @param {string} userId
 */
async function deletePreviousIfOwned(previousUrl, userId) {
  if (!previousUrl || !String(previousUrl).startsWith("http")) return;
  const parsed = parseBlobUrl(previousUrl);
  if (!parsed || !blobBelongsToUser(parsed.blobName, userId)) return;
  await deleteBlobByUrl(previousUrl);
}

/**
 * Delete blob URL if owned by user (for DELETE /media).
 */
async function deleteOwnedBlobUrl(blobUrl, userId) {
  const parsed = parseBlobUrl(blobUrl);
  if (!parsed || !blobBelongsToUser(parsed.blobName, userId)) {
    return { ok: false, message: "Not found or not allowed" };
  }
  const r = await deleteBlobByUrl(blobUrl);
  return r.ok ? { ok: true } : { ok: false, message: r.reason || "Delete failed" };
}

module.exports = {
  IMAGE_MIMES,
  VIDEO_MIMES,
  buildBlobName,
  uploadUserMedia,
  deletePreviousIfOwned,
  deleteOwnedBlobUrl,
  containerForKind,
  resolveContainer,
};
