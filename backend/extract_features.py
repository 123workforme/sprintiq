import sys
import os
import math
import cv2
import mediapipe as mp

BaseOptions = mp.tasks.BaseOptions
PoseLandmarker = mp.tasks.vision.PoseLandmarker
PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
RunningMode = mp.tasks.vision.RunningMode

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'pose_landmarker_heavy.task')

L_HIP, R_HIP = 23, 24
L_KNEE, R_KNEE = 25, 26
L_ANKLE, R_ANKLE = 27, 28
L_HEEL, R_HEEL = 29, 30
L_FOOT, R_FOOT = 31, 32


def angle_3pts(a, b, c):
    ax, ay = a.x - b.x, a.y - b.y
    cx, cy = c.x - b.x, c.y - b.y
    dot = ax * cx + ay * cy
    mag = math.sqrt(ax**2 + ay**2) * math.sqrt(cx**2 + cy**2)
    if mag < 1e-6:
        return 0.0
    return math.degrees(math.acos(max(-1, min(1, dot / mag))))


def dist(a, b):
    return math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2)


def adaptive_contact(foot_y_series, threshold_pct=0.80):
    lo = min(foot_y_series)
    hi = max(foot_y_series)
    cutoff = lo + (hi - lo) * threshold_pct
    return [y >= cutoff for y in foot_y_series]


def extract_features(path):
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS)

    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=MODEL_PATH, delegate=BaseOptions.Delegate.CPU),
        running_mode=RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    left_knee_angles, right_knee_angles = [], []
    left_ankle_angles, right_ankle_angles = [], []
    left_hip_angles, right_hip_angles = [], []
    left_foot_y, right_foot_y = [], []
    stride_widths = []
    frame_num = 0

    with PoseLandmarker.create_from_options(options) as landmarker:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            timestamp_ms = int(cap.get(cv2.CAP_PROP_POS_MSEC))
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            result = landmarker.detect_for_video(mp_image, timestamp_ms)

            if result.pose_landmarks:
                lm = result.pose_landmarks[0]

                left_knee_angles.append(angle_3pts(lm[L_HIP], lm[L_KNEE], lm[L_ANKLE]))
                right_knee_angles.append(angle_3pts(lm[R_HIP], lm[R_KNEE], lm[R_ANKLE]))

                left_ankle_angles.append(angle_3pts(lm[L_KNEE], lm[L_ANKLE], lm[L_FOOT]))
                right_ankle_angles.append(angle_3pts(lm[R_KNEE], lm[R_ANKLE], lm[R_FOOT]))

                left_hip_angles.append(angle_3pts(lm[L_KNEE], lm[L_HIP], lm[R_HIP]))
                right_hip_angles.append(angle_3pts(lm[R_KNEE], lm[R_HIP], lm[L_HIP]))

                left_foot_y.append(lm[L_FOOT].y)
                right_foot_y.append(lm[R_FOOT].y)

                stride_widths.append(abs(lm[L_ANKLE].x - lm[R_ANKLE].x))

            frame_num += 1

    cap.release()

    left_grounded_frames = adaptive_contact(left_foot_y)
    right_grounded_frames = adaptive_contact(right_foot_y)

    if frame_num == 0 or not left_knee_angles:
        print("No pose detected in video.")
        sys.exit(1)

    def mean(lst): return sum(lst) / len(lst) if lst else 0
    def mn(lst): return min(lst) if lst else 0
    def mx(lst): return max(lst) if lst else 0

    left_contact_s = sum(left_grounded_frames) / fps
    right_contact_s = sum(right_grounded_frames) / fps

    contact_asymmetry = (
        max(left_contact_s, right_contact_s) / min(left_contact_s, right_contact_s)
        if min(left_contact_s, right_contact_s) > 0 else 1.0
    )

    features = {
        'left_knee_flexion_min':   round(mn(left_knee_angles), 1),
        'right_knee_flexion_min':  round(mn(right_knee_angles), 1),
        'left_knee_flexion_mean':  round(mean(left_knee_angles), 1),
        'right_knee_flexion_mean': round(mean(right_knee_angles), 1),

        'left_ankle_dorsiflexion_min':   round(mn(left_ankle_angles), 1),
        'right_ankle_dorsiflexion_min':  round(mn(right_ankle_angles), 1),
        'left_ankle_dorsiflexion_mean':  round(mean(left_ankle_angles), 1),
        'right_ankle_dorsiflexion_mean': round(mean(right_ankle_angles), 1),

        'ankle_asymmetry_mean_deg': round(
            abs(mean(left_ankle_angles) - mean(right_ankle_angles)), 1
        ),
        'ankle_asymmetry_peak_deg': round(
            abs(mn(left_ankle_angles) - mn(right_ankle_angles)), 1
        ),

        'hip_drive_asymmetry_deg': round(
            abs(mean(left_hip_angles) - mean(right_hip_angles)), 1
        ),

        'left_hip_angle_mean':  round(mean(left_hip_angles), 1),
        'right_hip_angle_mean': round(mean(right_hip_angles), 1),

        'left_contact_time_s':  round(left_contact_s, 3),
        'right_contact_time_s': round(right_contact_s, 3),
        'contact_time_asymmetry_ratio': round(contact_asymmetry, 3),

        'stride_width_mean': round(mean(stride_widths), 3),

        'fps': round(fps, 1),
        'total_frames': frame_num,
        'duration_s': round(frame_num / fps, 2),
    }

    return features


