# ComplainAI — Testing Strategy and Verification Report

## 1. Automated Test Suite

ComplainAI includes automated tests executed using `pytest` and `fastapi.testclient.TestClient`.

To execute the test suite:

```bash
PYTHONPATH=. ./venv/bin/pytest backend/tests/test_api.py -v
```

### Verified Test Cases:

1. **`test_health_check`**: Verifies `/api/health` returns HTTP 200, system status is healthy, and scikit-learn classifier pipeline is loaded in memory.
2. **`test_login_demo_admin`**: Validates JWT authentication for administrator credentials (`admin@complainai.ai`).
3. **`test_login_invalid_password`**: Verifies rejection of incorrect passwords with HTTP 401 Unauthorized.
4. **`test_register_new_user`**: Tests dynamic student registration and verifies role defaults to `user`.
5. **`test_ai_classification_endpoint`**: Tests text classification on a real electrical issue ("Severe electric shock from laboratory switchboard") and confirms model outputs "Electrical and lighting" with positive feature contributions.
6. **`test_ai_priority_prediction_critical_safety`**: Tests the priority engine on an acute hazard ("Live bare wire sparking in auditorium") and verifies score >= 80, priority is Critical, and emergency review is flagged.
7. **`test_ai_priority_prediction_low_issue`**: Verifies that low-impact complaints ("Notice board corner loose") are assigned Low/Medium priority without false emergency escalation.
8. **`test_submit_complaint_and_track`**: Complete lifecycle test: submits a plumbing complaint, verifies unique tracking ID generation (`RX-2026-XXXXXX`), confirms database persistence, and retrieves the complaint via the tracking endpoint.
9. **`test_admin_status_transitions_and_override`**:
   - Tests state machine transition validation: confirms invalid jump (`Submitted` directly to `Resolved`) is rejected with HTTP 400.
   - Tests valid step: `Submitted` → `Under Review`.
   - Tests department assignment and priority override.
   - Tests status history audit trail generation.
10. **`test_analytics_endpoints`**: Confirms that `/api/analytics/summary`, `/api/analytics/categories`, `/api/analytics/statuses`, and `/api/analytics/priorities` calculate and return non-empty datasets from stored records.

---

## 2. Machine Learning Model Evaluation Results

- **Vectorizer**: TF-IDF (1–2 n-grams, sublinear term frequency scaling, accents stripped)
- **Classifier**: Scikit-Learn Multinomial Logistic Regression (`class_weight='balanced'`, `C=2.0`, `max_iter=1000`)
- **Evaluation Split**: 80% Train (400 samples) / 20% Test (100 samples) Stratified Split

### Actual Metrics on Held-Out Test Set:

| Metric | Result |
| :--- | :--- |
| **Overall Accuracy** | **99.00%** |
| **Macro F1-Score** | **0.9900** |
| **Weighted F1-Score** | **0.9900** |
| **Total Test Samples** | **100** |

Per-Class Precision, Recall, and F1 on Test Set:

| Category | Precision | Recall | F1-Score | Support |
| :--- | :---: | :---: | :---: | :---: |
| Classroom and laboratory facilities | 1.000 | 1.000 | 1.000 | 10 |
| Cleanliness and waste management | 0.909 | 1.000 | 0.952 | 10 |
| Electrical and lighting | 1.000 | 1.000 | 1.000 | 10 |
| Hostel and accommodation | 1.000 | 1.000 | 1.000 | 10 |
| Internet and IT services | 1.000 | 1.000 | 1.000 | 10 |
| Other | 1.000 | 1.000 | 1.000 | 10 |
| Plumbing and sanitation | 1.000 | 0.900 | 0.947 | 10 |
| Roads and infrastructure | 1.000 | 1.000 | 1.000 | 10 |
| Safety and security | 1.000 | 1.000 | 1.000 | 10 |
| Water supply | 1.000 | 1.000 | 1.000 | 10 |

---

## 3. End-to-End User Journey Verification

The following journey was tested and verified end-to-end:

1. Visited landing page (`/`), checked live engine health pill.
2. Navigated to `/submit`, entered complaint:
   - Title: `Water cooler on 2nd floor leaking dirty water`
   - Description: `Drinking water cooler has been leaking foul brownish water over corridor tiles since morning.`
   - Location: `Main Academic Block - 2nd Floor`
3. Clicked "Preview AI Analysis":
   - Category predicted as `Water supply` (or `Plumbing and sanitation`) with feature breakdown.
   - Urgency scored with transparent factor breakdown.
4. Submitted complaint: received unique ID `RX-2026-XXXXXX`.
5. Navigated to `/track` with public ID: verified complaint details, lifecycle progress bar, and AI metadata.
6. Signed in as admin (`admin@complainai.ai` / `Admin@ComplainAI2026!`).
7. Opened `/admin`: inspected real-time Recharts analytics and located newly submitted complaint.
8. Opened `/admin/complaints/:publicId`:
   - Updated status to `Under Review`.
   - Assigned department to `Water Supply & Plumbing Works`.
   - Committed status to `In Progress`.
9. Checked tracking page again: confirmed new status milestones and audit trail updated dynamically.

