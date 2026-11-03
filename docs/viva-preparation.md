# ComplainAI — Academic Viva & Technical Defense Guide

This document prepares the project team for the technical viva and CAA examination. It covers theoretical foundations, architectural justifications, and detailed answers to probable examiner questions.

---

## 1. Project Motivation & Problem Statement

### Traditional Complaint Handling Bottlenecks:
1. **Manual Triage Delay**: Administrative staff manually read, interpret, and route complaints to specific campus divisions, causing days of initial delay.
2. **Subjective Prioritisation**: Urgent electrical or structural hazards are often addressed with the same priority as broken furniture.
3. **Lack of Transparency**: Complainants have no visibility into progress once a ticket is lodged, leading to duplicate submissions.
4. **Redundant Work**: Similar issues in communal areas (e.g., hostel water cuts) result in multiple duplicate work orders.

### The ComplainAI Solution:
ComplainAI automates the initial triage process using natural language processing (NLP) and supervised machine learning, recommends an objective priority level using a documented safety rubric, and provides an audited lifecycle tracking portal with human-in-the-loop overrides.

---

## 2. Machine Learning Theory & Pipeline

### A. Supervised Learning
- **Concept**: Training an algorithm on pairs of inputs (complaint text) and ground-truth targets (categories) to learn a mapping function \(f: \text{text} \to \text{category}\).
- **In our system**: 500 labeled complaint descriptions spanning 10 campus categories.

### B. Feature Extraction: TF-IDF (Term Frequency - Inverse Document Frequency)
- **Term Frequency (\(\text{TF}\))**: Measures how frequently a word appears in a specific complaint:
  $$\text{TF}(t, d) = \frac{\text{count}(t \in d)}{\text{total words in } d}$$
- **Inverse Document Frequency (\(\text{IDF}\))**: Down-weights generic terms that appear across all categories (e.g. "please", "issue", "college", "problem"):
  $$\text{IDF}(t, D) = \log\left(\frac{1 + |D|}{1 + |\{d \in D : t \in d\}|}\right) + 1$$
- **Sublinear TF Scaling**: Replaces \(\text{TF}\) with \(1 + \log(\text{TF})\) so that a word occurring 10 times is not weighted 10 times as heavily as a word occurring once.
- **N-Grams (1, 2)**: Extracts unigrams ("wire") and bigrams ("live wire", "fire exit", "water leak") to preserve local semantic context.

### C. Multinomial Logistic Regression
- **Decision Function**: For each category \(k\), the model computes a linear combination of TF-IDF feature weights:
  $$z_k = \mathbf{w}_k^T \mathbf{x} + b_k$$
- **Softmax Probability**: Converts raw scores into calibrated probabilities summing to 1:
  $$P(Y = k \mid \mathbf{x}) = \frac{e^{z_k}}{\sum_{j=1}^{K} e^{z_j}}$$
- **Balanced Class Weights**: Automatically adjusts weights inversely proportional to class frequencies to prevent bias toward larger classes:
  $$w_c = \frac{N}{K \cdot n_c}$$

### D. Mathematical Model Explainability
Unlike neural networks, Logistic Regression has direct mathematical interpretability:
$$\text{Contribution}(t, k) = x_t \cdot w_{k, t}$$
The top positive products \(x_t \cdot w_{k, t}\) pinpoint the exact words in the user's description that drove the category choice.

### E. Confidence vs. Urgency
- **Confidence**: How certain the classifier is about the text's topical category (e.g., 92% confident this is "Plumbing").
- **Urgency (Priority)**: How immediately harmful or disruptive the incident is (e.g., a burst pipe is Critical; a slow faucet is Low). A complaint can have 99% confidence but Low urgency, or 50% confidence but Critical urgency.

---

## 3. Transparent Priority Engine Rubric

The priority engine is rule-based and deterministic rather than a black-box model.

| Factor | Points | Evaluation Criteria |
| :--- | :---: | :--- |
| **Safety Risk** | 0 – 40 | Acute hazards (live wire, sparking, fire hazard, gas leak, ceiling collapse) trigger 40 points and an emergency review floor. Moderate risks (broken glass, deep pothole) receive 25 points. |
| **Service Disruption** | 0 – 25 | Total facility outages (exam hall blackout, entire floor water cut) receive 24 points; localized equipment issues receive 8–15 points. |
| **People Affected** | 0 – 20 | Explicit user inputs (\(\ge 100\) people = 20 pts) or shared campus locations (auditorium, library hall = 14 pts). |
| **Duration & Persistence**| 0 – 15 | Days unresolved (\(\ge 7\) days = 10 pts) + express urgency indicators (asap, emergency = 5 pts). |

**Priority Bands**:
- **Critical**: Score \(\ge 80\) or Acute Emergency Trigger
- **High**: Score 60 – 79
- **Medium**: Score 35 – 59
- **Low**: Score 0 – 34

---

## 4. Probable Viva Questions and Answers

### Q1: Why not use a Deep Learning model like BERT or an LLM for classification?
**Answer**: For a college campus complaint classification system:
1. **Efficiency and Latency**: TF-IDF + Logistic Regression infers in under 5 milliseconds on standard CPU hardware without GPU acceleration or cloud API dependencies.
2. **Determinism and Cost**: Zero API token costs and zero external vendor lock-in.
3. **Explainability**: Linear coefficients provide exact, mathematical feature attribution for every classification decision.

### Q2: Why is Priority predicted using a scoring engine instead of machine learning?
**Answer**: Urgency is a policy-critical safety decision. A machine learning model trained on historical tickets could mistakenly downplay an exposed electrical wire if students historically reported wires with casual language. A rule-based engine enforces non-negotiable safety floors: any acute physical hazard is guaranteed a Critical rating and immediate review.

### Q3: What is the purpose of the state machine in status transitions?
**Answer**: Real-world operations require accountability. A ticket cannot skip from "Submitted" to "Resolved" without an intermediate review and recorded resolution notes. The backend state machine rejects invalid jumps, enforces that rejections require recorded reasons, and logs every transition into an immutable audit trail.

### Q4: How does duplicate detection work?
**Answer**: We vectorize active database records using TF-IDF and compute the cosine similarity between the newly submitted complaint vector \(\mathbf{u}\) and historical vector \(\mathbf{v}\):
$$\text{Cosine Similarity} = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|}$$
Scores exceeding 0.50 are boosted for matching campus locations and presented to administrators as candidates. Complaints are never automatically merged, preserving user ownership.

### Q5: What are the main limitations and future improvements?
**Answer**:
1. **Dataset**: Prototype is trained on 500 synthetic examples. Future iterations would fine-tune on historical college maintenance tickets.
2. **Multilingual Support**: Extending vectorization to handle regional student languages (Hindi, Bengali, etc.).
3. **Automated Escalation**: Setting time-to-resolve SLA timers that escalate unattended Critical complaints automatically.