def compute_flags(features):
    flags = []

    for side, key in [('left', 'left_ankle_dorsiflexion_min'), ('right', 'right_ankle_dorsiflexion_min')]:
        val = features[key]
        if val > 100:
            flags.append({
                'metric': 'ankle_dorsiflexion',
                'side': side,
                'severity': 'high',
                'message': f'{side.upper()} ankle dorsiflexion restricted ({val}° peak) - reduced shock absorption during stance',
                'recommendation': 'Perform calf stretching and ankle mobility drills daily. Restricted dorsiflexion is a documented shin splint and Achilles tendinopathy precursor.',
                'citation': 'Kaufman KR et al. (2000). Stress fractures and muscle strength. Am J Sports Med.',
            })

    peak_asym = features['ankle_asymmetry_peak_deg']
    if peak_asym > 30:
        weak = 'right' if features['right_ankle_dorsiflexion_min'] > features['left_ankle_dorsiflexion_min'] else 'left'
        flags.append({
            'metric': 'ankle_dorsiflexion_asymmetry',
            'side': weak,
            'severity': 'high',
            'message': f'{weak.upper()} ankle reaching {peak_asym}° less dorsiflexion than opposite side - asymmetric loading pattern',
            'recommendation': 'Unilateral ankle mobility work on the restricted side. Single-leg calf raises and banded dorsiflexion mobilizations.',
            'citation': 'Willems TM et al. (2004). Gait-related risk factors for lower-leg pain. Med Sci Sports Exerc.',
        })
    elif peak_asym > 18:
        weak = 'right' if features['right_ankle_dorsiflexion_min'] > features['left_ankle_dorsiflexion_min'] else 'left'
        flags.append({
            'metric': 'ankle_dorsiflexion_asymmetry',
            'side': weak,
            'severity': 'medium',
            'message': f'Ankle dorsiflexion asymmetry of {peak_asym}° between sides - monitor for shin splint or ITB symptoms',
            'recommendation': 'Add foam rolling to calves and peroneals after sessions. Recheck after 2 weeks of mobility work.',
            'citation': 'Willems TM et al. (2004). Gait-related risk factors for lower-leg pain. Med Sci Sports Exerc.',
        })

    if features['ankle_asymmetry_mean_deg'] > 8:
        flags.append({
            'metric': 'ankle_dorsiflexion_mean_asymmetry',
            'side': 'bilateral',
            'severity': 'medium',
            'message': f'Ankle loading asymmetry {features["ankle_asymmetry_mean_deg"]}° throughout stride - one ankle consistently less mobile',
            'recommendation': 'Prioritize pre-run ankle mobility protocol. Check for tightness differences in the posterior chain between sides.',
            'citation': 'Willems TM et al. (2004). Gait-related risk factors for lower-leg pain. Med Sci Sports Exerc.',
        })

    for side, key in [('left', 'left_knee_flexion_min'), ('right', 'right_knee_flexion_min')]:
        if features[key] > 155:
            flags.append({
                'metric': 'knee_flexion',
                'side': side,
                'severity': 'high',
                'message': f'{side.upper()} knee nearly straight at ground contact - overstriding increases impact loading',
                'recommendation': 'Focus on landing with foot under your center of mass. Drill: high-knee A skips to reinforce proper foot strike position.',
                'citation': 'Heiderscheit BC et al. (2011). Effects of step rate manipulation on joint mechanics. Med Sci Sports Exerc.',
            })

    hip_asym = features['hip_drive_asymmetry_deg']
    if hip_asym > 25:
        weak = 'left' if features['left_hip_angle_mean'] < features['right_hip_angle_mean'] else 'right'
        flags.append({
            'metric': 'hip_drive',
            'side': weak,
            'severity': 'high',
            'message': f'{weak.upper()} hip drive {hip_asym}° less than opposite side - asymmetric propulsion force',
            'recommendation': 'Single-leg hip extension drills and glute activation work on the weaker side. Film from behind to check pelvic drop.',
            'citation': 'Noehren B et al. (2007). Prospective study of hip mechanics on ITBS. Clin Biomech.',
        })
    elif hip_asym > 16:
        weak = 'left' if features['left_hip_angle_mean'] < features['right_hip_angle_mean'] else 'right'
        flags.append({
            'metric': 'hip_drive',
            'side': weak,
            'severity': 'medium',
            'message': f'{weak.upper()} hip drive {hip_asym}° less than opposite side - one side generating less extension force',
            'recommendation': 'Add banded hip extension drills and unilateral glute bridges to address the imbalance.',
            'citation': 'Noehren B et al. (2007). Prospective study of hip mechanics on ITBS. Clin Biomech.',
        })

    gct_ratio = features['contact_time_asymmetry_ratio']
    fps = features['fps']
    if gct_ratio > 1.40 and fps >= 60:
        flags.append({
            'metric': 'ground_contact',
            'side': 'bilateral',
            'severity': 'medium',
            'message': f'Ground contact asymmetry ratio {gct_ratio} - one leg loading longer per stride',
            'recommendation': 'Check for tightness or pain on the shorter-contact side. This pattern often reflects subconscious off-loading of a sore limb.',
            'citation': 'Barnes A et al. (2010). Ground contact asymmetry and running injury. Int J Sports Physiol Perform.',
        })

    return flags


