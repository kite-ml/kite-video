// Subtitles: word timings via ElevenLabs forced alignment (audio + script per
// segment) -> short cues -> ../out/kite-evals-launch.srt (output time) and
// ../stage/subs.js (cues in STAGE time via the timing anchors) for burn-in.
//
//   ELEVENLABS_API_KEY=... node subs.mjs           # align + build
//   node subs.mjs --rebuild                         # rebuild cues from cached alignment.json
//
// vo5 was re-cut (pauses edited) so its alignment is run on the edited file.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const KEY = process.env.ELEVENLABS_API_KEY;
const manifest = JSON.parse(readFileSync(join(HERE, 'manifest.json'), 'utf8'));
const starts = JSON.parse(readFileSync(join(HERE, 'vo-starts.json'), 'utf8'));
const { anchors } = JSON.parse(readFileSync(join(HERE, '..', 'out', 'timing.json'), 'utf8'));
const cache = join(HERE, 'alignment.json');

// ---- 1. word timings per segment (cached) ----
let align = existsSync(cache) ? JSON.parse(readFileSync(cache, 'utf8')) : {};
if (!args.includes('--rebuild')) {
  if (!KEY) { console.error('ELEVENLABS_API_KEY not set'); process.exit(1); }
  for (const seg of manifest.segments) {
    const fd = new FormData();
    fd.append('file', new Blob([readFileSync(join(HERE, seg.id + '.mp3'))], { type: 'audio/mpeg' }), seg.id + '.mp3');
    fd.append('text', seg.text);
    const r = await fetch('https://api.elevenlabs.io/v1/forced-alignment', { method: 'POST', headers: { 'xi-api-key': KEY }, body: fd });
    if (!r.ok) throw new Error(`${seg.id}: ${r.status} ${await r.text()}`);
    const j = await r.json();
    align[seg.id] = j.words.filter(w => w.text.trim()).map(w => ({ t: w.text, s: w.start, e: w.end }));
    console.log(`${seg.id}: ${align[seg.id].length} words, loss ${j.loss.toFixed(3)}`);
  }
  writeFileSync(cache, JSON.stringify(align, null, 1));
}

// ---- 2. cues: one per sentence when it fits (≤44 chars); longer sentences are
// split into balanced chunks at word boundaries, preferring punctuation ----
const MAXC = 44, TARGET = 38;
const cues = [];
const textOf = ws => ws.map(w => w.t).join(' ');
function splitBalanced(ws) {
  const len = textOf(ws).length;
  if (len <= MAXC || ws.length < 4) return [ws];
  const k = Math.ceil(len / TARGET);                       // number of chunks
  const ideal = len / k;
  const out = []; let start = 0, consumed = 0;
  for (let c = 1; c < k; c++) {
    // candidate break after word i: score by distance to ideal, bonus for punctuation
    let best = -1, bestScore = Infinity, acc = consumed;
    for (let i = start; i < ws.length - 1; i++) {
      acc += (i > start ? 1 : 0) + ws[i].t.length;
      const pos = acc - consumed, dist = Math.abs(pos - ideal);
      const punct = /[,;:—–-]$/.test(ws[i].t) ? -6 : 0;
      const score = dist + punct;
      if (pos >= 12 && score < bestScore) { bestScore = score; best = i; }
      if (pos > ideal + 14) break;
    }
    if (best < 0) break;
    out.push(ws.slice(start, best + 1)); consumed += textOf(ws.slice(start, best + 1)).length + 1; start = best + 1;
  }
  out.push(ws.slice(start));
  return out.filter(x => x.length);
}
for (const seg of manifest.segments) {
  const st = starts.find(s => s.id === seg.id).start;
  const words = align[seg.id]; if (!words) continue;
  // sentences
  const sentences = []; let cur = [];
  for (const w of words) { cur.push(w); if (/[.!?]$/.test(w.t)) { sentences.push(cur); cur = []; } }
  if (cur.length) sentences.push(cur);
  for (const sent of sentences) for (const chunk of splitBalanced(sent))
    cues.push({ id: seg.id, s: st + chunk[0].s, e: st + chunk.at(-1).e, text: textOf(chunk) });
}
// stretch tails so cues don't flicker; keep them from overlapping the next cue
for (let i = 0; i < cues.length; i++) {
  const c = cues[i], n = cues[i + 1];
  c.e = Math.max(c.e, c.s + 0.9) + 0.18;
  if (n && c.e > n.s - 0.04) c.e = n.s - 0.04;
}

// ---- 3. outputs ----
const ts = t => { const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = Math.floor(t % 60), ms = Math.round((t % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`; };
writeFileSync(join(HERE, '..', 'out', 'kite-evals-launch.srt'),
  cues.map((c, i) => `${i + 1}\n${ts(c.s)} --> ${ts(c.e)}\n${c.text}\n`).join('\n'));

// output time -> stage time via anchors (piecewise linear)
const stageOf = t => { for (let i = 0; i < anchors.length - 1; i++) { const [o0, s0] = anchors[i], [o1, s1] = anchors[i + 1];
  if (t <= o1 || i === anchors.length - 2) return s0 + (s1 - s0) * Math.min(Math.max((t - o0) / (o1 - o0), 0), 1); } return anchors.at(-1)[1]; };
const stageCues = cues.map(c => ({ id: c.id, s: +stageOf(c.s).toFixed(3), e: +stageOf(c.e).toFixed(3), text: c.text }));
writeFileSync(join(HERE, '..', 'stage', 'subs.js'), `window.SUBS=${JSON.stringify(stageCues)};\n`);
console.log(`${cues.length} cues -> out/kite-evals-launch.srt + stage/subs.js`);
cues.forEach(c => console.log(`  ${c.s.toFixed(2)}–${c.e.toFixed(2)}  ${c.text}`));
