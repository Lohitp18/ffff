const { deleteOwnedBlobUrl } = require("../utils/mediaStorage");
const { uploadProfileImage, uploadCoverImage } = require("./userController");

/**
 * DELETE /api/upload/media
 * Body: { url } — must be a blob owned by the authenticated user (name prefix userId_timestamp_...).
 */
exports.deleteMedia = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ message: "url is required" });
    }
    const r = await deleteOwnedBlobUrl(url, req.user._id.toString());
    if (!r.ok) {
      return res.status(403).json({ message: r.message || "Forbidden" });
    }
    return res.json({ message: "Deleted" });
  } catch (e) {
    console.error("deleteMedia:", e);
    return res.status(500).json({ message: e.message || "Server error" });
  }
};

/**
 * PUT /api/upload/media
 * Multipart: field `image`, form field `type` = profile | cover
 */
exports.updateMediaPut = async (req, res) => {
  const t = (req.body && req.body.type) || req.query.type;
  if (t === "profile") return uploadProfileImage(req, res);
  if (t === "cover") return uploadCoverImage(req, res);
  return res.status(400).json({
    message: "type must be profile or cover (send as form field or ?type=)",
  });
};
