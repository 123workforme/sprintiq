import numpy as np
import pandas as pd
import os

SEED = 42
N = 350
rng = np.random.default_rng(SEED)

FEATURES = [
    'left_ankle_dorsiflexion_min',
    'right_ankle_dorsiflexion_min',
    'ankle_asymmetry_peak_deg',
    'ankle_asymmetry_mean_deg',
    'left_knee_flexion_mean',
    'right_knee_flexion_mean',
    'hip_drive_asymmetry_deg',
]


def _clip(arr, lo, hi):
    return np.clip(arr, lo, hi)


def gen_low(n):
    left  = _clip(rng.normal(50, 12, n), 18, 75)
    right = _clip(rng.normal(52, 12, n), 18, 75)
    return pd.DataFrame({
        'left_ankle_dorsiflexion_min':  left,
        'right_ankle_dorsiflexion_min': right,
        'ankle_asymmetry_peak_deg':     _clip(np.abs(left - right) + rng.normal(0, 3, n), 0, 18),
        'ankle_asymmetry_mean_deg':     _clip(rng.normal(5, 3, n), 0, 14),
        'left_knee_flexion_mean':       _clip(rng.normal(125, 10, n), 95, 165),
        'right_knee_flexion_mean':      _clip(rng.normal(126, 10, n), 95, 165),
        'hip_drive_asymmetry_deg':      _clip(rng.normal(7, 4, n), 0, 15),
        'risk_label': 0,
    })


def gen_medium(n):
    dominant = rng.integers(0, 2, n)
    good_ankle  = _clip(rng.normal(50, 10, n), 25, 72)
    weak_ankle  = _clip(rng.normal(82, 10, n), 65, 105)
    left  = np.where(dominant == 0, weak_ankle, good_ankle)
    right = np.where(dominant == 1, weak_ankle, good_ankle)
    return pd.DataFrame({
        'left_ankle_dorsiflexion_min':  left,
        'right_ankle_dorsiflexion_min': right,
        'ankle_asymmetry_peak_deg':     _clip(np.abs(left - right) + rng.normal(0, 4, n), 14, 32),
        'ankle_asymmetry_mean_deg':     _clip(rng.normal(14, 5, n), 5, 28),
        'left_knee_flexion_mean':       _clip(rng.normal(124, 12, n), 90, 165),
        'right_knee_flexion_mean':      _clip(rng.normal(125, 12, n), 90, 165),
        'hip_drive_asymmetry_deg':      _clip(rng.normal(19, 4, n), 12, 30),
        'risk_label': 1,
    })


def gen_high(n):
    dominant = rng.integers(0, 2, n)
    good_ankle  = _clip(rng.normal(48, 12, n), 18, 72)
    weak_ankle  = _clip(rng.normal(105, 12, n), 82, 140)
    left  = np.where(dominant == 0, weak_ankle, good_ankle)
    right = np.where(dominant == 1, weak_ankle, good_ankle)
    return pd.DataFrame({
        'left_ankle_dorsiflexion_min':  left,
        'right_ankle_dorsiflexion_min': right,
        'ankle_asymmetry_peak_deg':     _clip(np.abs(left - right) + rng.normal(0, 5, n), 26, 100),
        'ankle_asymmetry_mean_deg':     _clip(rng.normal(24, 6, n), 10, 50),
        'left_knee_flexion_mean':       _clip(rng.normal(128, 14, n), 90, 175),
        'right_knee_flexion_mean':      _clip(rng.normal(128, 14, n), 90, 175),
        'hip_drive_asymmetry_deg':      _clip(rng.normal(28, 5, n), 20, 50),
        'risk_label': 2,
    })


def generate(output_path=None):
    df = pd.concat([gen_low(N), gen_medium(N), gen_high(N)], ignore_index=True)
    df = df.sample(frac=1, random_state=SEED).reset_index(drop=True)

    for col in FEATURES:
        df[col] = df[col].round(1)

    if output_path:
        df.to_csv(output_path, index=False)
        print(f"Saved {len(df)} samples to {output_path}")
        print(df['risk_label'].value_counts().sort_index()
              .rename({0: 'low', 1: 'medium', 2: 'high'}).to_string())

    return df


if __name__ == '__main__':
    out = os.path.join(os.path.dirname(__file__), 'training_data.csv')
    generate(out)
