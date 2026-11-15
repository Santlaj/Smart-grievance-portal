const { NextResponse } = require("next/server");
const connectDB = require("../../../config/db");
const { getIsConnected } = require("../../../config/db");
const { getCorsHeaders } = require("../../../lib/cors");

export async function GET(request) {
  const headers = getCorsHeaders(request.headers.get("origin"));
  try {
    await connectDB();
    const databaseReady = getIsConnected();
    return NextResponse.json(
      {
        status: databaseReady ? "ok" : "not_ready",
        database: databaseReady ? "connected" : "disconnected",
        timestamp: new Date().toISOString(),
      },
      { status: databaseReady ? 200 : 503, headers }
    );
  } catch (error) {
    console.error("Health check failed:", error.message);
    return NextResponse.json(
      { status: "not_ready", database: "disconnected", timestamp: new Date().toISOString() },
      { status: 503, headers }
    );
  }
}
