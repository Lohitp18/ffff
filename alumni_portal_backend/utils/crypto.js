const CryptoJS = require("crypto-js");

// Fallback key, must match the frontend
const getSecretKey = () => {
  return process.env.ENCRYPTION_KEY || 'default_secret_key_1234567890123456';
};

/**
 * Decrypts an encrypted payload back to a JSON object
 * @param {string} ciphertext - The encrypted string
 * @returns {Object} - The decrypted JSON object
 */
const decryptPayload = (ciphertext) => {
  if (!ciphertext || typeof ciphertext !== 'string') return ciphertext;
  
  try {
    const secretKey = getSecretKey();
    const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedString) {
      throw new Error("Malformed or tampered data");
    }
    
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error("Backend Decryption failed:", error);
    throw new Error("Decryption failed");
  }
};

/**
 * Encrypts a JSON payload
 * @param {Object} data - The JSON object to encrypt
 * @returns {string} - The encrypted base64 string
 */
const encryptPayload = (data) => {
  if (!data) return data;
  
  try {
    const jsonString = JSON.stringify(data);
    const secretKey = getSecretKey();
    const ciphertext = CryptoJS.AES.encrypt(jsonString, secretKey).toString();
    return ciphertext;
  } catch (error) {
    console.error("Backend Encryption failed:", error);
    throw new Error("Encryption failed");
  }
};

module.exports = { decryptPayload, encryptPayload };
