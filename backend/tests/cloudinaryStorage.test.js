const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const {
  createUploadSignature,
  isStorageKey,
  signImageKeys,
  uploadAuthorized,
} = require("../lib/cloudinaryStorage");

const userId = "660000000000000000000001";

test("accepts only generated Cloudinary public ID shapes", () => {
  assert.equal(isStorageKey(`smart-grievance/evidence/${userId}/550e8400-e29b-41d4-a716-446655440000`), true);
  assert.equal(isStorageKey(`smart-grievance/resolution/${userId}/550e8400-e29b-41d4-a716-446655440000`), true);
  assert.equal(isStorageKey(`smart-grievance/evidence/${userId}/../../private`), false);
  assert.equal(isStorageKey("https://storage.example/image.jpg"), false);
});

test("requires uploaded objects to belong to the authenticated user", async () => {
  const key = `smart-grievance/evidence/${userId}/550e8400-e29b-41d4-a716-446655440000`;
  await assert.rejects(
    uploadAuthorized({ userId: "660000000000000000000002", role: "client", key, purpose: "evidence" }),
    /does not belong/
  );
});

test("enforces upload purpose against the caller role", async () => {
  const key = `smart-grievance/resolution/${userId}/550e8400-e29b-41d4-a716-446655440000`;
  await assert.rejects(
    uploadAuthorized({ userId, role: "client", key, purpose: "resolution" }),
    /Only officers/
  );
});

test("creates authenticated upload signatures restricted to the caller and purpose", () => {
  process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  process.env.CLOUDINARY_API_KEY = "test-api-key";
  process.env.CLOUDINARY_API_SECRET = "test-api-secret";

  const upload = createUploadSignature({
    userId,
    role: "citizen",
    contentType: "image/png",
    size: 1024,
    purpose: "evidence",
  });
  assert.match(upload.uploadUrl, /test-cloud\/image\/upload$/);
  assert.equal(upload.fields.api_key, "test-api-key");
  assert.equal(upload.fields.type, "authenticated");
  assert.match(upload.fields.public_id, new RegExp(`^smart-grievance/evidence/${userId}/`));
  assert.ok(upload.fields.signature);
});

test("preserves JSON scalar values such as dates and MongoDB IDs", async () => {
  const id = new mongoose.Types.ObjectId();
  const date = new Date("2026-01-01T00:00:00.000Z");
  assert.deepEqual(await signImageKeys({ id, date }), {
    id: id.toString(),
    date: date.toISOString(),
  });
});
