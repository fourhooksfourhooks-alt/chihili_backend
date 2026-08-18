
import admin from "firebase-admin";
import { config } from './env.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load service account from file
let serviceAccount;
try {
  const serviceAccountPath = join(__dirname, '../../public/chihili-firebase-adminsdk-fbsvc-74c9913603.json');
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch (error) {
  console.error('Failed to load Firebase service account:', error);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON 
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) 
        : serviceAccount
    ),
  });
}

export default admin;
