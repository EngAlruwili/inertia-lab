// Generates one neural-voice MP3 per script line and a timeline.json with durations.
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { parseFile } from 'music-metadata';
import fs from 'node:fs';
import path from 'node:path';
import { SCRIPT } from '../src/script.js';

const VOICE = 'en-US-AndrewNeural';
const outDir = path.resolve('public/voice');
fs.mkdirSync(outDir, { recursive: true });

const timeline = [];
for (let i = 0; i < SCRIPT.length; i++) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const tmp = path.join(outDir, `tmp-${i}`);
  fs.mkdirSync(tmp, { recursive: true });
  const { audioFilePath } = await tts.toFile(tmp, SCRIPT[i].en, { rate: '-4%' });
  const file = `line-${String(i).padStart(2, '0')}.mp3`;
  fs.renameSync(audioFilePath, path.join(outDir, file));
  fs.rmSync(tmp, { recursive: true, force: true });
  tts.close?.();
  const { format } = await parseFile(path.join(outDir, file));
  timeline.push({ ...SCRIPT[i], file: `voice/${file}`, duration: +format.duration.toFixed(3) });
  console.log(file, format.duration.toFixed(2), 's —', SCRIPT[i].en);
}
fs.writeFileSync(path.resolve('src/timeline.json'), JSON.stringify(timeline, null, 2));
console.log('Total voice:', timeline.reduce((a, b) => a + b.duration, 0).toFixed(1), 's');
