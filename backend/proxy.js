import { NextResponse } from "next/server";

export function proxy(request) {
  const origin = request.headers.get("origin");
  const configuredOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowOrigin = process.env.NODE_ENV === "production"
    ? configuredOrigins.includes(origin) ? origin : null
    : origin || "*";
  const headers = new Headers({
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Vary": "Origin",
  });

  if (allowOrigin) {
    headers.set("Access-Control-Allow-Origin", allowOrigin);
  }

  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers,
    });
  }

  const response = NextResponse.next();
  headers.forEach((value, key) => response.headers.set(key, value));
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
