# ResolveX AI
### AI-Powered Smart Complaint Classification and Priority Prediction System

> **Product Tagline:** Report Smarter. Prioritise Better. Resolve Faster.  
> **Use Case:** College Campus Facility Management & Municipal Public Services

ResolveX AI is a full-stack, production-grade web application engineered for college campus complaint triage. It replaces manual categorisation with **real scikit-learn machine learning**, replaces subjective urgency with a **transparent rule-based priority engine**, and provides an **audited lifecycle tracking platform** with role-based access control.

---

## 🌟 Key Features

1. **Natural Language Complaint Lodging**:
   - Students submit issues without needing to know internal departments or taxonomy.
   - Real-time client-side "Preview AI Analysis" before submission.
   - Generates non-sequential, unguessable public tracking IDs (e.g., `RX-2026-ELE001`).

2. **Genuine Machine Learning Categorisation**:
   - Supervised classification across **10 campus operational domains**.
   - Pipeline: `TfidfVectorizer` (unigrams + bigrams, sublinear term frequency) + `LogisticRegression` (balanced class weights).
   - Produces calibrated confidence estimates and mathematical token-level feature attribution.
   - Automatically flags classification uncertainty when top predictions are close.

3. **Deterministic 0–100 Priority Engine**:
   - Evaluates Safety Risk (0–40 pts), Service Disruption (0–25 pts), Population Impact (0–20 pts), and Persistence (0–15 pts).
   - Enforces policy-governed safety floors: acute hazards (live wires, smoke, gas leaks, structural collapse) are guaranteed **Critical** priority.
   - Produces transparent, human-readable scoring factors.

4. **TF-IDF Duplicate Complaint Detection**:
   - Computes cosine similarity across active complaints to surface potential duplicates to administrators without destructive auto-merging.

5. **Audited State Machine Lifecycle**:
   - Validated transition flow: `Submitted` → `Under Review` → `Assigned` → `In Progress` → `Resolved` (with support for `Rejected` and `Reopened`).
   - Every transition logs the actor, timestamp, and progress note to an immutable `StatusHistory` table.

6. **Role-Based Portals & Live Visual Analytics**:
   - **Student Dashboard**: Track submitted issues, search history, review resolution notes.
   - **Admin Command Center**: Recharts visualisations (categories, status, priority, and location hotspots) powered by persistent SQLite queries.
   - Human-in-the-loop override of categories and priorities with recorded justifications.

7. **Dedicated Model Evaluation Suite**:
   - Live interactive page displaying test accuracy, macro F1, per-class metrics, 10x10 confusion matrix, and viva defense FAQ.

---

## 🏗️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router v6, Lucide Icons, Recharts |
| **Backend** | Python 3.10+, FastAPI, Uvicorn, Pydantic v2, SQLAlchemy ORM |
| **Database** | SQLite (Persistent local storage) |
| **AI / ML** | Scikit-learn, NumPy, TF-IDF Vectorization, Logistic Regression, Joblib |
| **Security** | JWT Tokens (`python-jose`), `bcrypt` password hashing, RBAC |
| **Testing** | Pytest, FastAPI TestClient, Httpx |

---

## 📂 Project Directory Structure

```text
ResolveX AI/
├── backend/
│   ├── ml/
│   │   ├── generate_dataset.py       # Synthetic dataset generation
│   │   ├── train.py                  # Reproducible model training pipeline
│   │   ├── evaluate.py               # Evaluation metric calculation
│   │   ├── classifier_model.joblib   # Persisted scikit-learn model
│   │   ├── evaluation_report.json    # Machine-readable evaluation report
│   │   └── evaluation_report.txt     # Human-readable report
│   ├── routers/
│   │   ├── auth.py                   # /api/auth endpoints (login, register, me)
│   │   ├── complaints.py             # /api/complaints submission & tracking
│   │   ├── admin.py                  # /api/admin operations & overrides
│   │   ├── analytics.py              # /api/analytics real-time metrics
│   │   └── ai.py                     # /api/ai inference endpoints
│   ├── services/
│   │   ├── classifier.py             # Model inference & explainability
│   │   ├── priority.py               # 0-100 deterministic priority rubric
│   │   ├── duplicates.py             # TF-IDF cosine similarity detector
│   │   └── audit.py                  # Lifecycle state machine validator
│   ├── tests/
│   │   └── test_api.py               # Comprehensive pytest test suite
│   ├── main.py                       # FastAPI entry point & SPA static server
│   ├── database.py                   # SQLAlchemy engine & session maker
│   ├── models.py                     # Database tables
│   ├── schemas.py                    # Pydantic v2 schemas
│   ├── auth.py                       # JWT & bcrypt security helpers
│   ├── seed.py                       # Seed script for demo accounts & cases
│   ├── requirements.txt              # Backend dependencies
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/               # Navbar, Footer, PriorityBadge, StatusBadge
│   │   ├── context/                  # AuthContext (React auth provider)
│   │   ├── pages/                    # Home, Submit, Track, Dashboard, Admin, Eval
│   │   ├── services/                 # API client wrapper
│   │   ├── types/                    # TypeScript interfaces
│   │   ├── App.tsx                   # Route definitions
│   │   └── main.tsx                  # React entry point
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── data/
│   └── synthetic_complaints.csv      # 500 labeled complaints across 10 classes
├── docs/
│   ├── architecture.md               # Architecture diagrams & component flows
│   ├── testing.md                    # Test execution & verification report
│   └── viva-preparation.md          # Technical viva Q&A & theory defense
├── README.md
└── .gitignore
```

