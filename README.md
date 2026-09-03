# kite-video

Kite's launch-video studio: a Claude Code skill that produces narrated ~55s product videos in the
cotufa design system — animated HTML stage → headless frame render → ElevenLabs narration in
Luigi's voice → beat-synced music → burned-in subtitles.

Videos are built as **code, not a timeline**: every visual is a pure function of `t`, so a cut is
deterministic, re-renderable, and reviewable frame-by-frame.

## Install

This repo is both a plugin and its own marketplace. From an interactive `claude` terminal:

```bash
/plugin marketplace add ~/kite-video
/plugin install kite-video@kite
```

Once it's on GitHub, everyone else uses the same two commands with the repo instead of the path:

```bash
/plugin marketplace add kite-ml/kite-video
/plugin install kite-video@kite
```

Then just ask for a launch video, or invoke `/kite-video:launch-video`.

To try it without installing: `claude --plugin-dir ~/kite-video`.
For a single project, copy `skills/launch-video/` into that project's `.claude/skills/`
(copy, not symlink — symlinks aren't reliably picked up).

Validate after any manifest change: `claude plugin validate ~/kite-video`.

## What's inside

```
skills/launch-video/
  SKILL.md                      the workflow: script → build → pipeline → review gates
  references/
    script-writing.md           interview, five-beat arc, pacing math, line-level copy rules
    site-fidelity.md            reproduce a shipped page in motion: real components, cover intro
    decisions.md                settled design decisions + what was rejected and why
    stage-authoring.md          the seek(t) contract, camera model, timing bridge
    assets.md                   footage prep, vetted Hugging Face robot datasets, audit rule
    avatar.md                   optional lip-synced on-camera bookend
  scripts/                      the working pipeline (copy into a project as video/)
    stage/index.html            animated stage template (the shipped Kite Evals cut)
    render/render.mjs           headless Chrome → PNG frames
    audio/*.mjs                 narration, music, beat detection, timing, subtitles, assembly
```

## Finished cuts

Every shipped cut is archived under [`videos/`](videos/README.md) as
`YYYY-MM-DD--<slug>/` — the stage HTML, timing warp and subtitles that re-render it
deterministically. The mp4 is disposable; the HTML is the master.

## Requirements

- `ffmpeg` / `ffprobe` on PATH
- Chrome (driven by `playwright-core`; `cd video/render && npm i`)
- `ELEVENLABS_API_KEY` with scopes: `text_to_speech`, `voices_read`, `speech_to_text`
  (forced alignment for subtitles), and `image_video_generation` only for the optional avatar

## Non-obvious things this encodes

- **Audio decides timing.** Narration is generated and measured first; the stage is time-warped to
  fit. Scene cuts snap to a beat grid detected from the generated music.
- **Luigi's voice clone only works on `eleven_turbo_v2`** — `eleven_multilingual_v2` returns
  `voice_not_fine_tuned`.
- **Phrase alignment beats re-recording**: split a take at its silences and re-gap it so each
  phrase lands with its visual.
- **Six review gates** run before showing anyone a cut — each one maps to a re-render we paid for.
