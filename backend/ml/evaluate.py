"""
Evaluation utility for ComplainAI classification model.
Runs 5-fold StratifiedGroupKFold grouped by template_group (fitting the
vectorizer on training folds only) and verifies zero template-family overlap.
"""

import os
import json
import numpy as np
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.metrics import accuracy_score, f1_score

from backend.ml.train import load_dataset, build_pipeline, DATA_PATH, REPORT_JSON_PATH


def evaluate():
    texts, labels, groups = load_dataset(DATA_PATH)
    cv = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42)
    oof_preds = np.empty(len(texts), dtype=object)

    for fold_idx, (train_idx, test_idx) in enumerate(cv.split(texts, labels, groups), start=1):
        overlap = set(groups[train_idx].tolist()).intersection(set(groups[test_idx].tolist()))
        assert not overlap, f"Template group leakage in fold {fold_idx}: {overlap}"
        fold_pipeline = build_pipeline()
        fold_pipeline.fit(texts[train_idx], labels[train_idx])
        oof_preds[test_idx] = fold_pipeline.predict(texts[test_idx])

    acc = accuracy_score(labels, oof_preds)
    macro_f1 = f1_score(labels, oof_preds, average="macro")

    print(f"5-Fold Grouped CV Results (N={len(texts)}, Groups={len(set(groups.tolist()))}):")
    print(f"Pooled Accuracy: {acc*100:.2f}%")
    print(f"Macro F1: {macro_f1:.4f}")

    if os.path.exists(REPORT_JSON_PATH):
        with open(REPORT_JSON_PATH, "r", encoding="utf-8") as f:
            stored = json.load(f)
        print(f"Stored Report: {stored.get('dataset', {}).get('total_samples')} samples, "
              f"split={stored.get('dataset', {}).get('split_method')}")
        return stored
    return {"metrics": {"accuracy": round(float(acc), 4), "macro_f1": round(float(macro_f1), 4)}}


if __name__ == "__main__":
    evaluate()
