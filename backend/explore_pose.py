"""
Phase 1: MediaPipe Pose exploration (Tasks API, v0.10+).
Run on any video of someone running:
  python explore_pose.py <video_path>
Prints keypoint coordinates for every Nth frame so you can see what the data looks like.
"""

import sys
import cv2
import mediapipe as mp
import os

BaseOptions = mp.tasks.BaseOptions
PoseLandmarker = mp.tasks.vision.PoseLandmarker
PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
RunningMode = mp.tasks.vision.RunningMode

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'pose_landmarker_heavy.task')

# Landmark indices for lower body (same numbering as before)
LOWER_BODY = {
    23: 'LEFT_HIP',
    24: 'RIGHT_HIP',
    25: 'LEFT_KNEE',
    26: 'RIGHT_KNEE',
    27: 'LEFT_ANKLE',
    28: 'RIGHT_ANKLE',
    29: 'LEFT_HEEL',
    30: 'RIGHT_HEEL',
    31: 'LEFT_FOOT_INDEX',
    32: 'RIGHT_FOOT_INDEX',
}

PRINT_EVERY = 15  # print every N frames


def process_video(path):
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        print(f"Could not open video: {path}")
        sys.exit(1)

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"\nVideo: {path}")
    print(f"FPS: {fps:.1f}  |  Total frames: {total_frames}  |  Duration: {total_frames/fps:.2f}s")
    print(f"\n{'Frame':>6}  {'t(s)':>5}  {'Landmark':<20}  {'x':>6}  {'y':>6}  {'z':>8}  {'vis':>6}")
    print("-" * 68)

    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    with PoseLandmarker.create_from_options(options) as landmarker:
        frame_num = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            timestamp_ms = int(cap.get(cv2.CAP_PROP_POS_MSEC))
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            result = landmarker.detect_for_video(mp_image, timestamp_ms)

            if result.pose_landmarks:
                landmarks = result.pose_landmarks[0]  # first (only) person
                t = timestamp_ms / 1000.0
                for idx, name in LOWER_BODY.items():
                    pt = landmarks[idx]
                    if frame_num % PRINT_EVERY == 0:
                        print(f"{frame_num:>6}  {t:>5.2f}  {name:<20}  {pt.x:>6.3f}  {pt.y:>6.3f}  {pt.z:>8.4f}  {pt.visibility:>6.3f}")
                if frame_num % PRINT_EVERY == 0:
                    print()
            else:
                if frame_num % PRINT_EVERY == 0:
                    t = timestamp_ms / 1000.0
                    print(f"{frame_num:>6}  {t:>5.2f}  [no pose detected]\n")

            frame_num += 1

    cap.release()
    print(f"Done. Processed {frame_num} frames.\n")
    print("What to look for:")
    print("  HEEL y going flat across frames  → foot is on the ground (ground contact)")
    print("  ANKLE y < KNEE y                 → knee drive phase")
    print("  LEFT vs RIGHT symmetry           → stride asymmetry (injury risk flag)")
    print("  visibility < 0.5                 → MediaPipe lost confidence (legs crossing)")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python explore_pose.py <path_to_video>")
        sys.exit(1)
    process_video(sys.argv[1])
