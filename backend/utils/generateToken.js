const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  const secret = process.env.JWT_SECRET;
  if (!secret || (process.env.NODE_ENV === "production" && secret.length < 32)) {
    throw new Error("JWT_SECRET must be set to a random value of at least 32 characters.");
  }

  return jwt.sign({ id }, secret, {
    expiresIn: "7d",
  });
};

module.exports = generateToken;
