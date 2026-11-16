const { runHandler } = require("../../../../../lib/nextAdapter");
const { handleTranslateComplaint } = require("../../../../../controllers/translateController");

export async function POST(request, context) {
  return runHandler(handleTranslateComplaint, request, context, { protect: true });
}

export async function OPTIONS(request, context) {
  return runHandler(() => {}, request, context);
}
