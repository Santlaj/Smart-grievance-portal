const { NextResponse } = require("next/server");
const connectDB = require("../../../config/db");
const { getIsConnected } = require("../../../config/db");
const { getCorsHeaders } = require("../../../lib/cors");

export async function GET(request) {
  const headers = getCorsHeaders(request?.headers?.get("origin"));
  
  let databaseReady = getIsConnected();
  if (!databaseReady) {
    try {
      await connectDB();
      databaseReady = getIsConnected();
    } catch (err) {
      console.warn("Health check DB connect attempt:", err.message);
    }
  }

  return NextResponse.json(
    {
      status: "healthy",
      service: "smart-grievance-backend",
      database: databaseReady ? "connected" : "connecting",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        ...headers,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

export async function HEAD(request) {
  const headers = getCorsHeaders(request?.headers?.get("origin"));
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...headers,
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function OPTIONS(request) {
  const headers = getCorsHeaders(request?.headers?.get("origin"));
  return new NextResponse(null, { status: 204, headers });
}
