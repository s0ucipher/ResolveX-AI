# ComplainAI — System Architecture Document

## 1. High-Level Architecture Overview

ComplainAI is designed around a decoupled, layered architecture adhering to the principle that the backend is the authoritative source of truth for business logic, persistence, and AI inference.

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer (Browser)"]
        UI["React 18 + Vite + TypeScript"]
        Tailwind["Tailwind CSS + Lucide Icons"]
        Charts["Recharts Visualizations"]
    end

    subgraph APILayer ["FastAPI Gateway & Application Server"]
        RouterAuth["/api/auth (JWT & RBAC)"]
        RouterComp["/api/complaints (Submission & Tracking)"]
        RouterAdmin["/api/admin (Triage & Overrides)"]
        RouterAI["/api/ai (Classification & Priority)"]
        RouterAnalytics["/api/analytics (Telemetry)"]
    end

    subgraph ServiceLayer ["Business & AI Services"]
        MLService["ML Classifier (TF-IDF + Logistic Regression)"]
        PriorityEngine["Deterministic Priority Scoring Engine (0-100)"]
        DuplicateService["Duplicate Detector (TF-IDF Cosine Similarity)"]
        AuditService["State Machine & Status Audit Service"]
    end

    subgraph PersistenceLayer ["Persistent Storage Layer"]
        DB[(SQLite / SQLAlchemy ORM)]
        ModelStore[("Model Artifact: classifier_model.joblib")]
    end

    UI -->|JSON over HTTP/REST| APILayer
    APILayer --> ServiceLayer
    ServiceLayer --> MLService
    ServiceLayer --> PriorityEngine
    ServiceLayer --> DuplicateService
    ServiceLayer --> AuditService
    AuditService --> DB
    MLService --> ModelStore
    APILayer --> DB
```

---

## 2. Core Backend Modules

- **`main.py`**: FastAPI application entry point, CORS middleware, static asset fallback for client-side routing, and application health endpoint.
- **`database.py`**: SQLite database connection, thread-safe session generator (`get_db`), declarative base model.
- **`models.py`**: SQLAlchemy ORM models: `User`, `Complaint`, `StatusHistory`, `ComplaintRelation`.
- **`schemas.py`**: Pydantic v2 schemas providing type safety and request/response validation.
- **`auth.py`**: JWT token creation, verification, password hashing with direct `bcrypt`, role-based dependency injections (`get_current_user`, `get_current_admin`).
- **`services/classifier.py`**: Scikit-learn Pipeline wrapper providing text normalization, vectorization, category inference, confidence scoring, uncertainty flagging, and feature token explainability.
- **`services/priority.py`**: Policy-governed priority engine scoring safety risk, service disruption, affected population, and issue duration.
- **`services/duplicates.py`**: Cosine similarity computation across recent database records to flag potential duplicates.
- **`services/audit.py`**: State machine validation enforcing valid complaint lifecycle transitions and recording dated audit records.

---

## 3. Complaint Lifecycle State Machine

ComplainAI implements a strict state machine to prevent unauthorized or nonsensical status leaps (e.g., an unreviewed complaint cannot jump directly to Resolved).

```mermaid
stateDiagram-v2
    [*] --> Submitted: User Lodges Complaint
    Submitted --> UnderReview: Admin Verifies Record
    Submitted --> Assigned: Direct Facility Triage
    Submitted --> Rejected: Invalid / Non-Campus Issue
    UnderReview --> Assigned: Division Selected
    UnderReview --> InProgress: Emergency Crew Dispatched
    UnderReview --> Rejected: Out of Policy Scope
    Assigned --> InProgress: Technician On-Site
    Assigned --> UnderReview: Re-triage Required
    InProgress --> Resolved: Maintenance Completed
    InProgress --> UnderReview: Escalated
    Resolved --> Reopened: Issue Persists / User Appeal
    Reopened --> UnderReview: Re-evaluation
    Reopened --> InProgress: Crew Re-dispatched
    Rejected --> UnderReview: Admin Appeal Accepted
```

---

## 4. Entity-Relationship Data Model

```mermaid
erDiagram
    USERS ||--o{ COMPLAINTS : submits
    COMPLAINTS ||--o{ STATUS_HISTORY : logs
    COMPLAINTS ||--o{ COMPLAINT_RELATIONS : has

    USERS {
        int id PK
        string name
        string email UK
        string password_hash
        string role
        boolean is_active
        datetime created_at
    }

    COMPLAINTS {
        int id PK
        string public_id UK
        int user_id FK
        string user_email
        string title
        text description
        string location
        string category
        string predicted_category
        float classification_confidence
        int priority_score
        string predicted_priority
        string final_priority
        text priority_explanation
        string assigned_department
        string status
        text rejection_reason
        text resolution_notes
        datetime created_at
        datetime updated_at
        datetime resolved_at
    }

    STATUS_HISTORY {
        int id PK
        int complaint_id FK
        string previous_status
        string new_status
        text note
        string changed_by
        datetime created_at
    }

    COMPLAINT_RELATIONS {
        int id PK
        int complaint_id FK
        int related_complaint_id FK
        string relationship_type
        float similarity_score
        string review_status
        datetime created_at
    }
```

---

## 5. Security & Role-Based Access Control (RBAC)

1. **Password Hashing**: Passwords are cryptographically salted and hashed using `bcrypt` (cost factor = 12).
2. **Access Control**: Administrative endpoints (`/api/admin/*`) require valid JWT bearer tokens with `role == 'admin'`. Public registration is locked to the `user` role.
3. **Database Injection Protection**: All queries are executed using SQLAlchemy ORM parameterized statements.
4. **Public Privacy**: Public tracking IDs (e.g. `RX-2026-ELE001`) use non-sequential, randomly generated hex strings that prevent sequential ID scraping.

