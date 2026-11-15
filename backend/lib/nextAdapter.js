const { NextResponse } = require("next/server");
const jwt = require("jsonwebtoken");
const connectDB = require("../config/db");
const User = require("../models/User");
const { getIsConnected } = require("../config/db");
const { getCorsHeaders } = require("./cors");
const { signImageKeys } = require("./cloudinaryStorage");

const DEFAULT_MAX_BODY_BYTES = process.env.NODE_ENV === "production" ? 1024 * 1024 : 24 * 1024 * 1024;
const MAX_REQUEST_BODY_BYTES = Number(process.env.MAX_REQUEST_BODY_BYTES) || DEFAULT_MAX_BODY_BYTES;

async function readRequestBody(request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BODY_BYTES) {
    throw Object.assign(new Error("Request body exceeds the allowed size."), { status: 413 });
  }

  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_REQUEST_BODY_BYTES) {
      await reader.cancel();
      throw Object.assign(new Error("Request body exceeds the allowed size."), { status: 413 });
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

async function authenticateRequest(request) {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { error: "Not authorized, no token provided", status: 401 };
  }

  const token = authHeader.split(" ")[1];
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret || (process.env.NODE_ENV === "production" && secret.length < 32)) {
      throw new Error("JWT_SECRET is not configured securely.");
    }
    const decoded = jwt.verify(token, secret);
    await connectDB();

    let user = null;
    if (getIsConnected()) {
      try {
        user = await User.findById(decoded.id).select("-password");
      } catch {
        user = null;
      }
    }

    if (!user) {
      const { inMemoryUsers } = require("../controllers/authController");
      const mem = inMemoryUsers.find((u) => String(u._id) === String(decoded.id));
      if (mem) {
        user = {
          _id: mem._id,
          name: mem.name,
          email: mem.email,
          role: mem.role,
          department: mem.department,
        };
      }
    }

    if (!user) {
      return { error: "Not authorized, user not found", status: 401 };
    }

    return { user };
  } catch (err) {
    return { error: "Not authorized, invalid token", status: 401 };
  }
}

async function runHandler(handler, request, context = {}, options = {}) {
  const corsHeaders = getCorsHeaders(request.headers.get("origin"));

  // If OPTIONS preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 200, headers: corsHeaders });
  }

  try {
    await connectDB();
  } catch (error) {
    console.error("API database connection failed:", error.message);
    return NextResponse.json(
      { message: "The service is temporarily unavailable." },
      { status: 503, headers: corsHeaders }
    );
  }

  let user = null;
  if (options.protect) {
    const authResult = await authenticateRequest(request);
    if (authResult.error) {
      return NextResponse.json({ message: authResult.error }, { status: authResult.status, headers: corsHeaders });
    }
    user = authResult.user;

    if (options.role) {
      const userRole = (user.role || "").toLowerCase();
      if (options.role === "client" && userRole !== "client" && userRole !== "citizen") {
        return NextResponse.json({ message: "Access denied. Citizens only." }, { status: 403, headers: corsHeaders });
      }
      if (options.role === "officer" && userRole !== "officer" && userRole !== "admin") {
        return NextResponse.json({ message: "Access denied. Government Officers only." }, { status: 403, headers: corsHeaders });
      }
      if (options.role === "admin" && userRole !== "admin") {
        return NextResponse.json({ message: "Access denied. Admins only." }, { status: 403, headers: corsHeaders });
      }
    }
  } else {
    // Optional auth extraction: if client provides Bearer token, authenticate safely
    const authHeader = request.headers.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      try {
        const authResult = await authenticateRequest(request);
        if (!authResult.error && authResult.user) {
          user = authResult.user;
        }
      } catch {
        // ignore optional auth errors
      }
    }
  }

  // Parse body
  let body = {};
  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    try {
      const text = await readRequestBody(request);
      body = text ? JSON.parse(text) : {};
    } catch (error) {
      const status = error.status || 400;
      return NextResponse.json(
        { message: status === 413 ? error.message : "Request body must contain valid JSON." },
        { status, headers: corsHeaders }
      );
    }
  }

  // Parse query params
  const urlObj = new URL(request.url);
  const query = Object.fromEntries(urlObj.searchParams.entries());

  // Parse route params (handle async params in Next.js 15+)
  const params = context.params ? await context.params : {};

  // Construct Express-compatible mock req and res
  let responseData = null;
  let responseStatus = 200;
  let headersSent = false;

  const mockReq = {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    body,
    query,
    params,
    user,
    get: (name) => request.headers.get(name),
  };

  return new Promise(async (resolve) => {
    const mockRes = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        if (!headersSent) {
          headersSent = true;
          responseData = data;
          const safeData = process.env.NODE_ENV === "production" && responseStatus >= 500
            ? { message: "An internal server error occurred." }
            : data;
          signImageKeys(safeData)
            .then((signedData) => resolve(NextResponse.json(signedData, { status: responseStatus, headers: corsHeaders })))
            .catch((err) => {
              console.error("Evidence URL signing error:", err);
              resolve(NextResponse.json(
                { message: "Could not prepare complaint evidence for display." },
                { status: 503, headers: corsHeaders }
              ));
            });
        }
        return this;
      },
      send(data) {
        if (!headersSent) {
          headersSent = true;
          responseData = data;
          if (typeof data === "object") {
            resolve(NextResponse.json(data, { status: responseStatus, headers: corsHeaders }));
          } else {
            resolve(new NextResponse(data, { status: responseStatus, headers: corsHeaders }));
          }
        }
        return this;
      },
      setHeader() {
        return this;
      },
    };

    try {
      await handler(mockReq, mockRes);
    } catch (err) {
      console.error("Handler error:", err);
      if (!headersSent) {
        headersSent = true;
        resolve(NextResponse.json(
          { message: process.env.NODE_ENV === "production" ? "An internal server error occurred." : err.message || "Internal server error" },
          { status: 500, headers: corsHeaders }
        ));
      }
    }
  });
}

module.exports = {
  runHandler,
  authenticateRequest,
  connectDB,
};
