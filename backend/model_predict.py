import os
import pickle
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.pkl')

_bundle = None


def _load():
    global _bundle
    if _bundle is None:
        with open(MODEL_PATH, 'rb') as f:
            _bundle = pickle.load(f)
    return _bundle


def predict_risk(features: dict) -> dict:
    bundle = _load()
    model  = bundle['model']
    feat_names = bundle['features']
    labels = bundle['labels']

    x = np.array([[features.get(f, 0.0) for f in feat_names]])

    probs = model.predict_proba(x)[0]
    class_idx = int(np.argmax(probs))

    score = int(min(100, round(probs[1] * 50 + probs[2] * 100)))

    importances = model.feature_importances_
    contributors = sorted(
        [{'feature': f, 'importance': round(float(imp), 3)}
         for f, imp in zip(feat_names, importances)],
        key=lambda x: -x['importance']
    )[:4]

    return {
        'risk_score': score,
        'risk_level': labels[class_idx],
        'class_probabilities': {
            'low':    round(float(probs[0]), 3),
            'medium': round(float(probs[1]), 3),
            'high':   round(float(probs[2]), 3),
        },
        'top_contributors': contributors,
    }
