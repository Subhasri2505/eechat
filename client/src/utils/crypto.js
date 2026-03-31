/**
 * CRYPTO UTILITIES FOR E2EE
 * =========================
 * This module uses the browser's Web Crypto API to handle all encryption and decryption.
 * Hybrid Cryptography Flow:
 * 1. Sender generates a random AES-GCM key (symmetric).
 * 2. Sender encrypts the message with the AES key.
 * 3. Sender encrypts the AES key with the receiver's RSA-OAEP public key (asymmetric).
 * 4. Receiver decrypts the AES key with their RSA private key.
 * 5. Receiver decrypts the message with the decrypted AES key.
 */

// Helper: Convert ArrayBuffer to Base64
export const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

// Helper: Convert Base64 to ArrayBuffer
export const base64ToArrayBuffer = (base64) => {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// 1. Generate RSA Key Pair (RSA-OAEP for encryption/decryption)
export const generateKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );
  return keyPair;
};

// 2. Export Public Key to JWK (to send to server)
export const exportPublicKey = async (publicKey) => {
  const exported = await window.crypto.subtle.exportKey("jwk", publicKey);
  return exported;
};

// 3. Import Public Key from JWK
export const importPublicKey = async (jwk) => {
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
};

// 4. Encrypt Message with AES-GCM
// Generates a random AES key, encrypts message, returns { encryptedMsg, aesKey, iv }
export const encryptWithAES = async (plaintext) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Generate random AES key
  const aesKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  // Generate random IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Encrypt message
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    data
  );

  // Export AES key to raw bytes so it can be encrypted with RSA
  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

  return {
    encryptedMsg: arrayBufferToBase64(encryptedBuffer),
    rawAesKey,
    iv: arrayBufferToBase64(iv),
  };
};

// 5. Encrypt AES Key with Receiver's RSA Public Key
export const encryptAESKeyWithRSA = async (publicKey, rawAesKey) => {
  const encryptedAesKey = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    rawAesKey
  );
  return arrayBufferToBase64(encryptedAesKey);
};

// 6. Decrypt AES Key with own RSA Private Key
export const decryptAESKeyWithRSA = async (privateKey, encryptedAesKeyBase64) => {
  const encryptedAesKeyBuffer = base64ToArrayBuffer(encryptedAesKeyBase64);
  const rawAesKey = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedAesKeyBuffer
  );

  // Import the decrypted raw AES key back into a CryptoKey object
  return await window.crypto.subtle.importKey(
    "raw",
    rawAesKey,
    "AES-GCM",
    true,
    ["decrypt"]
  );
};

// 7. Decrypt Message with AES-GCM
export const decryptWithAES = async (encryptedMsgBase64, aesKey, ivBase64) => {
  const encryptedBuffer = base64ToArrayBuffer(encryptedMsgBase64);
  const iv = base64ToArrayBuffer(ivBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    aesKey,
    encryptedBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
};
