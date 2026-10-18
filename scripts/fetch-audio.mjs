// Downloads ElevenLabs generation results and post-processes them with ffmpeg.
// Usage: node scripts/fetch-audio.mjs <jobs.json>
// jobs.json: [{ "out": "sfx/pistol_fire_1.mp3", "url": "<content_url>", "loop": false, "max": 1.5 }]
// - one-shots: trim leading/trailing silence, cap to `max` seconds with a short fade, loudness-normalize
// - loops (`loop: true`): normalize only, keep full length
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const jobs = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const outDir = join(root, 'src', 'assets', 'audio');
let ok = 0;
for (const j of jobs) {
  const dst = join(outDir, j.out);
  mkdirSync(dirname(dst), { recursive: true });
  const tmp = join(tmpdir(), `hf_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);
  try {
    // Compact job form: { s: "<session>/<generation>", d: "<X-Goog-Date>", sig: "<signature>" }
    const url = j.url ?? `https://storage.googleapis.com/xi-backend/database/workspace/${j.ws ?? '9315cc4fe1774f77ac04d2327ab16f60'}/content_generation/${j.s}/content.mp3?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=xi-backend-prod%40xi-labs.iam.gserviceaccount.com%2F${j.d.slice(0, 8)}%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=${j.d}&X-Goog-Expires=7200&X-Goog-SignedHeaders=host&X-Goog-Signature=${j.sig}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
    const filters = [];
    if (!j.loop) {
      filters.push('silenceremove=start_periods=1:start_threshold=-48dB');
      filters.push('areverse,silenceremove=start_periods=1:start_threshold=-55dB,areverse');
      if (j.max) filters.push(`atrim=0:${j.max},afade=t=out:st=${Math.max(0, j.max - 0.08)}:d=0.08`);
    }
    filters.push(j.voice ? 'loudnorm=I=-16:TP=-1.5:LRA=9' : 'loudnorm=I=-15:TP=-1.0:LRA=11');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-af', filters.join(','), '-ar', '44100', '-ac', j.stereo ? '2' : '1', '-b:a', '128k', dst]);
    ok++;
    console.log('ok  ', j.out);
  } catch (e) {
    console.log('FAIL', j.out, e.message);
  } finally {
    rmSync(tmp, { force: true });
  }
}
console.log(`${ok}/${jobs.length} saved`);
