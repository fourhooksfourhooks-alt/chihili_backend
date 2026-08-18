// lib/otp.js
import crypto from "crypto";

export function generateNumericOtp(digits = 6) {
  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;
  // crypto-secure
  const n = min + Math.floor((crypto.randomBytes(6).readUIntBE(0, 6) / (2 ** 48)) * (max - min + 1));
  return String(n).padStart(digits, "0").slice(0, digits);
}

export function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}
