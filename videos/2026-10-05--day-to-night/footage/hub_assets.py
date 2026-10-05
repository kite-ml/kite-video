import json, time, os
import av, numpy as np, pandas as pd, requests
from PIL import Image, ImageFilter
from huggingface_hub import hf_hub_download, hf_hub_url, HfApi

A = "video/stage/assets"
SHOT = "../blog/session_img_0_2026-09-28T013834.webp"
# 1. live evening frame (top camera) from the screenshot Luigi pasted
live = Image.open(SHOT).convert("RGB").crop((428, 389, 850, 705))
for name, size in (("live_top_880.jpg", (880, 660)), ("live_top_540.jpg", (540, 405))):
    im = live.resize(size, Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.6, percent=60, threshold=2))
    im.save(f"{A}/{name}", quality=92)

# 2. relit copies straight from the Hub dataset (pinned commit)
REPO, REV = "kiteml/dual-openyam-close-box", "b28c65d7b892cb8dd4ed61f45158484374330086"
ep = pd.read_parquet(hf_hub_download(REPO, "meta/episodes/chunk-000/file-000.parquet", repo_type="dataset", revision=REV))
def url(cam, chunk, file):
    u = hf_hub_url(REPO, f"videos/observation.images.{cam}/chunk-{chunk:03d}/file-{file:03d}.mp4", repo_type="dataset", revision=REV)
    return requests.get(u, stream=True, allow_redirects=True, timeout=60).url
def clip(i, cam, name, frac=0.45, secs=2.5, fps=12, size=(384, 288)):
    r = ep.iloc[i]; p = f"videos/observation.images.{cam}/"
    t0, t1 = float(r[p + "from_timestamp"]), float(r[p + "to_timestamp"])
    ts = [t0 + frac * (t1 - t0) + k / fps for k in range(int(secs * fps))]
    for attempt in range(6):
        try:
            out = []
            with av.open(url(cam, int(r[p + "chunk_index"]), int(r[p + "file_index"])), options={"rw_timeout": "60000000"}) as c:
                s = c.streams.video[0]
                c.seek(max(0, int((ts[0] - 0.3) / s.time_base)), stream=s)
                k = 0
                for fr in c.decode(s):
                    if k < len(ts) and fr.time >= ts[k] - 1e-3:
                        out.append(fr.to_ndarray(format="rgb24")); k += 1
                    if k == len(ts): break
            os.makedirs(f"{A}/{name}", exist_ok=True)
            for n, x in enumerate(out):
                Image.fromarray(x).resize(size, Image.LANCZOS).save(f"{A}/{name}/f_{n+1:04d}.jpg", quality=88)
            print(name, len(out)); return
        except Exception as e:
            print(name, "retry", attempt, e); time.sleep(3 + 3 * attempt)
clip(61, "top", "w_ds_tungsten_top", secs=4.8)
clip(92, "top", "w_ds_daylight_top", frac=0.3, secs=4.8)
clip(75, "left_wrist", "w_ds_tungsten_left", secs=4.8)
clip(100, "left_wrist", "w_ds_daylight_left", frac=0.3, secs=4.8)

# 3. episode 0 actions for the proof strip: the 5-11 s window (the most arm motion in the episode), top 3 joints
files = [f for f in HfApi().list_repo_files(REPO, repo_type="dataset", revision=REV) if f.startswith("data/")]
df = pd.read_parquet(hf_hub_download(REPO, files[0], repo_type="dataset", revision=REV), columns=["episode_index", "timestamp", "action"])
names = json.load(open(hf_hub_download(REPO, "meta/info.json", repo_type="dataset", revision=REV)))["features"]["action"]["names"]
e0 = df[df.episode_index == 0].sort_values("timestamp")
m = (e0.timestamp >= 5.0) & (e0.timestamp < 11.0)
seg = np.stack(e0.action.values)[m.values]
order = np.argsort(-seg[:, :12].std(0))[:3]
acts = {"t": (e0.timestamp[m] - 5.0).round(4).tolist(),
        "joints": [{"name": names[j], "values": seg[:, j].round(4).tolist()} for j in order]}
open("video/stage/actions.js", "w").write("window.ACTIONS=" + json.dumps(acts) + ";\n")
