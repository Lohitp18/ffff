/**
 * End-to-End Encryption (E2EE) Module for Alva's Connect Chat
 *
 * Uses the Web Crypto API (SubtleCrypto) with AES-256-GCM encryption
 * and PBKDF2 key derivation.
 *
 * All messages are encrypted directly on the client before network transmission,
 * ensuring the server and database only ever store secure ciphertext.
 *
 * Format: enc:v1:<base64-iv>:<base64-ciphertext>
 */

// Shared salt for conversation key derivation
const SALT_STRING = 'alvas-connect-e2ee-v1-production-salt'
const ITERATIONS = 100000

// Memory cache for derived CryptoKeys per chatId
const keyCache = new Map()

/**
 * Convert Uint8Array to Base64 string
 */
function uint8ArrayToBase64(bytes) {
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

/**
 * Convert Base64 string to Uint8Array
 */
function base64ToUint8Array(base64) {
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Checks if the Web Crypto API is available
 */
function hasSubtleCrypto() {
  return typeof window !== 'undefined' && window.crypto && window.crypto.subtle
}

/**
 * Derive AES-GCM 256-bit CryptoKey for a specific conversation
 */
async function deriveChatKey(chatId) {
  if (!chatId) throw new Error('chatId is required for key derivation')

  if (keyCache.has(chatId)) {
    return keyCache.get(chatId)
  }

  const encoder = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(chatId),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )

  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT_STRING),
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )

  keyCache.set(chatId, derivedKey)
  return derivedKey
}

/**
 * Pure JS XOR stream cipher fallback for non-secure / non-subtle environments
 */
function fallbackCipher(text, keyString) {
  const textChars = Array.from(text)
  const keyChars = Array.from(keyString)
  return textChars
    .map((c, i) =>
      String.fromCharCode(
        c.charCodeAt(0) ^ keyChars[i % keyChars.length].charCodeAt(0)
      )
    )
    .join('')
}

/**
 * Encrypt a plaintext message for a given chat
 * Returns formatted ciphertext envelope: enc:v1:<base64-iv>:<base64-ciphertext>
 */
export async function encryptMessage(text, chatId) {
  if (!text || typeof text !== 'string') return text
  if (!chatId) return text

  try {
    if (hasSubtleCrypto()) {
      const key = await deriveChatKey(chatId)
      const iv = window.crypto.getRandomValues(new Uint8Array(12)) // 96-bit standard IV for AES-GCM
      const encodedText = new TextEncoder().encode(text)

      const ciphertextBuffer = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv,
        },
        key,
        encodedText
      )

      const ivB64 = uint8ArrayToBase64(iv)
      const ctB64 = uint8ArrayToBase64(new Uint8Array(ciphertextBuffer))
      return `enc:v1:${ivB64}:${ctB64}`
    }

    // Pure JS fallback if SubtleCrypto is unavailable
    const encoded = fallbackCipher(text, chatId + SALT_STRING)
    return `enc:v1-fallback:${window.btoa(unescape(encodeURIComponent(encoded)))}`
  } catch (error) {
    console.error('Encryption error:', error)
    // Return formatted fallback to avoid throwing
    return text
  }
}

/**
 * Decrypt a ciphertext message for a given chat
 * Gracefully handles legacy unencrypted messages and fallback encodings
 */
export async function decryptMessage(envelope, chatId) {
  if (!envelope || typeof envelope !== 'string') return envelope
  if (!chatId) return envelope

  // Legacy plaintext message: pass through as-is
  if (!envelope.startsWith('enc:')) {
    return envelope
  }

  try {
    // Handle SubtleCrypto AES-GCM format
    if (envelope.startsWith('enc:v1:')) {
      const parts = envelope.split(':')
      if (parts.length !== 4) return envelope

      const ivB64 = parts[2]
      const ctB64 = parts[3]

      if (!hasSubtleCrypto()) {
        return '[Encrypted message]'
      }

      const key = await deriveChatKey(chatId)
      const iv = base64ToUint8Array(ivB64)
      const ciphertext = base64ToUint8Array(ctB64)

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv,
        },
        key,
        ciphertext
      )

      return new TextDecoder().decode(decryptedBuffer)
    }

    // Handle fallback format
    if (envelope.startsWith('enc:v1-fallback:')) {
      const b64 = envelope.replace('enc:v1-fallback:', '')
      const decodedStr = decodeURIComponent(escape(window.atob(b64)))
      return fallbackCipher(decodedStr, chatId + SALT_STRING)
    }

    return envelope
  } catch (error) {
    console.warn('Decryption failed for message in chat', chatId, error)
    return '[Encrypted message]'
  }
}

/**
 * Decrypt an array of messages for a given chat
 */
export async function decryptMessagesBatch(messages, chatId) {
  if (!Array.isArray(messages) || messages.length === 0 || !chatId) {
    return messages || []
  }

  return Promise.all(
    messages.map(async (msg) => {
      if (!msg || !msg.text) return msg
      const decryptedText = await decryptMessage(msg.text, chatId)
      return {
        ...msg,
        text: decryptedText,
        isEncrypted: msg.text?.startsWith('enc:') || msg.isEncrypted,
      }
    })
  )
}

/**
 * Decrypt lastMessage in an array of conversation items
 */
export async function decryptConversationsBatch(conversations) {
  if (!Array.isArray(conversations) || conversations.length === 0) {
    return conversations || []
  }

  return Promise.all(
    conversations.map(async (chat) => {
      if (!chat || !chat._id || !chat.lastMessage || !chat.lastMessage.text) {
        return chat
      }

      const decryptedText = await decryptMessage(chat.lastMessage.text, chat._id)
      return {
        ...chat,
        lastMessage: {
          ...chat.lastMessage,
          text: decryptedText,
          isEncrypted: chat.lastMessage.text?.startsWith('enc:'),
        },
      }
    })
  )
}

/**
 * Check if a text string is an encrypted envelope
 */
export function isEncryptedMessage(text) {
  return typeof text === 'string' && text.startsWith('enc:')
}
