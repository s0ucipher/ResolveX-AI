import os
import joblib
import numpy as np
from typing import Dict, List, Tuple
from backend.ml.train import preprocess_text, MODEL_PATH, train_and_evaluate

class ComplaintClassifierService:
    def __init__(self):
        self.pipeline = None
        self.load_model()

    def load_model(self):
        if not os.path.exists(MODEL_PATH):
            print("Model file not found. Triggering automated model training...")
            train_and_evaluate()
        
        self.pipeline = joblib.load(MODEL_PATH)
        self.classes_ = list(self.pipeline.classes_)
        self.vectorizer = self.pipeline.named_steps["tfidf"]
        self.classifier = self.pipeline.named_steps["clf"]
        self.feature_names = np.array(self.vectorizer.get_feature_names_out())
        print(f"Classifier loaded successfully with {len(self.classes_)} classes.")

    def classify(self, title: str, description: str) -> Dict:
        if not self.pipeline:
            self.load_model()

        text = preprocess_text(title, description)
        
        # Transform vector
        vec = self.vectorizer.transform([text])
        probabilities = self.classifier.predict_proba(vec)[0]
        
        # Sort classes by probability descending
        sorted_indices = np.argsort(probabilities)[::-1]
        top_idx = sorted_indices[0]
        runner_up_idx = sorted_indices[1] if len(sorted_indices) > 1 else top_idx
        
        predicted_category = self.classes_[top_idx]
        top_prob = float(probabilities[top_idx])
        runner_up_prob = float(probabilities[runner_up_idx])
        
        # Check uncertainty
        # Confidence below 0.38 or close margin between top two predictions
        is_uncertain = (top_prob < 0.38) or (top_prob - runner_up_prob < 0.12)
        uncertainty_note = None
        if is_uncertain:
            uncertainty_note = (
                f"AI is uncertain about this classification (confidence: {top_prob*100:.1f}%). "
                f"Close alternative: '{self.classes_[runner_up_idx]}' ({runner_up_prob*100:.1f}%). "
                "Please review the suggested category."
            )

        # Explainability: Extract top influential features for predicted category
        # Weight = tfidf_val * coef
        coef_row = self.classifier.coef_[top_idx]
        feature_scores = vec.multiply(coef_row).tocsr()
        non_zero_indices = feature_scores.indices
        
        influential_features = []
        if len(non_zero_indices) > 0:
            scores = feature_scores.data
            sorted_feats = np.argsort(scores)[::-1]
            for idx in sorted_feats[:5]:
                if scores[idx] > 0.05:
                    term = self.feature_names[non_zero_indices[idx]]
                    influential_features.append(term)
                    
        # If no positive n-grams matched, fallback to significant keywords in title
        if not influential_features:
            influential_features = [w for w in title.lower().split() if len(w) > 4][:3]

        # Category probabilities map
        cat_probs = {
            self.classes_[i]: round(float(probabilities[i]), 4)
            for i in sorted_indices[:5]
        }

        return {
            "predicted_category": predicted_category,
            "confidence": round(top_prob, 4),
            "is_uncertain": is_uncertain,
            "uncertainty_note": uncertainty_note,
            "influential_features": influential_features,
            "category_probabilities": cat_probs
        }

# Global singleton instance
classifier_service = ComplaintClassifierService()

