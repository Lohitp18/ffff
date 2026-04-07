const { ALL_CONTAINERS, generateReadSasForBlob, generateReadSasForUrl } = require("../utils/azureStorage");

/**
 * GET /api/blob/sas?url=<azureBlobUrl>&expiresMinutes=10
 * Returns { url } where url is a SAS URL with read permission.
 */
exports.getBlobSasByUrl = async (req, res) => {
  try {
    const { url, expiresMinutes } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ message: "url query param is required" });
    }
    const exp = Number(expiresMinutes || 10);
    const sas = generateReadSasForUrl(url, Number.isFinite(exp) ? exp : 10);
    if (!sas) {
      return res.status(400).json({ message: "Could not generate SAS (invalid URL, container not allowed, or missing Azure credentials)" });
    }
    return res.json({ url: sas.url, expiresOn: sas.expiresOn });
  } catch (e) {
    console.error("getBlobSasByUrl:", e);
    return res.status(500).json({ message: e.message || "Server error" });
  }
};

/**
 * GET /api/blob/:filename?container=<container>&expiresMinutes=10
 * Returns SAS URL for a blob name within allowlisted containers.
 */
exports.getBlobSasByFilename = async (req, res) => {
  try {
    const { filename } = req.params;
    const { container, expiresMinutes } = req.query;

    if (!container || typeof container !== "string") {
      return res.status(400).json({ message: "container query param is required" });
    }
    if (!ALL_CONTAINERS.includes(container)) {
      return res.status(400).json({ message: "container not allowed" });
    }
    const blobName = decodeURIComponent(String(filename || "")).replace(/^\/+/, "");
    if (!blobName) {
      return res.status(400).json({ message: "filename is required" });
    }

    const exp = Number(expiresMinutes || 10);
    const sas = generateReadSasForBlob(container, blobName, Number.isFinite(exp) ? exp : 10);
    if (!sas) {
      return res.status(500).json({ message: "Azure credentials not configured for SAS generation" });
    }
    return res.json({ url: sas.url, expiresOn: sas.expiresOn });
  } catch (e) {
    console.error("getBlobSasByFilename:", e);
    return res.status(500).json({ message: e.message || "Server error" });
  }
};

