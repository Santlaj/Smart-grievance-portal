const { runHandler } = require("../../../../lib/nextAdapter");
const { createEvidenceUpload } = require("../../../../controllers/uploadController");

export async function POST(request, context) {
  return runHandler(createEvidenceUpload, request, context, { protect: true });
}
