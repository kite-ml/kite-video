# videos/ — every finished cut, saved as code

One directory per shipped cut, named `YYYY-MM-DD--<slug>/`, holding everything needed to
re-render it exactly:

| File | What it is |
|---|---|
| `index.html` | the stage — every visual as a pure function of `t` |
| `timing.js` | the output-time → stage-time warp (`window.TIMING=`) |
| `subs.js` | burned-in subtitle track for the stage |
| `slides/` | every slide, twice: `<name>.png` (2x hero still) + `<name>.html` (frozen DOM snapshot at that slide's `t`) — from `render.mjs --stills` |
| `NOTES.md` | source material link, the approved VO script, length, exact render command |

**Why HTML is committed and media is not.** A cut here is deterministic: stage + timing +
narration settings reproduce the same mp4 frame-for-frame, so the mp4 (and mp3) stay in
`.gitignore` — heavy, derivable, and re-renderable in ~6 minutes. The HTML is the master;
losing it means the cut is gone. This directory is why no cut can be lost to a laptop again.
The one media exception is `slides/*.png`: small, browsable, and the visual record of each
slide even where a snapshot's project assets (montage frames etc.) aren't in this repo.

Fonts and pipeline scripts are shared, not duplicated: a saved stage references
`../../skills/launch-video/scripts/stage/assets/fonts/` relatively. If the design system
moves under a cut, the cut still renders as shipped — the tokens are inlined in its
`:root` block by design.

The `launch-video` skill's Ship step writes these directories; nothing else should.
