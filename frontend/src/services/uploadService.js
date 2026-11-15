import api from "../utils/api";

const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

export async function uploadEvidence(file, purpose) {
  if (!file || !ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image size must be 15 MB or less.");
  }

  if (import.meta.env.DEV) {
    return { image: await readAsDataUrl(file) };
  }

  const { data: upload } = await api.post("/uploads/signature", {
    contentType: file.type,
    size: file.size,
    purpose,
  });
  const formData = new FormData();
  formData.append("file", file);
  for (const [key, value] of Object.entries(upload.fields)) {
    formData.append(key, String(value));
  }
  const response = await fetch(upload.uploadUrl, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error("Image upload failed. Please try again.");
  }

  const uploaded = await response.json();
  if (uploaded.public_id !== upload.fields.public_id || uploaded.type !== "authenticated") {
    throw new Error("Cloudinary returned an unexpected image identifier.");
  }
  return { imageKey: uploaded.public_id };
}
