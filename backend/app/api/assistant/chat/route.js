const { runHandler } = require("../../../../lib/nextAdapter");
const { chatWithCivicSaathi } = require("../../../../controllers/assistantController");

export async function POST(request, context) {
  // protect: false allows guest/public users to ask questions,
  // while authenticated users' tokens are still extracted to securely track their complaints
  return runHandler(chatWithCivicSaathi, request, context, { protect: false });
}

export async function GET(request, context) {
  return runHandler(chatWithCivicSaathi, request, context, { protect: false });
}

export async function OPTIONS(request, context) {
  return runHandler(() => {}, request, context);
}
