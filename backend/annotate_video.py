import cv2
import math
import os
import subprocess
import tempfile
import mediapipe as mp

BaseOptions = mp.tasks.BaseOptions
PoseLandmarker = mp.tasks.vision.PoseLandmarker
PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
RunningMode = mp.tasks.vision.RunningMode

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'pose_landmarker_heavy.task')

YELLOW  = (21, 204, 250)
WHITE   = (220, 220, 220)
RED     = (60,  60,  230)
GREEN   = (100, 210, 100)
GRAY    = (70,  70,  70)

UPPER_CONNECTIONS = [
    (9,10),(11,12),(11,13),(13,15),(12,14),(14,16),(11,23),(12,24),(23,24),
]
LOWER_CONNECTIONS = [
    (23,25),(24,26),(25,27),(26,28),
    (27,29),(28,30),(29,31),(30,32),(27,31),(28,32),
]
LOWER_LANDMARKS = set(range(23, 33))
LEFT_LOWER  = {23, 25, 27, 29, 31}
RIGHT_LOWER = {24, 26, 28, 30, 32}

RISK_BGR = {'low': (100, 210, 100), 'medium': (21, 204, 250), 'high': (60, 60, 230)}


def _angle(a, b, c):
    ax, ay = a.x - b.x, a.y - b.y
    cx, cy = c.x - b.x, c.y - b.y
    dot = ax*cx + ay*cy
    mag = math.sqrt(ax**2+ay**2) * math.sqrt(cx**2+cy**2)
    if mag < 1e-6:
        return 0.0
    return math.degrees(math.acos(max(-1.0, min(1.0, dot/mag))))


def _px(lm, w, h):
    return (int(lm.x * w), int(lm.y * h))


def annotate_video(input_path: str, output_path: str, analysis_result: dict):
    cap = cv2.VideoCapture(input_path)
    fps   = cap.get(cv2.CAP_PROP_FPS) or 30.0
    w     = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h     = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    risk_score = analysis_result['risk_score']
    risk_level = analysis_result['risk_level']
    flags      = analysis_result['flags']
    risk_color = RISK_BGR.get(risk_level, YELLOW)

    flagged_sides = {f['side'] for f in flags if f['side'] in ('left', 'right')}

    tmp_raw = tempfile.mktemp(suffix='.avi')
    out = cv2.VideoWriter(tmp_raw, cv2.VideoWriter_fourcc(*'MJPG'), fps, (w, h))

    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=MODEL_PATH, delegate=BaseOptions.Delegate.CPU),
        running_mode=RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    with PoseLandmarker.create_from_options(options) as landmarker:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            timestamp_ms = int(cap.get(cv2.CAP_PROP_POS_MSEC))
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            result = landmarker.detect_for_video(mp_image, timestamp_ms)

            overlay = frame.copy()
            cv2.rectangle(overlay, (0, 0), (w, 60), (0, 0, 0), -1)
            cv2.addWeighted(overlay, 0.65, frame, 0.35, 0, frame)

            cv2.putText(frame, f"SPRINTIQ  |  Risk Score: {risk_score}/100",
                        (12, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.55, WHITE, 1, cv2.LINE_AA)
            cv2.putText(frame, risk_level.upper() + " RISK",
                        (12, 46), cv2.FONT_HERSHEY_SIMPLEX, 0.6, risk_color, 2, cv2.LINE_AA)

            for i, flag in enumerate(flags[:3]):
                color = RED if flag['severity'] == 'high' else YELLOW
                label = flag['metric'].replace('_', ' ').upper()
                tw, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.38, 1)[0], None
                cv2.putText(frame, label, (w - tw[0] - 10, 18 + i * 16),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.38, color, 1, cv2.LINE_AA)

            if result.pose_landmarks:
                lm = result.pose_landmarks[0]

                for a, b in UPPER_CONNECTIONS:
                    if lm[a].visibility > 0.4 and lm[b].visibility > 0.4:
                        cv2.line(frame, _px(lm[a], w, h), _px(lm[b], w, h), GRAY, 1, cv2.LINE_AA)

                for a, b in LOWER_CONNECTIONS:
                    if lm[a].visibility > 0.4 and lm[b].visibility > 0.4:
                        is_left = a in LEFT_LOWER
                        flagged = (is_left and 'left' in flagged_sides) or \
                                  (not is_left and 'right' in flagged_sides)
                        cv2.line(frame, _px(lm[a], w, h), _px(lm[b], w, h),
                                 RED if flagged else YELLOW, 2, cv2.LINE_AA)

                for i in range(33):
                    if lm[i].visibility < 0.4:
                        continue
                    px = _px(lm[i], w, h)
                    if i in LOWER_LANDMARKS:
                        flagged = (i in LEFT_LOWER and 'left' in flagged_sides) or \
                                  (i in RIGHT_LOWER and 'right' in flagged_sides)
                        cv2.circle(frame, px, 5, RED if flagged else YELLOW, -1, cv2.LINE_AA)
                        cv2.circle(frame, px, 5, (0, 0, 0), 1, cv2.LINE_AA)
                    else:
                        cv2.circle(frame, px, 2, GRAY, -1, cv2.LINE_AA)

                for side_char, ki, ai, fi in [('L', 25, 27, 31), ('R', 26, 28, 32)]:
                    knee, ankle, foot = lm[ki], lm[ai], lm[fi]
                    if min(knee.visibility, ankle.visibility, foot.visibility) > 0.4:
                        ang = _angle(knee, ankle, foot)
                        px  = _px(ankle, w, h)
                        flagged = (side_char == 'L' and 'left' in flagged_sides) or \
                                  (side_char == 'R' and 'right' in flagged_sides)
                        cv2.putText(frame, f"{ang:.0f}deg",
                                    (px[0] + 8, px[1] - 6),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.42,
                                    RED if flagged else GREEN, 1, cv2.LINE_AA)

                for hi, ki, ai in [(23, 25, 27), (24, 26, 28)]:
                    hip, knee, ankle = lm[hi], lm[ki], lm[ai]
                    if min(hip.visibility, knee.visibility, ankle.visibility) > 0.4:
                        ang = _angle(hip, knee, ankle)
                        px  = _px(knee, w, h)
                        cv2.putText(frame, f"{ang:.0f}deg",
                                    (px[0] + 8, px[1] - 6),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, WHITE, 1, cv2.LINE_AA)

            out.write(frame)

    cap.release()
    out.release()

    subprocess.run(
        ['ffmpeg', '-y', '-i', tmp_raw,
         '-vcodec', 'libx264', '-pix_fmt', 'yuv420p',
         '-preset', 'fast', '-crf', '23',
         output_path],
        check=True,
        capture_output=True,
    )
    os.unlink(tmp_raw)
