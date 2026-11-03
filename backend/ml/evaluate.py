"""
Evaluation utility for ComplainAI classification model.
Loads the serialised model and held-out test data, then computes detailed metrics.
"""

import os
import json
from backend.ml.train import load_dataset, DATA_PATH, MODEL_PATH, REPORT_JSON_PATH
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score

def evaluate():
    if not os.path.exists(MODEL_PATH):
        print(f"Model not found at {MODEL_PATH}. Run train.py first.")
        return

    pipeline = joblib.load(MODEL_PATH)
    texts, labels = load_dataset(DATA_PATH)

    _, X_test, _, y_test = train_test_split(
        texts,
        labels,
        test_size=0.20,
        random_state=42,
        stratify=labels
    )

    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    macro_f1 = f1_score(y_test, y_pred, average="macro")
    clf_report = classification_report(y_test, y_pred, output_dict=True)

    print(f"Evaluation Results on Test Set (N={len(X_test)}):")
    print(f"Accuracy: {acc*100:.2f}%")
    print(f"Macro F1: {macro_f1:.4f}")
    
    with open(REPORT_JSON_PATH, "r", encoding="utf-8") as f:
        stored = json.load(f)
    print(f"Stored Report Version: {stored.get('dataset', {}).get('total_samples')} samples.")
    return stored

if __name__ == "__main__":
    evaluate()

