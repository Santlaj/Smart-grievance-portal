const { runHandler } = require("../../../../lib/nextAdapter");
const { getAdminStats } = require("../../../../controllers/adminController");

export async function GET(request, context) {
  return runHandler(getAdminStats, request, context, { protect: true, role: "admin" });
}
