const bcrypt = require('bcrypt');

async function BCRYPCheck(plainPasswordAttempt, hashedPasswordFromDb) {
  try {
    var isMatch = await bcrypt.compare(
      plainPasswordAttempt,
      hashedPasswordFromDb
    );
    return isMatch;
  } catch (error) {
    return false;
  }
};

module.exports = BCRYPCheck;