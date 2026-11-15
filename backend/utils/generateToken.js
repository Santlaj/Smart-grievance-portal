const jwt = require("jsonwebtoken");

const DEFAULT_DEV_SECRET = "smart_grievance_production_jwt_secret_key_2026_super_secure_random_seed_9876543210";

const generateToken = (id) => {
  const isProduction = process.env.NODE_ENV === "production";
  const secret = process.env.JWT_SECRET || (!isProduction ? DEFAULT_DEV_SECRET : "");
  if (!secret || (isProduction && secret.length < 32)) {
    throw new Error("JWT_SECRET must be set to a random value of at least 32 characters.");
  }

  return jwt.sign({ id }, secret, {
    expiresIn: "7d",
  });
};

module.exports = generateToken;
