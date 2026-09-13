# RL Studio — 30s launch video

The shipped cut is `index.html` (draft 5). `variant-microduck.html` is an alternate take on the
same stage that did not ship — kept because the work exists and this directory is why cuts
don't get lost.

- **Length**: 30.0s · 900 frames · 1920×1080 @30fps
- **Narration**: none. This is the skill's **no-VO variant** — a fixed nominal timeline sized to
  the on-screen copy, rendered straight through `window.DUR`, no `timing.json`, no warp. There is
  therefore no `timing.js` and no `subs.js`; `timing.txt` carries the scene marks instead, so a
  voice or a music bed can be laid over the cut later.
- **Audio**: none. No `ELEVENLABS_API_KEY` was available in the session, so no music was generated.

## Render

```bash
cd video/render && node render.mjs --stage rl.html --frames rl5frames
cd ../render && node render.mjs --stage rl.html --stills --stills-dir rl5stills
cd ../audio  && node assemble.mjs --frames rl5frames --silent
```

## Source material

Everything on screen is real product data, from this repo's sibling `kite` checkout or from the
live catalog at `https://api.kiteml.com/api/rl-studio/community`.

| On screen | Source |
|---|---|
| Prompt placeholder and the three suggestion chips | `frontend/app/app/(dashboard)/rl-studio/page.tsx` — the textarea `placeholder` and `SUGGESTIONS.open_duck_mini_v2` |
| "Generate the video & imitate" / "Upload a video" / "Plan the locomotion (no video)" | the real buttons in that page |
| `walk forward between a basketball and a crate` | the real prompt of published run `aa71850598f5` |
| "Open Duck — walk through the gap (planned, no video)" | that run's catalog title, verbatim |
| `duck_mini_walk`, vx 0.20–0.40, yaw ±0.20, 2,048 envs, 4,000 iterations | `backend/tasks/locomotion_v2.py` embodiment ranges, `services/rl_studio/planner.py` defaults, and the run's real `iterations` |
| "training on an L4" | `RL_STUDIO_ACCELERATOR` default `NVIDIA_L4`, `backend/services/rl_studio/launcher.py` |
| Hero clip | the rendered preview of run `aa71850598f5` — the policy that prompt produced |
| Grid wall | all 22 published policies in the catalog |
| "Pick a robot. Describe a behavior. Take the policy." | the live `/rl-studio` page, minus "Train it on our infra" |

## On-screen copy

```
(opening wall)   RL Studio · Text and video to RL
TYPE             Describe the motion.
                 (typed) walk forward between a basketball and a crate
PLAN             Open Duck — walk through the gap (planned, no video)
TRAIN            It trains in parallel.
ALIVE            And the policy is yours.
GRID             RL Studio · Text and video to RL
CLOSER           Pick a robot. Describe a behavior. Take the policy.
                 kiteml.com/rl-studio
```

## Two invented numbers — replace when real ones exist

1. **Mean reward** climbs to ~1.18 in the training bar. The catalog does not expose reward.
2. **Env steps** counts to ~197M, derived as `iterations × 2,048 envs × 24 steps`; the
   step multiplier is an assumption.

## Deliberate departures from the skill's references

- **No JetBrains Mono.** Everything is Google Sans Flex, on Luigi's instruction. This overrides
  `decisions.md`, which makes mono "the voice of the machine"; data strings hold their machine
  feel through weight, letterspacing and `tabular-nums` instead.
- **Authored scenes follow kiteml.com/blog**, screenshotted and colour-sampled rather than
  eyeballed: ground `#fdfdfd`, headline `#020202`, eyebrow grey `#636363`, hairline `#ededed`,
  dashed page rails at the blog's ~11.7% margins, 60px/600 display type at -0.042em, and the
  blog's blue `#4163d0` → `#87adee` as the single accent.
- **Caps eyebrows kept** ("RL STUDIO", plan field labels) because the blog uses caps eyebrows,
  against the skill's no-all-caps copy rule.
- **Dot-grid motifs removed** from the dark scenes.
- **Em-dashes kept** in two strings that are product data reproduced verbatim
  ("Open Duck Mini v2 — new training" and the catalog title). Authored lines follow the rule.
- **The fleet beat is not real training footage.** The product's arena renders K parallel worlds
  tinted red→green by reward (`training-grid.tsx`); with no recording of it available, the beat
  reproduces that behaviour using real footage of the same robot. A screen recording of a live
  run would materially improve it.

## Frame assets

The stage reads JPEG frame sequences from `assets/frames/`, which are **not committed** (18MB,
and derivable). Regenerate them next to the stage with:

```bash
# grid wall — every published policy, 12fps
curl -s https://api.kiteml.com/api/rl-studio/community \
  | python3 -c "import json,sys;[print(p['run_id']) for p in json.load(sys.stdin)['policies']]" > ids.txt
mkdir -p assets/frames/grid assets/frames/hero
while read id; do
  curl -sL -o "/tmp/$id.mp4" "https://api.kiteml.com/api/rl-studio/community/$id/preview.mp4"
  ffmpeg -y -v error -ss 1.5 -t 5.5 -i "/tmp/$id.mp4" -vf "fps=12,scale=384:-2" -q:v 4 \
    "assets/frames/grid/${id}_%02d.jpg"
done < ids.txt

# hero — the featured policy, 15fps
ffmpeg -y -v error -ss 1.0 -t 5.0 -i /tmp/aa71850598f5.mp4 \
  -vf "fps=15,scale=1728:-2" -q:v 3 assets/frames/hero/h_%03d.jpg
```

`variant-microduck.html` additionally wants `assets/frames/hero_md/` — the same recipe over
`cdf8f6618618` with `crop=880:495:40:55` before the scale, since the microduck sits small in
frame.
