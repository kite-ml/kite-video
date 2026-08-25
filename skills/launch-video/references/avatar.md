# On-camera avatar (optional bookend)

## API status

**ElevenLabs Avatars has no public API** ("planned for future release"). What *is* callable is
ElevenCreative Flows video: `POST /v1/flows/video` with `model_id: creatify-aurora`
(`image` + `audio` → lip-synced talking head), poll `GET /v1/flows/video/{id}` until
`status: completed`, then download `content_url` (signed, ~1h). Requires the
**`image_video_generation`** key scope; without it every call 401s with `missing_permissions`.

`audio/avatar.mjs` implements the whole path: builds the hook audio exactly as it sits in the
final mix → generates → polls → downloads → extracts 30fps frames → writes
`stage/assets/avatar/avatar.js` (`window.AVATAR={n,fps,w,h}`).

## UI fallback (what we actually shipped)

`avatar.mjs` writes `audio/hook_vo.mp3` before it ever calls the API — that file is the upload
for the ElevenLabs UI. Route: **Avatar → New Style** (prompt the look) → **Create Lip Sync**
(upload the audio) → export → drop `avatar.mp4` next to the project.

Style prompt that worked (adapt wardrobe as asked):

> Waist-up talking-head, front-facing, eyes to camera, relaxed founder energy — not a presenter.
> Wearing a plain black crew-neck t-shirt under an open olive-green overshirt. Framed on the
> LEFT THIRD of a 16:9 frame; right two-thirds clean negative space. Dark near-black studio
> (#0a0a0a–#1c1c1c), seamless, no props, subtle vignette. Soft key from front-left, gentle rim
> light, low contrast. Eye level, 50mm, shallow depth of field, static shot. Natural skin, no
> beauty filter, no text or logos. Photorealistic, 4K, cinematic but understated.

Direction field: *"Calm, low-energy delivery; small natural head movements, occasional slow blink,
hands out of frame. Stays on the left third. Silences are listening, not gesturing."*

## Stage integration

Build the hook **mode-switchable** so the avatar is a drop-in, not a rewrite:

```js
const AV=window.AVATAR||null;
const AVMODE=!!AV;                      // avatar frames present?
const HL=(AVMODE?[captionEls]:[bigTextEls]).map(…);   // captions in-card vs big typed lines
```

- **Text mode** (no avatar): big typed lines left, dataset carousel right.
- **Avatar mode**: Luigi's card left with the lines as captions inside it (shade gradient behind),
  carousel shifted right, "● ON CAMERA · LUIGI · KITE ML" label under the card.
- Frame index: `Math.floor(t/K0*AV.fps)` — the hook's stage↔output factor, since the avatar video
  is in *output* time.
- Never show a **frozen still** while narration plays; if there are no avatar frames, use text mode.
- Suppress burned-in subtitles during the avatar hook — the captions live in the card.

Only the hook re-renders when the avatar lands: `render.mjs --from 0 --to <s0len>`.
