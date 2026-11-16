const { runHandler } = require("../../../../lib/nextAdapter");
const { forgotPassword } = require("../../../../controllers/authController");

export async function POST(request, context) {
  return runHandler(forgotPassword, request, context);
}
