const admin = require('firebase-admin');
const path = require('path');

let isInitialized = false;

// 1. Try initializing from Environment Variable (safe for Render/Production)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccountObj = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountObj)
    });
    console.log('Firebase Admin SDK initialized successfully via FIREBASE_SERVICE_ACCOUNT env var');
    isInitialized = true;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK via env variable:', error.message);
  }
}

// 2. If not initialized via env variable, try local service account JSON file
if (!isInitialized) {
  const serviceAccountPath = path.join(__dirname, '../../swift-wallet-b58cb-firebase-adminsdk-fbsvc-d8ac3690f0.json');
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully via local service account JSON');
    isInitialized = true;
  } catch (error) {
    console.warn('Warning: Firebase Admin SDK not initialized (missing local key or wrong path). Google Sign-In will be disabled on the backend.');
  }
}

// Export admin only if successfully initialized, otherwise export null to prevent AppOptionsError crashes
module.exports = isInitialized ? admin : null;
