import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, 'node_modules', '@ffmpeg', 'core', 'dist', 'esm');
const targetDir = path.join(__dirname, 'public', 'ffmpeg-core');

if (!fs.existsSync(sourceDir)) {
  console.error('Hittar inte @ffmpeg/core. Kör npm install först.');
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });

for (const file of ['ffmpeg-core.js', 'ffmpeg-core.wasm', 'ffmpeg-core.worker.js']) {
  fs.copyFileSync(path.join(sourceDir, file), path.join(targetDir, file));
  console.log(`Kopierade ${file}`);
}