def compute_risk_score(flags):
    score = 0
    for f in flags:
        score += 25 if f['severity'] == 'high' else 10
    return min(score, 100)


def print_features(features):
    print("\n" + "=" * 50)
    print("EXTRACTED BIOMECHANICAL FEATURES")
    print("=" * 50)

    sections = [
        ("Knee Flexion (degrees - lower = more bent at contact)", [
            'left_knee_flexion_min', 'right_knee_flexion_min',
            'left_knee_flexion_mean', 'right_knee_flexion_mean',
        ]),
        ("Ankle Dorsiflexion (degrees - lower = more dorsiflexion = better)", [
            'left_ankle_dorsiflexion_min', 'right_ankle_dorsiflexion_min',
            'left_ankle_dorsiflexion_mean', 'right_ankle_dorsiflexion_mean',
            'ankle_asymmetry_mean_deg', 'ankle_asymmetry_peak_deg',
        ]),
        ("Hip Drive", [
            'left_hip_angle_mean', 'right_hip_angle_mean', 'hip_drive_asymmetry_deg',
        ]),
        ("Ground Contact Time", [
            'left_contact_time_s', 'right_contact_time_s',
            'contact_time_asymmetry_ratio',
        ]),
        ("Stride", ['stride_width_mean']),
        ("Video Info", ['fps', 'total_frames', 'duration_s']),
    ]

    for title, keys in sections:
        print(f"\n{title}")
        for k in keys:
            print(f"  {k:<40} {features[k]}")

    flags = compute_flags(features)
    score = compute_risk_score(flags)

    print(f"\n{'=' * 50}")
    print(f"RISK SCORE: {score}/100")
    print("=" * 50)

    if flags:
        for f in flags:
            sev = "⚠⚠" if f['severity'] == 'high' else "⚠ "
            print(f"\n  {sev}  {f['message']}")
            print(f"      → {f['recommendation']}")
    else:
        print("  No flags raised - mechanics look balanced in this clip.")
    print()


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python extract_features.py <video_path>")
        sys.exit(1)
    features = extract_features(sys.argv[1])
    print_features(features)
