import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.preprocessing import label_binarize

from generate_dataset import generate, FEATURES

LABELS    = ['low', 'medium', 'high']
MODEL_OUT = os.path.join(os.path.dirname(__file__), 'model.pkl')


def train(df=None):
    if df is None:
        df = generate()

    X = df[FEATURES].values
    y = df['risk_label'].values

    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=8,
        min_samples_leaf=4,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1,
    )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_results = cross_validate(
        model, X, y, cv=cv,
        scoring=['accuracy', 'f1_macro'],
        return_train_score=True,
    )

    print("=" * 55)
    print("CROSS-VALIDATION RESULTS (5-fold stratified)")
    print("=" * 55)
    print(f"  Train accuracy:  {cv_results['train_accuracy'].mean():.3f} ± {cv_results['train_accuracy'].std():.3f}")
    print(f"  Val   accuracy:  {cv_results['test_accuracy'].mean():.3f} ± {cv_results['test_accuracy'].std():.3f}")
    print(f"  Val   F1 macro:  {cv_results['test_f1_macro'].mean():.3f} ± {cv_results['test_f1_macro'].std():.3f}")

    model.fit(X, y)

    y_pred = model.predict(X)
    print("\nFull-dataset classification report:")
    print(classification_report(y, y_pred, target_names=LABELS))

    print("Confusion matrix (rows=actual, cols=predicted):")
    cm = confusion_matrix(y, y_pred)
    header = f"{'':>10}" + "".join(f"{l:>10}" for l in LABELS)
    print(header)
    for i, row in enumerate(cm):
        print(f"{LABELS[i]:>10}" + "".join(f"{v:>10}" for v in row))

    print("\nFeature importances (literature mapping):")
    importances = sorted(zip(FEATURES, model.feature_importances_), key=lambda x: -x[1])
    for feat, imp in importances:
        bar = "█" * int(imp * 40)
        print(f"  {feat:<40} {imp:.3f}  {bar}")

    bundle = {'model': model, 'features': FEATURES, 'labels': LABELS}
    with open(MODEL_OUT, 'wb') as f:
        pickle.dump(bundle, f)
    print(f"\nModel saved → {MODEL_OUT}")
    return model


if __name__ == '__main__':
    train()
