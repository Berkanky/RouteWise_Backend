const crypto = require("crypto");
require("dotenv").config();

var algorithm = 'aes-256-cbc';
var IV_LENGTH = 16;

var keyString = process.env.ENCRYPTION_KEY;
if (!keyString) {
  throw new Error("ENCRYPTION_KEY .env dosyasında bulunamadı!");
}

var key = Buffer.from(keyString, 'hex');
if (key.length !== 32) {
  throw new Error(`Geçersiz ENCRYPTION_KEY uzunluğu: ${key.length} byte. 32 byte olmalı.`);
}

function aes256Encrypt(plainText) {
  var iv = crypto.randomBytes(IV_LENGTH);
  var cipher = crypto.createCipheriv(algorithm, key, iv);
  var plainTextBuffer = Buffer.from(plainText, 'utf8');
  var encrypted = cipher.update(plainTextBuffer);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  var combined = Buffer.concat([iv, encrypted]);
  return combined.toString('base64');
}

module.exports = aes256Encrypt;