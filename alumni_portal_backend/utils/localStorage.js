const path = require("path");
const { uploadUserMedia, deletePreviousIfOwned } = require("./mediaStorage");

/**
 * Shared upload helper — Azure Blob only (connection string from env).
 * @param {Buffer} buffer
 * @param {string} originalname
 * @param {string} folder legacy hint — use options.kind when possible
 * @param {string} mimeType
 * @param {{ userId?: string, kind?: 'profile'|'cover'|'post'|'video'|'institution-post', previousUrl?: string }} [options]
 */
async function saveBufferToUploads(buffer, originalname, folder = "", mimeType = "", options = {}) {
  if (!buffer) throw new Error("No file buffer provided");

  const userId = options.userId;
  if (!userId) {
    throw new Error("userId is required for Azure uploads");
  }

  let kind = options.kind;
  if (!kind) {
    if (folder === "profile") kind = "profile";
    else if (folder === "cover") kind = "cover";
    else if (folder === "posts" || folder === "post") kind = "post";
    else if (folder === "videos" || folder === "video") kind = "video";
    else if (folder === "institution-posts" || folder === "institution-post") kind = "institution-post";
    else if (folder === "events" || folder === "opportunities") kind = "post";
    else kind = "post";
  }

  let forceType;
  if (kind === "profile" || kind === "cover") forceType = "image";
  else if (kind === "video") forceType = "video";

  if (options.previousUrl) {
    await deletePreviousIfOwned(options.previousUrl, userId);
  }

  return uploadUserMedia({
    userId,
    buffer,
    originalname: originalname || "file",
    mimetype: mimeType || "application/octet-stream",
    kind,
    forceType,
  });
}

module.exports = { saveBufferToUploads };
