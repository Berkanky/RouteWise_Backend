const bcrypt = require('bcrypt');

async function BCRYPEncrypt(plainPassword) {
  var saltRounds = 10;
  try {
    var hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
    return hashedPassword;
  } catch (error) {
    throw new Error("Şifre güvenli bir şekilde saklanamadı.");
  }
}

module.exports = BCRYPEncrypt;