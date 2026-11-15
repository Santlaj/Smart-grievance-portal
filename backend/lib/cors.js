function getCorsHeaders(origin) {
  const configuredOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  let allowedOrigin = origin || "*";
  if (process.env.NODE_ENV === "production" && configuredOrigins.length > 0) {
    if (configuredOrigins.includes("*")) {
      allowedOrigin = origin || "*";
    } else if (origin && configuredOrigins.includes(origin)) {
      allowedOrigin = origin;
    } else {
      allowedOrigin = null;
    }
  }

  const headers = {
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };

  if (allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
  }

  return headers;
}

module.exports = { getCorsHeaders };
