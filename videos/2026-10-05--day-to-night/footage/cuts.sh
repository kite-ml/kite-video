#!/bin/bash
# Frame sequences for the stage (run from the project root; writes video/stage/assets/<shot>/f_%04d.jpg).
# Sources: E = the episode 0 per-camera videos (`kite augment download` of the relight and video-augmentation runs,
# H.264 copies in ~/Downloads/kite-relight-videos/episode-0), D = footage/distractor (gen_distractor_v2.py output),
# X = the 2026-07-01 video-augmentation test exports (~/Desktop/kite-omni-*).
A=video/stage/assets; E=~/Downloads/kite-relight-videos/episode-0; D=footage/distractor; X=~/Desktop
seq() { mkdir -p "$A/$1"; ffmpeg -nostdin -v error -y -ss "$3" -t "$4" -i "$2" -vf "fps=${5},scale=${6}:flags=lanczos" -q:v 3 "$A/$1/f_%04d.jpg"; }
seq hook_day    $E/original_top.mp4 1 6 15 880:660
seq mech_day    $E/original_top.mp4 13 6 15 720:540
seq mech_relit  $E/relit_top.mp4    13 6 15 720:540
seq proof_rec   $E/original_top.mp4 5 6 15 960:720
seq proof_relit $E/relit_top.mp4    5 6 15 960:720
seq rng_distract_in  $D/input_top.mp4     0 5 15 560:420
seq rng_distract_out $D/output_top_v2.mp4 0 5 15 560:420
seq rng_bg_in   $X/kite-omni-aloha-cabinet-tiledwalls/input_cam_high.mp4  0 3 15 560:420
seq rng_bg_out  $X/kite-omni-aloha-cabinet-tiledwalls/output_cam_high.mp4 0 3 15 560:420
seq rng_surf_in  $X/kite-omni-episode0/input_cam_left_high.mp4  0 5 15 560:420
seq rng_surf_out $X/kite-omni-episode0/output_cam_left_high.mp4 0 5 15 560:420
# closing wall: 12 fps, 384x288, up to 4.8 s, played once (wall.js holds the frame counts)
seq w_api_top    $E/relit_top.mp4                  30 4.8 12 384:288
seq w_api_left   $E/relit_left_wrist.mp4           10 4.8 12 384:288
seq w_gen_top    $E/video-augmentation_top.mp4     12 4.8 12 384:288
seq w_gen_left   $E/video-augmentation_left_wrist.mp4 5 4.8 12 384:288
seq w_distract   $D/output_top_v2.mp4             0.2 4.8 12 384:288
seq w_bg_high    $X/kite-omni-aloha-cabinet-tiledwalls/output_cam_high.mp4       0.5 2.5 12 384:288
seq w_bg_left    $X/kite-omni-aloha-cabinet-tiledwalls/output_cam_left_wrist.mp4 0.5 2.5 12 384:288
seq w_spot_high  $X/kite-omni-aloha-spotlight/output_cam_high.mp4                0.5 2.5 12 384:288
seq w_spot_right $X/kite-omni-aloha-spotlight/output_cam_right_wrist.mp4         0.5 2.5 12 384:288
seq w_surf_left  $X/kite-omni-episode0/output_cam_left_high.mp4  0.2 4.8 12 384:288
seq w_surf_right $X/kite-omni-episode0/output_cam_right_high.mp4 0.2 4.8 12 384:288
# the dataset's own relit episodes (w_ds_*), the live evening stills and actions.js: python footage/hub_assets.py
