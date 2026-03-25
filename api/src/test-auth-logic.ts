import fs from 'node:fs/promises';
import { getAuthClient } from './lib/google-auth.js';
import path from 'node:path';

const TOKEN_PATH = path.join(process.cwd(), '/infra/google/token.json');

async function testLogic() {
  console.log('--- Verifying Logic ---');
  
  // Call 1
  const client1 = await getAuthClient();
  const tokenExistsAfterCall1 = await fs.access(TOKEN_PATH).then(() => true).catch(() => false);
  console.log('Token file exists after call 1:', tokenExistsAfterCall1);
  
  // Call 2
  const client2 = await getAuthClient();
  console.log('Client instance is reused:', client1 === client2);
  
  if (client1 === client2 && tokenExistsAfterCall1) {
    console.log('SUCCESS: Logic verified correctly!');
  } else {
    console.error('FAILURE: Verification failed.');
  }
}

// Since getAuthClient() might block on authenticate(), 
// this script is intended to be run AFTER a manual authentication or if token.json already exists.
// However, the purpose of this task is to ensure it DOES cache and reuse.

testLogic().catch(console.error);
