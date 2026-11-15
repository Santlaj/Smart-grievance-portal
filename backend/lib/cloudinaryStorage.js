const cloudinary = require("cloudinary").v2;
const { randomUUID } = require("node:crypto");

const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
const IMAGE_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
const CONTENT_TYPE_FORMATS = Object.fromEntries(
  Object.entries(IMAGE_TYPES).map(([format, contentType]) => [contentType, format])
);

function getCloudinaryConfig() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  return { cloudName: CLOUDINARY_CLOUD_NAME, apiKey: CLOUDINARY_API_KEY };
}

function isStorageKey(value) {
  return typeof value === "string"
    && /^smart-grievance\/(evidence|resolution)\/[a-f0-9]{24}\/[a-f0-9-]{36}$/i.test(value);
}

function validateUpload({ userId, role, contentType, size, purpose }) {
  const format = CONTENT_TYPE_FORMATS[contentType];
  if (!format) {
    throw new Error("Only JPEG, PNG, and WebP image uploads are supported.");
  }
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_IMAGE_SIZE) {
    throw new Error(`Image size must be between 1 byte and ${MAX_IMAGE_SIZE} bytes.`);
  }
  if (!["evidence", "resolution"].includes(purpose)) {
    throw new Error("Upload purpose must be evidence or resolution.");
  }
  const normalizedRole = String(role).toLowerCase();
  if (purpose === "evidence" && !["client", "citizen"].includes(normalizedRole)) {
    throw new Error("Only citizens can upload complaint evidence.");
  }
  if (purpose === "resolution" && !["officer", "admin"].includes(normalizedRole)) {
    throw new Error("Only officers can upload resolution evidence.");
  }
  if (!/^[a-f0-9]{24}$/i.test(String(userId))) {
    throw new Error("The authenticated user ID is invalid.");
  }
  return format;
}

function createUploadSignature({ userId, role, contentType, size, purpose }) {
  validateUpload({ userId, role, contentType, size, purpose });
  const { cloudName, apiKey } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `smart-grievance/${purpose}/${userId}/${randomUUID()}`;
  const params = { public_id: publicId, timestamp, type: "authenticated" };
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    fields: {
      api_key: apiKey,
      ...params,
      signature,
    },
  };
}

async function uploadAuthorized({ userId, role, key, purpose }) {
  if (!isStorageKey(key) || !key.startsWith(`smart-grievance/${purpose}/${userId}/`)) {
    throw new Error("The uploaded image does not belong to the authenticated user.");
  }
  if (purpose === "evidence" && !["client", "citizen"].includes(String(role).toLowerCase())) {
    throw new Error("Only citizens can submit complaint evidence.");
  }
  if (purpose === "resolution" && !["officer", "admin"].includes(String(role).toLowerCase())) {
    throw new Error("Only officers can submit resolution evidence.");
  }
}

const resourceCache = new Map();

async function getCloudinaryResource(publicId) {
  if (!isStorageKey(publicId)) {
    throw new Error("Invalid Cloudinary image identifier.");
  }
  if (resourceCache.has(publicId)) {
    return resourceCache.get(publicId);
  }
  getCloudinaryConfig();
  const resource = await cloudinary.api.resource(publicId, {
    resource_type: "image",
    type: "authenticated",
  });
  if (
    resource.public_id !== publicId
    || resource.resource_type !== "image"
    || resource.type !== "authenticated"
    || !IMAGE_TYPES[resource.format]
    || !Number.isSafeInteger(resource.bytes)
    || resource.bytes <= 0
    || resource.bytes > MAX_IMAGE_SIZE
  ) {
    throw new Error("The uploaded image is empty, unsupported, or exceeds the size limit.");
  }
  resourceCache.set(publicId, resource);
  return resource;
}

async function assertOwnedUpload({ userId, role, key, purpose }) {
  uploadAuthorized({ userId, role, key, purpose });
  await getCloudinaryResource(key);
}

async function getImageDataUrl(key) {
  const resource = await getCloudinaryResource(key);
  const downloadUrl = cloudinary.utils.private_download_url(key, resource.format, {
    resource_type: "image",
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + 300,
  });
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error("Could not retrieve the uploaded image from Cloudinary.");
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_SIZE) {
    throw new Error("Stored image is empty or exceeds the supported size.");
  }
  return `data:${IMAGE_TYPES[resource.format]};base64,${bytes.toString("base64")}`;
}

async function signImageKeys(value) {
  if (Array.isArray(value)) {
    return Promise.all(value.map(signImageKeys));
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const plain = typeof value.toJSON === "function" ? value.toJSON() : value;
  if (!plain || typeof plain !== "object") {
    return plain;
  }

  const entries = await Promise.all(
    Object.entries(plain).map(async ([key, item]) => {
      if (["image", "resolutionImage"].includes(key) && isStorageKey(item)) {
        try {
          const resource = await getCloudinaryResource(item);
          const url = cloudinary.utils.private_download_url(item, resource.format, {
            resource_type: "image",
            type: "authenticated",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          });
          return [key, url];
        } catch (err) {
          console.warn(`Could not sign image key "${item}":`, err.message);
          return [key, item];
        }
      }
      return [key, await signImageKeys(item)];
    })
  );
  return Object.fromEntries(entries);
}

module.exports = {
  MAX_IMAGE_SIZE,
  assertOwnedUpload,
  createUploadSignature,
  getImageDataUrl,
  isStorageKey,
  signImageKeys,
  uploadAuthorized,
};
