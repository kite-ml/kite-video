# Day to night — 26s data augmentation video

The shipped cut is `index.html` (v2). Narrated in Luigi's ElevenLabs voice clone (`eleven_turbo_v2`, read as one
take), with an Eleven Music bed and subtitles force-aligned and burned in where the words aren't already on screen.

- **Length**: 25.6 s · 769 frames · 1920×1080 @ 30 fps
- **Source material**: <https://kiteml.com/blog/day-to-night-relighting> and the data behind it,
  [`kiteml/dual-openyam-close-box`](https://huggingface.co/datasets/kiteml/dual-openyam-close-box) at commit `b28c65d7`
- **Brief** (Luigi, 2026-10-05): 20–30 s; no token costs; say that data augmentation handles relighting plus
  generation (distractor objects, background changes, …)
- **v1 → v2**: v1 was 29.25 s. Luigi: "I like it, make it a little fast pace". v2 time-stretches the same take
  and music to 1.1× (`atempo`, pitch kept; music 99 → 110 BPM), tightens the scene padding in
  `audio/compute-timing.mjs` (lead 0.15 s, tail 0.12 s, hook gap 0.25 s), and quickens the motion (0.32 s fades,
  0.75 s relight wipe, faster recorded | relit sweep, a punch-in on the evening cut, the closing wall cascades in).

## Approved VO script (58 words)

```
HOOK      We recorded our robot's demos on a bright morning.
          By evening, its cameras saw a different scene.
RELIGHT   Kite relights your dataset to match a photo from each camera.
PROOF     Only the light changes, so every recorded action still lines up.
GENERATE  Kite also generates new scenes: distractor objects, new backgrounds, new surfaces.
ASK       Augment your dataset with the Kite API.
```

## On-screen copy and where every number comes from

| On screen | Source |
|---|---|
| `brightness 166 · warmth 1.03` → `81 · 1.55` | the post's lighting-gap table: episode 0's first frame vs the live evening frame (mean luma, red/blue) |
| `exposure −2.0 · temperature 4200 K · contrast 0.75` | the planner's top-camera settings in the episode 0 API run `aug_01M3K6FC21JF45BW64MB9S5HPN`, quoted in the post |
| Action strip under "Only the light changes." | episode 0's recorded actions (`left_joint3`, `left_joint4`, `left_joint2`, 5–11 s) from the dataset's parquet (`actions.js`) |
| Distractor objects / New backgrounds / New surfaces | real video-augmentation outputs, below |
| Data augmentation · docs.kiteml.com | the ask; the docs host the augmentation guide |

## Footage — all real

| Shot | Source |
|---|---|
| Hook daylight clip | episode 0, top camera, 1–7 s |
| Evening frame / reference photo | the live top-camera frame from the screenshot Luigi shared on 2026-09-28 |
| Relight wipe | episode 0, top camera, 13–19 s: recorded → relit through the API |
| Proof split | episode 0, top camera, 5–11 s (the window with the most arm motion): recorded \| relit, same frames |
| Distractor objects | made for this video: video augmentation on episode 0's top camera, 2–7 s (`footage/gen_distractor_v2.py`, instruction in `footage/meta_v2.json`, ~62 s). A first try also redrew the box's printed artwork; this one names it as unchanged and keeps it |
| New backgrounds | ALOHA cabinet, `cam_high`, grey tiled walls (video-augmentation test export, 2026-07-01) |
| New surfaces | Unitree toaster scene, `cam_left_high`, tabletop retextured as dark walnut (same export) |
| Closing wall (15 tiles) | the dataset's relit episodes 61 and 75 (lamps) and 92 and 100 (daylight), pulled from the Hub; episode 0 relit through the API and through video augmentation; the distractor clip; ALOHA tiled walls (high + left wrist) and spotlight (high + right wrist); the walnut table (left + right high) |

No right-wrist footage of the close-box robot: that camera films the teleoperator. The wrist tiles were checked for
people.

## Render

The stage runs on the skill's shared pipeline; `render.mjs` and `beats.mjs` are unchanged. The scripts in `audio/`
are the ones that differ: `one_take.mjs` (new), and `compute-timing.mjs`, `assemble.mjs`, `subs.mjs` and
`eleven.mjs` as evolved for the RL runs cut, which have not been upstreamed into the skill.

```bash
cp -R ../../skills/launch-video/scripts video && cp audio/*.mjs video/audio/ && cp index.html *.js video/stage/
bash footage/cuts.sh && python footage/hub_assets.py            # frame sequences, live stills, actions.js
cd video/audio && ELEVENLABS_API_KEY=… ELEVEN_VOICE=Luigi ELEVEN_MODEL=eleven_turbo_v2 node one_take.mjs
ELEVENLABS_API_KEY=… node eleven.mjs --music-only
for f in take vo0a vo0b vo1 vo2 vo3 vo4 music; do ffmpeg -i $f.mp3 -af atempo=1.1 $f.tmp.mp3 && mv $f.tmp.mp3 $f.mp3; done
#   then rescale alignment.json word times ÷ 1.1 and re-measure manifest.json durations (or use the committed JSON)
node beats.mjs && node compute-timing.mjs && node subs.mjs --rebuild
cd ../render && node render.mjs --frames frames2 && node render.mjs --stills --stills-dir stills2
cd ../audio && node assemble.mjs --frames frames2 --out day-to-night-v2.mp4
# final master: +2.2 dB into alimiter=limit=0.841 → -16.8 LUFS, peak -1.4 dBFS
```

TTS output isn't deterministic, so a fresh read will differ slightly. The committed `audio/*.json` (manifest,
alignment, beats, vo-starts) are the shipped take's measurements, and `timing.js` / `subs.js` were generated from them.
