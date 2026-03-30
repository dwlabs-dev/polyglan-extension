import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getGoogleCredentials() {
  const credPath = path.resolve(__dirname, '../infra/google/credentials.json');
  console.log(`[Test] Attempting to load credentials from: ${credPath}`);
  
  const credFile = readFileSync(credPath, 'utf-8');
  const cred = JSON.parse(credFile);
  
  if (!cred.installed) {
    throw new Error(`Invalid credentials.json format. Expected 'installed' type credentials.`);
  }
  
  console.log(`[Test] Successfully loaded credentials for client_id: ${cred.installed.client_id.substring(0, 10)}...`);
  return cred.installed;
}

try {
  getGoogleCredentials();
  console.log('✅ Auth logic test passed: Version of __dirname is correct and file is readable.');
} catch (error: any) {
  console.error('❌ Auth logic test failed:', error.message);
  process.exit(1);
}
