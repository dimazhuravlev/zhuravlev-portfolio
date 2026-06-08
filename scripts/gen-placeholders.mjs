import sharp from 'sharp';
import { readdir, writeFile, mkdtemp, rm } from 'fs/promises';
import { join, extname } from 'path';
import { tmpdir } from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const IMAGES_DIR = 'public/assets/images';
const VIDEOS_DIR = 'public/assets/videos';
const OUT_FILE = 'src/data/placeholders.json';
const PIXEL_SIZE = 1;

const result = {};

// Images
const images = (await readdir(IMAGES_DIR))
  .filter(f => ['.jpg', '.jpeg', '.png'].includes(extname(f).toLowerCase()))
  .filter(f => f !== 'og-image.png');

for (const file of images) {
  const src = join(IMAGES_DIR, file);
  const buf = await sharp(src)
    .resize(PIXEL_SIZE, PIXEL_SIZE, { fit: 'cover' })
    .jpeg({ quality: 60 })
    .toBuffer();
  const b64 = `data:image/jpeg;base64,${buf.toString('base64')}`;
  result['/assets/images/' + file] = b64;
  console.log(`✓ ${file} → ${buf.length}b`);
}

// Videos — extract first frame with ffmpeg
const videos = (await readdir(VIDEOS_DIR))
  .filter(f => extname(f).toLowerCase() === '.mp4');

const tmp = await mkdtemp(join(tmpdir(), 'ph-'));

for (const file of videos) {
  const src = join(VIDEOS_DIR, file);
  const framePath = join(tmp, file + '.jpg');
  await execFileAsync('ffmpeg', [
    '-i', src,
    '-vframes', '1',
    '-q:v', '2',
    framePath,
    '-y',
  ]);
  const buf = await sharp(framePath)
    .resize(PIXEL_SIZE, PIXEL_SIZE, { fit: 'cover' })
    .jpeg({ quality: 60 })
    .toBuffer();
  const b64 = `data:image/jpeg;base64,${buf.toString('base64')}`;
  result['/assets/videos/' + file] = b64;
  console.log(`✓ ${file} → ${buf.length}b`);
}

await rm(tmp, { recursive: true });

await writeFile(OUT_FILE, JSON.stringify(result, null, 2));
console.log(`\nWrote ${Object.keys(result).length} placeholders to ${OUT_FILE}`);
