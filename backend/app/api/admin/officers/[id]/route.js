const { runHandler } = require("../../../../../lib/nextAdapter");
const { updateOfficer, deleteOfficer } = require("../../../../../controllers/adminController");

export async function PUT(request, context) {
  return runHandler(updateOfficer, request, context, { protect: true, role: "admin" });
}

export async function DELETE(request, context) {
  return runHandler(deleteOfficer, request, context, { protect: true, role: "admin" });
}
