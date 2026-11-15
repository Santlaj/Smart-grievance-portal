const { NextResponse } = require("next/server");
const connectDB = require("../../config/db");
const { getIsConnected } = require("../../config/db");
const { getCorsHeaders } = require("../../lib/cors");

// Fast keep-alive health route for Render (prevents 15-minute inactivity spin-down)
export async function GET(request) {
  const headers = getCorsHeaders(request?.headers?.get("origin"));
  
  let dbStatus = "connected";
  let dbError = null;

  if (!getIsConnected()) {
    try {
      await connectDB();
      dbStatus = getIsConnected() ? "connected" : "connecting";
    } catch (err) {
      dbStatus = "disconnected";
      dbError = err.message;
    }
  }

  return NextResponse.json(
    {
      status: "healthy",
      service: "smart-grievance-backend",
      uptimeSeconds: Math.floor(process.uptime()),
      database: dbStatus,
      ...(dbError ? { error: dbError } : {}),
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

// Support lightweight HEAD requests used by pinging tools (e.g., UptimeRobot, cron-job.org)
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
