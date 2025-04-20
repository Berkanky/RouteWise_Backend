// generateKey.js
const crypto = require('crypto');

// 32 byte (256 bit) rastgele veri oluştur
const keyBytes = crypto.randomBytes(32);

// Hex formatında yazdır (64 karakter)
const keyHex = keyBytes.toString('hex');
console.log("AES 256 Key (Hex):", keyHex);

// Alternatif: Base64 formatında yazdır (yaklaşık 44 karakter)
const keyBase64 = keyBytes.toString('base64');
console.log("AES 256 Key (Base64):", keyBase64);