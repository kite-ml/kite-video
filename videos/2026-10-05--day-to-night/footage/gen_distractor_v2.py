"""Video augmentation (Kite's generative engine) on 5 s of close-box episode 0, top camera: add distractor objects."""
import os, sys, time, json
import av, numpy as np
sys.path.insert(0, "/Users/luigi/kite/backend")
os.environ.setdefault("AUGMENT_GOOGLE_PROJECT", "kite-481710")
from services.augmentation.providers.gemini_omni import GeminiOmniProvider

SRC = os.path.expanduser("~/Downloads/kite-relight-videos/episode-0/original_top.mp4")
T0, N, FPS = 2.0, 150, 30
INSTR = ("Add two distractor objects on the wooden table in front of the cardboard box: a red coffee mug on the left "
         "and a roll of silver duct tape on the right. Do not change anything else: the cardboard box must keep its exact printed "
         "artwork and text, and the robot arms and their motion, the background, the camera view and the lighting must stay identical.")

frames = []
with av.open(SRC) as c:
    s = c.streams.video[0]
    for f in c.decode(s):
        if f.time + 1e-6 < T0:
            continue
        frames.append(f.to_ndarray(format="rgb24"))
        if len(frames) == N:
            break
frames = np.stack(frames)

def write(path, fr):
    with av.open(path, "w") as out:
        st = out.add_stream("libx264", rate=FPS)
        st.width, st.height, st.pix_fmt = fr[0].shape[1], fr[0].shape[0], "yuv420p"
        st.options = {"crf": "18", "preset": "slow"}
        for x in fr:
            out.mux(st.encode(av.VideoFrame.from_ndarray(np.ascontiguousarray(x), format="rgb24")))
        out.mux(st.encode(None))

write("input_top.mp4", frames)
t = time.time()
p = GeminiOmniProvider()
job = p.start_job(frames=frames, instruction=INSTR, fps=FPS)
out = p.download_result(job)
write("output_top_v2.mp4", [np.asarray(x, dtype=np.uint8) for x in out])
json.dump({"source": SRC, "t0": T0, "frames": N, "fps": FPS, "instruction": INSTR, "seconds": round(time.time() - t, 1)},
          open("meta_v2.json", "w"), indent=1)
print("done in", round(time.time() - t, 1), "s;", len(out), "frames")
