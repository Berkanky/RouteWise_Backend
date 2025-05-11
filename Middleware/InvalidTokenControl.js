const Token = require("../Schemas/InvalidToken");

async function InvalidTokenControlFunction(req, res, next) {
  var { id } = req.params;
  var token = req.get("Authorization") && req.get("Authorization").split(" ")[1];
  
  if(!token) return res.status(401).json({ message: " Authorization token is required." });

  var tokenFilter = { UserId: id, JWTToken: token };
  var tokens = await Token.find(tokenFilter);
  
  if (tokens.length)  return res.status(401).json({ message: " Invalid or expired token. Please log in again." });
  next();
}

module.exports = InvalidTokenControlFunction;