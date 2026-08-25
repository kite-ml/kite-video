# Assets — sourcing and preparing footage

Frame sequences, not `<video>`: the renderer seeks by `t`, and video elements don't seek
deterministically in headless Chrome. 12fps source frames are plenty inside a card; use ~15–17fps
if the clip is full-bleed.

## Product / sim recordings

```bash
# strip app chrome (toolbar + side rail) and fit 16:9 full-bleed
ffmpeg -y -ss 1.5 -t 3 -i demo.mov -vf "fps=12,crop=2880:1620:110:172,scale=1280:-2" -q:v 3 m2_%02d.jpg
```

- **Always crop out UI chrome** from screen recordings before using them as footage.
- For the product-UI beat, match the frame count to the stage's clip model (49 frames @14fps = 3.5s)
  so the subgoal timeline lines up: `-vf "fps=15.8,scale=720:720"` over a 3.1s window.
- Relabel the UI to the *actual* episode: camera key, failure reason, subgoal states, log lines.
  A "not lifted" failure means `lift ✗` and `place —` (skipped), not a generic drop.

## Hugging Face robot datasets

Stream straight from the Hub — no full download needed:

```bash
ffmpeg -y -ss 8 -t 3 \
  -i "https://huggingface.co/datasets/unitreerobotics/G1_Dex3_Pouring_Dataset/resolve/main/videos/observation.images.cam_left_high/chunk-000/file-000.mp4" \
  -vf "fps=12,scale=768:-2" -q:v 4 g1pour_%02d.jpg
```

**Rate limits: run these sequentially.** Parallel `&` jobs all fail. (`sleep` is blocked in this
environment — just chain them.)

Discovery:
```bash
curl -s "https://huggingface.co/api/datasets?author=unitreerobotics&limit=100" | python3 -c "import json,sys;[print(d['id']) for d in json.load(sys.stdin)]"
curl -s "https://huggingface.co/api/datasets/<id>/tree/main?recursive=true" | python3 -c "import json,sys;[print(f['path']) for f in json.load(sys.stdin) if f['path'].endswith('.mp4')]"
```

### Vetted set (robot clearly in frame)

| slug | dataset | camera |
|---|---|---|
| g1pour | `unitreerobotics/G1_Dex3_Pouring_Dataset` | `cam_left_high` |
| g1block | `unitreerobotics/G1_Dex3_BlockStacking_Dataset` | `cam_left_high` |
| g1sim | `unitreerobotics/G1_Dex1_PickPlaceCylinder_Dataset_Sim` | `videos/chunk-000/observation.images.cam_left_high/episode_000000.mp4` |
| z1coffee | `unitreerobotics/Z1_Dual_Dex1_PourCoffee_Dataset` | `cam_high` (ss≈25) |
| taco | `lerobot/taco_play` | `rgb_static` |
| iamlab | `lerobot/iamlab_cmu_pickup_insert` | `image` |
| droid | `lerobot/droid_100` | `exterior_image_1_left` |
| ur5 | `lerobot/berkeley_autolab_ur5` | `image` (file-003) |
| coffee | `lerobot/aloha_static_coffee` | `cam_high` |
| utokyo2 | `lerobot/utokyo_xarm_pick_and_place` | `image2` |

**Rejected** — no visible robot or unusable: `pusht` (2D), `unitreeh1_warehouse` (ego view),
`cmu_stretch` (robot tiny/low-contrast), `ucsd_kitchen_dataset` (toy kitchen, robot barely in frame),
`nyu_franka_play_dataset` (dark/cluttered).

## The audit rule

Never trust a dataset name or a single probe frame. Extract mid-motion frames from **every**
candidate, tile them, and look:

```bash
ffmpeg -y -i a_18.jpg -i b_18.jpg -i c_18.jpg -filter_complex "[0]scale=320:-1[a];[1]scale=320:-1[b];[2]scale=320:-1[c];[a][b][c]hstack=3" audit.png
```

Every tile must show a robot doing something. Also check *across* the clip (frames 1/18/36) —
some episodes start or end on an empty scene.
