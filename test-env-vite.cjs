const { loadEnv } = require('vite');
const path = require('path');

const mode = 'development';
const envDir = path.resolve(__dirname, '../');
const env = loadEnv(mode, envDir, '');

console.log('Loaded VITE_API_URL:', env.VITE_API_URL);
console.log('Loaded VITE_WS_URL:', env.VITE_WS_URL);
