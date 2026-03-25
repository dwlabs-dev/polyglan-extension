import { getAuthClient } from './lib/google-auth.js';

async function test() {
  console.log('Testing Google Auth Client Re-use...');
  
  console.log('Call 1: Expecting "No cached token" if token.json is missing, or "Loaded cached token" if it exists.');
  const client1 = await getAuthClient();
  
  console.log('\nCall 2: Expecting NO "Loaded cached token" message because it should reuse the in-memory client.');
  const client2 = await getAuthClient();
  
  if (client1 === client2) {
    console.log('\nSUCCESS: Same client instance returned!');
  } else {
    console.error('\nFAILURE: Different client instances returned!');
  }
}

test().catch(console.error);
