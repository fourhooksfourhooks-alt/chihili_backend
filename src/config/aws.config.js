import { S3Client } from "@aws-sdk/client-s3";
import { config } from "./env.js";

if (
  config.aws_region === undefined ||
  config.aws_accesskeyId === undefined ||
  config.aws_secret_accesskeyId === undefined ||
  config.aws_bucket_name === undefined
) {
  console.error("❌ Missing AWS env vars");
  throw new Error("Missing AWS config values");
}

const s3 = new S3Client({
  region: config.aws_region,
  credentials: {
    accessKeyId: config.aws_accesskeyId,
    secretAccessKey: config.aws_secret_accesskeyId,
  },
});

export { s3 };
