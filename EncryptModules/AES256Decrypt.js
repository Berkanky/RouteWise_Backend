const crypto = require("crypto");
require("dotenv").config();

var algorithm = "aes-256-cbc";
var IV_LENGTH = 16;

var keyString = process.env.ENCRYPTION_KEY;
if (!keyString) {
  throw new Error("ENCRYPTION_KEY .env dosyasında bulunamadı!");
}

var key = Buffer.from(keyString, "hex");
if (key.length !== 32) {
  throw new Error(
    `Geçersiz ENCRYPTION_KEY uzunluğu: ${key.length} byte. 32 byte olmalı.`
  );
}

function aes256Decrypt(base64StoredData) {
  try {
    var combinedBuffer = Buffer.from(base64StoredData, "base64");

    if (combinedBuffer.length < IV_LENGTH) {
      throw new Error("Geçersiz şifreli veri: IV çıkarılamayacak kadar kısa.");
    }

    var iv = combinedBuffer.slice(0, IV_LENGTH);
    var ciphertext = combinedBuffer.slice(IV_LENGTH);
    var decipher = crypto.createDecipheriv(algorithm, key, iv);
    var decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Deşifreleme hatası:", error.message);
    return null;
  }
}

module.exports = aes256Decrypt;