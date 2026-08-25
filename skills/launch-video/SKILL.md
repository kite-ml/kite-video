---
name: launch-video
description: Produce a narrated ~55s launch/product video in the Kite cotufa design system — animated HTML stage rendered to frames, ElevenLabs narration in Luigi's voice, beat-synced music, burned-in subtitles. Use whenever Luigi wants a launch video, product video, announcement video, demo video, teaser, or wants an existing one re-cut, re-voiced, or re-timed, even if he never says "skill".
---

# Launch video

Build a launch video as **code, not a timeline**: an HTML stage where every visual is a pure
function of `t`, rendered headlessly to PNG frames, muxed with generated narration + music.
Deterministic, re-renderable, reviewable frame-by-frame.

**Golden rule: the audio decides the timing, never the other way round.** Generate narration
first, measure it, then warp the stage to fit. Never hand-tune scene lengths.

## Phase 1 — script (do this before touching code)

**Write the script and get line-level sign-off first.** It fixes the scene count, runtime, footage
list and every timing target; copy changes after the stage exists cost a full re-render each.
Follow [references/script-writing.md](references/script-writing.md): interview questions, the
five-beat arc, pacing math (~2.4 words/sec), the beat-sheet format, and the line-level rules
(no unverified numbers, no AI-flavored aphorisms, every line must stand alone).

Deliver the beat sheet in chat, ask for approval, and only then build.

## Phase 2 — build

1. **Copy the pipeline** into the project: `cp -R <skill>/scripts video/` gives you
   `video/{stage,render,audio}`. It runs as-is against the example stage.
2. **Read [references/decisions.md](references/decisions.md)** — the design decisions already
   settled (motion language, scene grammar, typography, what got rejected and why). Apply them
   by default; don't rediscover them.
3. **Gather footage before authoring scenes** (see Assets) — what exists constrains the scenes.
4. **Author the stage** per [references/stage-authoring.md](references/stage-authoring.md), then
   run the pipeline below.

## Phase 3 — pipeline

Run from `video/`. Each step writes files the next one reads.

```bash
cd audio && ELEVENLABS_API_KEY=… ELEVEN_VOICE=Luigi ELEVEN_MODEL=eleven_turbo_v2 node eleven.mjs   # VO + music
node beats.mjs            # detect BPM/phase from the generated music
node compute-timing.mjs   # VO durations + beats -> out/timing.json, vo-starts.json, stage/timing.js
ELEVENLABS_API_KEY=… node subs.mjs                                    # forced alignment -> .srt + stage/subs.js
cd ../render && node render.mjs --stage index2.html --frames frames2  # 1920x1080 @30fps
cd ../audio && node assemble.mjs --frames frames2 --out kite-evals-launch.mp4
```

- `render.mjs --stills --stills-dir stills2` exports the hero still per scene (from `window.STILLS`).
- `render.mjs --from A --to B` re-renders only a time range — use it for local changes.
- Full render ≈ 6 min for ~1700 frames. **Always background it** and QA something else meanwhile.

## The timing contract

The stage is authored on a fixed **nominal** timeline (scene windows in `W`, e.g. hook 0–7,
grid 7–34, run 34–46, montage 46–54, closer 54–66). `compute-timing.mjs` emits piecewise anchors
mapping *output time → stage time*; `render.mjs` warps every frame through them. So:

- **Scenes stretch to fit their VO** — never edit choreography to make a line fit.
- **Scene cuts snap to the music beat grid** (`beats.json`), which is what makes it feel cut-to-music.
- Anything the stage needs from the audio (hook line reveals, beat period) comes from
  `stage/timing.js` — `file://` pages can't fetch JSON, so it's written as a `window.TIMING=` script.
- Changing VO or music ⇒ re-run `compute-timing.mjs` **and** `subs.mjs`, then re-render.

## Voice, music, subtitles

- **Voice: Luigi's professional clone** (`ELEVEN_VOICE=Luigi`). It is only fine-tuned for
  `eleven_turbo_v2` / `eleven_flash_v2` — passing `eleven_multilingual_v2` fails with
  `voice_not_fine_tuned`. Settings: stability ~0.45, style ~0.12 (low; the clone is already him).
- **One VO segment per on-screen line** for the opening (`vo0a/b/c`), so voice and text land together.
- **Phrase alignment beats re-recording**: split a take at its silences and re-gap it
  (`ffmpeg atrim` + `aevalsrc` concat) so each phrase lands with its visual. Keep the raw take.
- **Music**: one Eleven Music call, prompt in `eleven.mjs`; ducked 9:1 under VO, −12.5 dB, master
  normalized to −14 LUFS (measures ~−16 integrated).
- **Subtitles**: `subs.mjs` force-aligns each segment against its own script (word-level), splits
  into ≤44-char balanced cues, writes an `.srt` **and** burns pills into the stage. Suppress them
  where the words are already on screen.

## Assets

Real footage only — placeholder/stock reads as fake immediately.

- **Product/sim clips** → extract frame sequences, not `<video>` (deterministic seeking):
  `ffmpeg -ss S -t D -i clip.mov -vf "fps=12,crop=…,scale=1280:-2" -q:v 3 out/m1_%02d.jpg`
  Always crop app chrome (toolbars, side rails) out of screen recordings.
- **Hugging Face datasets** (for "many robots/conditions" beats): stream-extract straight from
  the Hub — see [references/assets.md](references/assets.md) for working dataset paths, the
  visual-audit rule (**every tile must show a robot**), and the rate-limit workaround.

## Phase 4 — review gates (where every past iteration was lost)

Run these *before* asking for feedback; each maps to a real re-render we paid for:

1. **Text fit**: measure headline width/height in the browser, not by eye. Long sentences need
   `text-wrap:balance` and a `max-width`, not a smaller font.
2. **Geometry from the DOM**: any connector/line pointing at a laid-out element must read its
   position via `getBoundingClientRect()` after `document.fonts.ready` — hardcoded coordinates drift.
3. **Boundary seeks**: seek at every scene edge ±0.1s. Crossfades pre-run the next scene, so
   scene-local time can go negative (`Math.max(0, t - W.scene[0])`).
4. **Contact sheet**: `fps=1/2,tile=6x4` over the finished mp4 — catches empty frames, misaligned
   elements, and clips that never show a robot.
5. **Audio placement**: `volumedetect` on the window where each phrase should land; verify silence
   in the gaps. Confirms sync without listening.
6. **Every camera end-state centered** on that beat's subject (see decisions.md).

## Deliverables

Deliver **one** video unless asked otherwise. Copy to `~/Desktop/<project>/`:
`video.mp4`, `video.srt`, `slides/` (hero stills), `audio-stems/`.

macOS may block direct writes to `~/Desktop` (Files & Folders privacy). Fall back to Finder:
`osascript -e 'tell application "Finder" to duplicate (POSIX file "…") to (folder "X" of desktop) with replacing'`,
then verify with `stat -f "%z"` on both paths.

## Optional: on-camera avatar

ElevenLabs Avatars has no public API yet, but Flows video does: model `creatify-aurora`
(character image + speech audio → lip-synced video) via `POST /v1/flows/video`, needs the
`image_video_generation` key scope. `audio/avatar.mjs` runs the whole path. If the scope is
missing, generate in the ElevenLabs UI instead — `avatar.mjs` still builds the hook audio to
upload, and the stage auto-switches to avatar mode once frames exist
(see [references/avatar.md](references/avatar.md)).
