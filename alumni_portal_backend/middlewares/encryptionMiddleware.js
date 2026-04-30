const { decryptPayload, encryptPayload } = require("../utils/crypto");

const encryptionMiddleware = (req, res, next) => {
  // 1. Decrypt Incoming Payload (if it exists and is a json request)
  if (req.body && req.body.payload && typeof req.body.payload === "string") {
    try {
      const decryptedData = decryptPayload(req.body.payload);
      // Replace req.body with the decrypted object
      req.body = decryptedData;
    } catch (error) {
      return res.status(400).json({ message: "Invalid encrypted payload" });
    }
  }

  // 2. Encrypt Outgoing Response (override res.json)
  const originalJson = res.json;

  res.json = function (data) {
    // We do not want to encrypt errors or simple error messages sometimes,
    // but to be truly end-to-end encrypted, we must encrypt everything except stream/buffers.
    // Ensure we don't double-encrypt
    if (data && data.payload) {
      return originalJson.call(this, data);
    }
    
    try {
      const encrypted = encryptPayload(data);
      return originalJson.call(this, { payload: encrypted });
    } catch (error) {
      return originalJson.call(this, data); // fallback to raw data if encryption fails
    }
  };

  next();
};

module.exports = encryptionMiddleware;
