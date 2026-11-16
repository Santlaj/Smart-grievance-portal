const { runHandler } = require("../../../lib/nextAdapter");
const { handleTranslateText } = require("../../../controllers/translateController");

export async function POST(request, context) {
  return runHandler(handleTranslateText, request, context, { protect: false });
}

export async function OPTIONS(request, context) {
  return runHandler(() => {}, request, context);
}
