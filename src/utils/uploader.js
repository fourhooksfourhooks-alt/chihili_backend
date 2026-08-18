import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../config/aws.config.js";
import { config } from "../config/env.js";
import path from 'path';


const DEFAULT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const DEFAULT_IMAGE_EXTS = [".jpeg", ".jpg", ".png", ".webp"];

const DEFAULT_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const DEFAULT_DOCUMENT_EXTS = [".pdf", ".doc", ".docx"];

function ensureAllowed(file, allowedTypes,allowedExts, maxSizeMB = 10) {
  if (!file || !file.originalname || !file.buffer) {
    throw new Error("Invalid file payload");
  }
  const ext = path.extname(file.originalname).toLowerCase();
  // Accept if either mimetype or extension matches the allow-list
  const hasAllowedType = file.mimetype ? allowedTypes.includes(file.mimetype) : false;
  const hasAllowedExt = allowedExts.includes(ext);
  if (!hasAllowedType && !hasAllowedExt) {
    throw new Error("Invalid file type");
  }

  const fileSize = typeof file.size === 'number' ? file.size : (file.buffer?.length || 0);
  if (!fileSize) {
    throw new Error("Invalid file payload");
  }
  if (fileSize > maxSizeMB * 1024 * 1024) {
    throw new Error(`File too large. Max allowed size is ${maxSizeMB} MB`);
  }
}

function detectContentType(file) {
  if (file?.mimetype) return file.mimetype;
  const ext = path.extname(file?.originalname || "").toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".pdf":
      return "application/pdf";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
}

function buildObjectKey(folder, originalName) {
  const safeFolder = [config.awsBucketBaseFolder, folder]
    .filter(Boolean)
    .join("/");
  const timestamp = Date.now();
  return `${safeFolder}/${timestamp}-${originalName}`;
}

async function putToS3(key, file) {
  const put = new PutObjectCommand({
    Bucket: config.aws_bucket_name,
    Key: key,
    Body: file.buffer,
    ContentType: detectContentType(file),
    // ACL: "public-read",
  });
  try {
    await s3.send(put);
  } catch (err) {
    console.error("S3 upload failed", err);
    throw new Error("File upload failed");
  }  
  const baseUrl = `https://${config.aws_bucket_name}.s3.${config.aws_region}.amazonaws.com`;
  return `${baseUrl}/${key}`;
}

function extractObjectKey(input) {
  if (!input) {
    throw new Error("Invalid key or URL");
  }
  try {
    const url = new URL(input);
    return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    return input.replace(/^\/+/, "");
  }
}

async function deleteFromS3(keyOrUrl) {
  const key = extractObjectKey(keyOrUrl);
  const del = new DeleteObjectCommand({
    Bucket: config.aws_bucket_name,
    Key: key,
  });
  try {
    await s3.send(del);
  } catch (err) {
    console.error("S3 delete failed", err);
    throw new Error("File delete failed");
  }
  return true;
}

export async function uploadFile(file, options = {}) {
  const {
    folder = "uploads",
    allowedTypes = [...DEFAULT_IMAGE_TYPES, ...DEFAULT_DOCUMENT_TYPES],
    allowedExts = [...DEFAULT_IMAGE_EXTS, ...DEFAULT_DOCUMENT_EXTS],
    maxSizeMB = 20,
  } = options;

  ensureAllowed(file, allowedTypes, allowedExts, maxSizeMB);

  const key = buildObjectKey(folder, file.originalname); 

  // Future-proof: switch by storage driver
  switch ((config.storageDriver || "s3").toLowerCase()) {
    case "s3":
      return putToS3(key, file);
    default:
      throw new Error(`Unsupported storage driver: ${config.storageDriver}`);
  }
}

export const uploadImage = (file, folder = "images", maxSizeMB = 5) =>
  uploadFile(file, { folder, allowedTypes: DEFAULT_IMAGE_TYPES, allowedExts: DEFAULT_IMAGE_EXTS, maxSizeMB });

export const uploadDocument = (file, folder = "documents", maxSizeMB = 20) =>
  uploadFile(file, { folder, allowedTypes: DEFAULT_DOCUMENT_TYPES, allowedExts: DEFAULT_DOCUMENT_EXTS, maxSizeMB });

export async function deleteFile(keyOrUrl) {
  switch ((config.storageDriver || "s3").toLowerCase()) {
    case "s3":
      return deleteFromS3(keyOrUrl);
    default:
      throw new Error(`Unsupported storage driver: ${config.storageDriver}`);
  }
}


