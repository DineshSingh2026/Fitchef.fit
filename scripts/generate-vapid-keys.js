/**
 * Generate VAPID keys for Web Push.
 * Run: node scripts/generate-vapid-keys.js
 * Add output to .env: VAPID_PUBLIC_KEY=... and VAPID_PRIVATE_KEY=...
 */
const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();
console.log('Add these to your .env file:\n');
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
