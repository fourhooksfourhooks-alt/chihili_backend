import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load environment variables before defining config
const NODE_ENV = process.env.NODE_ENV || "development";

if (NODE_ENV !== "production") {
  const envFile = path.resolve(process.cwd(), `.env.${NODE_ENV}`);

  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
    console.log(`Loaded environment from ${envFile}`);
  } else {
    const fallbackEnv = path.resolve(process.cwd(), ".env");
    dotenv.config({ path: fallbackEnv });
    console.warn(`${envFile} not found. Falling back to default .env`);
  }
}
export const config = {
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 8000,
  mongoUri: process.env.MONGO_URI || "mongodb+srv://vanurtechmedia:nF27a31JW2yVCraP@cluster0.36xhbys.mongodb.net/chihili?retryWrites=true&w=majority",

  // phonepe
  phonepe_client: process.env.PHONEPE_CLIENT_ID,
  phonepe_secret: process.env.PHONEPE_CLIENT_SECRET,

  // Backward-compatible defaults
  jwtSecret: process.env.JWT_SECRET || "your-super-secret-jwt-key",
  jwtExpire: process.env.JWT_EXPIRE || "7d",

  // Access/Refresh token configuration
  jwtAccessSecret:
    process.env.JWT_ACCESS_SECRET ||
    process.env.JWT_SECRET ||
    "your-super-secret-jwt-key",
  jwtAccessExpire: process.env.JWT_ACCESS_EXPIRE || "1d",
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET ||
    process.env.JWT_SECRET ||
    "your-super-secret-jwt-key",
  jwtRefreshExpire: process.env.JWT_REFRESH_EXPIRE || "7d",

  // Access token cookie configuration
  accessCookieName: process.env.ACCESS_COOKIE_NAME || "accessToken",
  accessCookieDomain: process.env.ACCESS_COOKIE_DOMAIN || undefined,
  accessCookieSecure:
    (process.env.ACCESS_COOKIE_SECURE || "false").toLowerCase() === "true",
  accessCookieSameSite: process.env.ACCESS_COOKIE_SAMESITE || "lax",

  // Refresh token cookie configuration
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || "refreshToken",
  refreshCookieDomain: process.env.REFRESH_COOKIE_DOMAIN || undefined,
  refreshCookieSecure:
    (process.env.REFRESH_COOKIE_SECURE || "false").toLowerCase() === "true",
  refreshCookieSameSite: process.env.REFRESH_COOKIE_SAMESITE || "lax",

  // Firebase configuration
  firebaseServiceAccount: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,

  // Other configurations
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:3000",
  ],

  // MSG91 configuration
  msg91AuthKey: process.env.MSG91_AUTHKEY,
  msg91Domain: process.env.MSG91_DOMAIN,
  msg91EmailFrom: process.env.MSG91_EMAIL_FROM,
  msg91EmailOtpTemplateId: process.env.MSG91_EMAIL_OTP_TEMPLATE_ID,
  msg91SMSOtptemplateId: process.env.MSG91_SMS_OTP_TEMPLATE_ID,
  msg91AdminOrderTemplateId: process.env.MSG91_ADMIN_ORDER_TEMPLATE_ID,
  adminEmail: process.env.ADMIN_EMAIL,
  companyName: process.env.COMPANY_NAME,

  // aws-creadentials
  aws_region: process.env.AWS_REGION,
  aws_accesskeyId: process.env.AWS_ACCESS_KEY_ID,
  aws_secret_accesskeyId: process.env.AWS_SECRET_ACCESS_KEY,
  aws_bucket_name: process.env.AWS_BUCKET_NAME,
  // Storage abstraction
  storageDriver: process.env.STORAGE_DRIVER || "s3",
  awsBucketBaseFolder: process.env.AWS_BUCKET_BASE_FOLDER || "prod",

  // Logging configuration
  enableHttpLogging:
    (process.env.ENABLE_HTTP_LOGGING || "true").toLowerCase() === "true",
  devLogLevel: process.env.DEV_LOG_LEVEL || "info",
  prodLogLevel: process.env.PROD_LOG_LEVEL || "warn",
};
