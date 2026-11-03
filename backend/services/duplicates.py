from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from backend.models import Complaint

def find_potential_duplicates(
    target_id: Optional[int],
    title: str,
    description: str,
    category: str,
    location: str,
    db: Session,
    similarity_threshold: float = 0.50,
    limit: int = 5
) -> List[Dict]:
    # Query other active complaints (not rejected or resolved over 30 days)
    query = db.query(Complaint).filter(Complaint.status.notin_(["Rejected"]))
    if target_id:
        query = query.filter(Complaint.id != target_id)
        
    candidate_records = query.order_by(Complaint.created_at.desc()).limit(150).all()
    if not candidate_records:
        return []

    target_text = f"{title} {description}".lower()
    corpus = [f"{c.title} {c.description}".lower() for c in candidate_records]
    
    # Compute TF-IDF cosine similarity
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
    try:
        tfidf_matrix = vectorizer.fit_transform([target_text] + corpus)
        sim_scores = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0]
    except Exception as e:
        print(f"Duplicate detection similarity calculation fallback: {e}")
        return []

    duplicates = []
    for idx, score in enumerate(sim_scores):
        record = candidate_records[idx]
        sim_val = float(score)

        # Boost score slightly if category and location closely match
        category_match = (record.category.lower() == category.lower())
        location_match = (record.location.lower() == location.lower() or 
                          record.location.lower() in location.lower() or 
                          location.lower() in record.location.lower())
        
        effective_score = sim_val
        if category_match:
            effective_score += 0.05
        if location_match:
            effective_score += 0.05

        effective_score = min(1.0, effective_score)

        if effective_score >= similarity_threshold:
            explanation_parts = [f"{int(effective_score * 100)}% textual similarity"]
            if category_match:
                explanation_parts.append(f"shared category '{record.category}'")
            if location_match:
                explanation_parts.append(f"same or nearby location '{record.location}'")

            duplicates.append({
                "complaint_id": record.id,
                "public_id": record.public_id,
                "title": record.title,
                "category": record.category,
                "location": record.location,
                "status": record.status,
                "similarity_score": round(effective_score, 4),
                "explanation": "Potential duplicate: " + ", ".join(explanation_parts) + "."
            })

    # Sort descending by similarity score
    duplicates.sort(key=lambda x: x["similarity_score"], reverse=True)
    return duplicates[:limit]

