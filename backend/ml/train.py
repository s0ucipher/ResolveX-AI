"""
Model Training Script for ComplainAI.
Trains a TF-IDF + Logistic Regression classification pipeline on complaint data.
Evaluates model on held-out test set and saves serialised pipeline and evaluation reports.
"""

import os
import json
import csv
import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "synthetic_complaints.csv")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "classifier_model.joblib")
REPORT_JSON_PATH = os.path.join(os.path.dirname(__file__), "evaluation_report.json")
REPORT_TXT_PATH = os.path.join(os.path.dirname(__file__), "evaluation_report.txt")

def preprocess_text(title: str, description: str) -> str:
    clean_title = (title or "").strip()
    clean_desc = (description or "").strip()
    # Give higher weight to title by duplicating it slightly in representation
    return f"{clean_title}. {clean_title}. {clean_desc}".lower()

def load_dataset(csv_path: str):
    texts = []
    labels = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            text = preprocess_text(row["title"], row["description"])
            texts.append(text)
            labels.append(row["category"])
    return texts, labels

def train_and_evaluate():
    print(f"Loading dataset from: {DATA_PATH}")
    texts, labels = load_dataset(DATA_PATH)
    total_samples = len(texts)
    unique_classes = sorted(list(set(labels)))
    print(f"Total samples: {total_samples}, Classes: {len(unique_classes)}")

    # Stratified train/test split (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(
        texts,
        labels,
        test_size=0.20,
        random_state=42,
        stratify=labels
    )
    print(f"Train size: {len(X_train)}, Test size: {len(X_test)}")

    # Build Pipeline
    pipeline = Pipeline([
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

    print("Fitting model...")
    pipeline.fit(X_train, y_train)

    # Predictions on test set
    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)

    # Calculate metrics
    acc = accuracy_score(y_test, y_pred)
    macro_f1 = f1_score(y_test, y_pred, average="macro")
    weighted_f1 = f1_score(y_test, y_pred, average="weighted")
    clf_report = classification_report(y_test, y_pred, output_dict=True)
    conf_matrix = confusion_matrix(y_test, y_pred, labels=pipeline.classes_).tolist()

    # Save trained model
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    print(f"Model persisted to: {MODEL_PATH}")

    # Build evaluation report data structure
    report_data = {
        "dataset": {
            "path": "data/synthetic_complaints.csv",
            "total_samples": total_samples,
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "num_classes": len(unique_classes),
            "classes": unique_classes,
            "train_test_split": "80/20 Stratified"
        },
        "model_architecture": {
            "vectorizer": "TF-IDF (ngram_range=(1,2), sublinear_tf=True)",
            "classifier": "LogisticRegression (C=2.0, class_weight='balanced')",
            "pipeline": "sklearn.pipeline.Pipeline"
        },
        "metrics": {
            "accuracy": round(float(acc), 4),
            "macro_f1": round(float(macro_f1), 4),
            "weighted_f1": round(float(weighted_f1), 4),
            "per_class": {
                cls: {
                    "precision": round(clf_report[cls]["precision"], 4),
                    "recall": round(clf_report[cls]["recall"], 4),
                    "f1_score": round(clf_report[cls]["f1-score"], 4),
                    "support": clf_report[cls]["support"]
                }
                for cls in unique_classes if cls in clf_report
            },
            "confusion_matrix": conf_matrix,
            "classes_order": list(pipeline.classes_)
        }
    }

    # Save JSON report
    with open(REPORT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)

    # Save human-readable text report
    with open(REPORT_TXT_PATH, "w", encoding="utf-8") as f:
        f.write("=" * 70 + "\n")
        f.write("COMPLAINAI - MACHINE LEARNING MODEL EVALUATION REPORT\n")
        f.write("=" * 70 + "\n\n")
        f.write(f"Dataset Size:       {total_samples} samples across {len(unique_classes)} categories\n")
        f.write(f"Train/Test Split:   80% Train ({len(X_train)}), 20% Test ({len(X_test)}) Stratified\n")
        f.write(f"Vectorizer:         TF-IDF (1-2 n-grams, sublinear_tf=True)\n")
        f.write(f"Classifier:         Multinomial Logistic Regression (balanced weights)\n\n")
        f.write(f"Overall Accuracy:   {acc * 100:.2f}%\n")
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
    print(f"Model Training Complete! Accuracy: {acc*100:.2f}%, Macro F1: {macro_f1:.4f}")
    print(f"Saved evaluation report to: {REPORT_JSON_PATH}")
    print("=" * 70)

if __name__ == "__main__":
    train_and_evaluate()

