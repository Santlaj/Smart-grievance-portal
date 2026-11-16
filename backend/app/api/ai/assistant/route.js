const { runHandler } = require("../../../../lib/nextAdapter");
const { chatWithCivicSaathi } = require("../../../../controllers/assistantController");

export async function POST(request, context) {
  // protect: false allows guest/public users to ask questions too,
  // while authenticated users' tokens are still extracted to track their personal complaints!
  return runHandler(chatWithCivicSaathi, request, context, { protect: false });
}

export async function GET(request, context) {
  return runHandler(chatWithCivicSaathi, request, context, { protect: false });
}

export async function OPTIONS(request, context) {
  return runHandler(() => {}, request, context);
}
