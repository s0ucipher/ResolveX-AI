"""
Model Training & Grouped Evaluation Script for ComplainAI.
Trains a TF-IDF + Logistic Regression classification pipeline on complaint data.
Uses StratifiedGroupKFold grouped by template_group so no template family leaks
between training and evaluation folds, fitting the vectorizer on training folds only.
"""

import os
import json
import csv
import joblib
import sklearn
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "synthetic_complaints.csv")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "classifier_model.joblib")
REPORT_JSON_PATH = os.path.join(os.path.dirname(__file__), "evaluation_report.json")
REPORT_TXT_PATH = os.path.join(os.path.dirname(__file__), "evaluation_report.txt")


def preprocess_text(title: str, description: str) -> str:
    clean_title = (title or "").strip()
    clean_desc = (description or "").strip()
    return f"{clean_title}. {clean_title}. {clean_desc}".lower()


def load_dataset(csv_path: str):
    texts = []
    labels = []
    groups = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader):
            text = preprocess_text(row["title"], row["description"])
            texts.append(text)
            labels.append(row["category"])
            groups.append(row.get("template_group") or f"row_{idx}")
    return np.array(texts), np.array(labels), np.array(groups)


def build_pipeline() -> Pipeline:
    return Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            sublinear_tf=True,
            min_df=1,
            max_df=0.90,
            strip_accents="unicode"
        )),
        ("clf", LogisticRegression(
            C=2.0,
            max_iter=1000,
            class_weight="balanced",
            random_state=42
        ))
    ])


def train_and_evaluate():
    print(f"Loading dataset from: {DATA_PATH}")
    texts, labels, groups = load_dataset(DATA_PATH)
    total_samples = len(texts)
    unique_classes = sorted(list(set(labels.tolist())))
    unique_groups = sorted(list(set(groups.tolist())))
    print(f"Total samples: {total_samples}, Classes: {len(unique_classes)}, Template groups: {len(unique_groups)}")

    # 5-fold StratifiedGroupKFold with reproducible seed (zero template-family overlap)
    cv = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42)
    oof_preds = np.empty(total_samples, dtype=object)

    for fold_idx, (train_idx, test_idx) in enumerate(cv.split(texts, labels, groups), start=1):
        train_groups = set(groups[train_idx].tolist())
        test_groups = set(groups[test_idx].tolist())
        overlap = train_groups.intersection(test_groups)
        assert not overlap, f"Template group leakage detected in fold {fold_idx}: {overlap}"

        fold_pipeline = build_pipeline()
        fold_pipeline.fit(texts[train_idx], labels[train_idx])
        oof_preds[test_idx] = fold_pipeline.predict(texts[test_idx])

    # Pooled out-of-fold metrics
    acc = accuracy_score(labels, oof_preds)
    macro_f1 = f1_score(labels, oof_preds, average="macro")
    weighted_f1 = f1_score(labels, oof_preds, average="weighted")
    clf_report = classification_report(labels, oof_preds, output_dict=True, zero_division=0)
    conf_matrix = confusion_matrix(labels, oof_preds, labels=unique_classes).tolist()

    # Fit final production pipeline on full synthetic dataset
    final_pipeline = build_pipeline()
    final_pipeline.fit(texts, labels)

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(final_pipeline, MODEL_PATH)
    print(f"Model persisted to: {MODEL_PATH}")

    report_data = {
        "status": "completed",
        "dataset": {
            "path": "data/synthetic_complaints.csv",
            "dataset_type": "synthetic",
            "total_samples": total_samples,
            "template_group_count": len(unique_groups),
            "evaluated_samples": total_samples,
            "num_classes": len(unique_classes),
            "classes": unique_classes,
            "split_method": "5-fold StratifiedGroupKFold (grouped by template_group, seed=42)",
            "campus_performance_note": (
                "Evaluated on synthetic template-grouped data only. Real campus complaint "
                "accuracy is unknown until an independently collected and labeled campus "
                "dataset is evaluated."
            ),
        },
        "model_architecture": {
            "vectorizer": "TF-IDF (ngram_range=(1,2), sublinear_tf=True)",
            "classifier": "LogisticRegression (C=2.0, class_weight='balanced')",
            "pipeline": "sklearn.pipeline.Pipeline",
            "sklearn_version": sklearn.__version__,
            "model_version": f"tfidf-logreg-sklearn-{sklearn.__version__}",
        },
        "metrics": {
            "accuracy": round(float(acc), 4),
            "macro_f1": round(float(macro_f1), 4),
            "weighted_f1": round(float(weighted_f1), 4),
            "per_class": {
                cls: {
                    "precision": round(float(clf_report[cls]["precision"]), 4),
                    "recall": round(float(clf_report[cls]["recall"]), 4),
                    "f1_score": round(float(clf_report[cls]["f1-score"]), 4),
                    "support": int(clf_report[cls]["support"]),
                }
                for cls in unique_classes if cls in clf_report
            },
            "confusion_matrix": conf_matrix,
            "classes_order": unique_classes,
        },
    }

    with open(REPORT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)

    with open(REPORT_TXT_PATH, "w", encoding="utf-8") as f:
        f.write("=" * 70 + "\n")
        f.write("COMPLAINAI - MACHINE LEARNING MODEL EVALUATION REPORT (GROUPED CV)\n")
        f.write("=" * 70 + "\n\n")
        f.write(f"Dataset Type:       Synthetic (data/synthetic_complaints.csv)\n")
        f.write(f"Dataset Size:       {total_samples} samples, {len(unique_groups)} template groups, {len(unique_classes)} classes\n")
        f.write(f"Split Method:       5-fold StratifiedGroupKFold (grouped by template_group, seed=42)\n")
        f.write(f"scikit-learn:       {sklearn.__version__}\n")
        f.write("Note:               Real campus performance is unknown without an independently collected campus dataset.\n\n")
        f.write(f"Pooled Accuracy:    {acc * 100:.2f}%\n")
        f.write(f"Macro F1-Score:     {macro_f1:.4f}\n")
        f.write(f"Weighted F1-Score:  {weighted_f1:.4f}\n\n")
        f.write("Per-Class Performance:\n")
        f.write("-" * 70 + "\n")
        f.write(f"{'Category':<38} | {'Prec':<6} | {'Recall':<6} | {'F1':<6} | {'Support'}\n")
        f.write("-" * 70 + "\n")
        for cls in unique_classes:
            m = report_data["metrics"]["per_class"].get(cls, {})
            f.write(f"{cls:<38} | {m.get('precision', 0.0):<6.3f} | {m.get('recall', 0.0):<6.3f} | {m.get('f1_score', 0.0):<6.3f} | {m.get('support', 0)}\n")
        f.write("-" * 70 + "\n\n")
        f.write("Confusion Matrix:\n")
        for row in conf_matrix:
            f.write(f"  {row}\n")

    print("=" * 70)
    print(f"Model Training Complete! Pooled Grouped Accuracy: {acc*100:.2f}%, Macro F1: {macro_f1:.4f}")
    print(f"Saved evaluation report to: {REPORT_JSON_PATH}")
    print("=" * 70)
    return report_data


if __name__ == "__main__":
    train_and_evaluate()
