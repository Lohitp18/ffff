import CryptoJS from 'crypto-js';

// The encryption key should ideally be 32 bytes for AES-256
// We will use a fallback key for development if the env var is not set
const getSecretKey = () => {
  return import.meta.env.VITE_ENCRYPTION_KEY || 'default_secret_key_1234567890123456';
};

/**
 * Encrypts a JSON payload
 * @param {Object} data - The JSON object to encrypt
 * @returns {string} - The encrypted base64 string
 */
export const encryptPayload = (data) => {
  if (!data) return data;
  
  try {
    const jsonString = JSON.stringify(data);
    const secretKey = getSecretKey();
    
    // Encrypt using AES
    const ciphertext = CryptoJS.AES.encrypt(jsonString, secretKey).toString();
    return ciphertext;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Encryption failed');
  }
};

/**
 * Decrypts an encrypted payload back to a JSON object
 * @param {string} ciphertext - The encrypted string
 * @returns {Object} - The decrypted JSON object
 */
export const decryptPayload = (ciphertext) => {
  if (!ciphertext || typeof ciphertext !== 'string') return ciphertext;
  
  try {
    const secretKey = getSecretKey();
    
    // Decrypt using AES
    const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedString) {
      throw new Error('Malformed or tampered data');
    }
    
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Decryption failed');
  }
};
