import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Copy manifest.json to dist folder
const manifestSrc = path.join(__dirname, 'manifest.json');
const manifestDest = path.join(__dirname, 'dist', 'manifest.json');

fs.copyFileSync(manifestSrc, manifestDest);
console.log('✓ manifest.json copied to dist/');

