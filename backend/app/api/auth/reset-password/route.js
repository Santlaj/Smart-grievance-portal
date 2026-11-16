const { runHandler } = require("../../../../lib/nextAdapter");
const { resetPassword } = require("../../../../controllers/authController");

export async function POST(request, context) {
  return runHandler(resetPassword, request, context);
}