---

## ⚡ Quick Start & Local Execution

### 1. Prerequisites
- **Python 3.10+** (Tested on Python 3.14)
- **Node.js 18+** & **npm**

---

### 2. Backend Setup

```bash
# 1. Create and activate a Python virtual environment
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate

# 2. Install backend dependencies
pip install -r backend/requirements.txt

# 3. (Optional) Re-train the Machine Learning Classifier
PYTHONPATH=. python backend/ml/train.py

# 4. Seed the database with demo users and realistic complaints
PYTHONPATH=. python backend/seed.py

# 5. Run the FastAPI backend server
PYTHONPATH=. uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend will be active at:
- **API Base:** `http://127.0.0.1:8000`
- **Interactive Swagger Docs:** `http://127.0.0.1:8000/docs`
- **Health Check:** `http://127.0.0.1:8000/api/health`

---

### 3. Frontend Setup

In a separate terminal:

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start the Vite development server
npm run dev
```

Frontend will be active at:
- **Application URL:** `http://localhost:5173`

---

### 4. Running Unified Production Mode

You can also build the frontend and serve both the API and the React Single Page App from FastAPI on a single port:

```bash
# Build frontend static bundle
cd frontend && npm run build && cd ..

# Launch unified server
PYTHONPATH=. ./venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
Open `http://127.0.0.1:8000` to interact with the full unified application!

---

## 🧪 Running Automated Tests

Execute the 10 automated test suites with:

```bash
PYTHONPATH=. ./venv/bin/pytest backend/tests/test_api.py -v
```

All 10 tests will run and pass, validating authentication, AI inference, priority scoring, complaint lifecycle transitions, and analytics.

---

## 🔑 Pre-Configured Demonstration Accounts

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Campus Admin** | `admin@resolvex.ai` | `Admin@ResolveX2026!` | Full administrative triage, status transitions, department assignment, category & priority overrides, Recharts analytics |
| **Student** | `student@resolvex.ai` | `Student@ResolveX2026!` | Public lodging, personal dashboard, live status tracking |

*(1-click login buttons are also available on the Login page for convenient viva demonstration).*

---

## ⏱️ Recommended 2-Minute Viva Demonstration Sequence

1. **Landing Page (`/`)**: Show the live system status pill ("Backend: healthy"), the 3-step architecture, and the college CAA notice.
2. **Submit a Complaint (`/submit`)**:
   - Type: `High voltage switchboard sparking in computer lab`
   - Click **"Preview AI Analysis"** to demonstrate real-time Scikit-Learn inference, confidence percentage, and feature tokens (`sparking`, `switchboard`).
   - Submit the issue and show the generated public tracking ID (`RX-2026-XXXXXX`).
3. **Track Complaint (`/track`)**:
   - Inspect the lifecycle progress stepper, AI reasoning breakdown, and initial audit trail.
4. **Admin Command Center (`/admin`)**:
   - Sign in as `admin@resolvex.ai`.
   - Show live Recharts analytics (Category distribution, Priority breakdown, Campus Hotspots).
   - Click **"Manage & Triage"** on the newly submitted issue.
   - Advance status to `Under Review`, assign `Electrical Maintenance Division`, and update priority.
5. **Model Evaluation Matrix (`/model-eval`)**:
   - Show the 10x10 confusion matrix, per-class F1 metrics, and test an ambiguous phrase in the live inference playground.

---

## ⚖️ Academic Honesty & Limitations

- **Dataset**: The current prototype is fitted on 500 synthetic, balanced college complaint records. It demonstrates complete pipeline mechanics but is not claimed to be a production dataset.
- **Priority Logic**: The priority component is an explicit, deterministic rule-based engine, not an urgency ML model.
- **Human-in-the-Loop**: AI predictions never automatically close or reject tickets without human administrative sign-off.

---

## 📄 License

Developed for Continuous Assessment Activity (CAA) Engineering Evaluation.
Tagline: *Report Smarter. Prioritise Better. Resolve Faster.*

