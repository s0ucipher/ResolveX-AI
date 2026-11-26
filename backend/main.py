import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import text
from backend.database import engine, Base, SessionLocal
from backend.routers.auth import router as auth_router
from backend.routers.complaints import router as complaints_router
from backend.routers.admin import router as admin_router
from backend.routers.analytics import router as analytics_router
from backend.routers.ai import router as ai_router
from backend.services.classifier import classifier_service

# Lifespan handler: runs on startup and shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    try:
        from sqlalchemy import inspect, text
        with engine.connect() as conn:
            inspector = inspect(engine)
            if "users" in inspector.get_table_names():
                columns = [c["name"] for c in inspector.get_columns("users")]
                if "firebase_uid" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(128)"))
                    conn.commit()

            if "complaints" in inspector.get_table_names():
                c_cols = [c["name"] for c in inspector.get_columns("complaints")]
                new_cols = [
                    ("photo_url", "TEXT"),
                    ("photo_analysis", "TEXT"),
                    ("resolution_photo_url", "TEXT"),
                    ("resolution_quality_status", "VARCHAR(30)"),
                    ("resolution_quality_report", "TEXT"),
                    ("resolution_quality_score", "INTEGER"),
                    ("idempotency_key", "VARCHAR(64)")
                ]
                for col_name, col_type in new_cols:
                    if col_name not in c_cols:
                        conn.execute(text(f"ALTER TABLE complaints ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                if "idempotency_key" not in c_cols:
                    conn.execute(
                        text(
                            "CREATE UNIQUE INDEX IF NOT EXISTS uq_complaint_user_idempotency "
                            "ON complaints (user_id, idempotency_key)"
                        )
                    )
                    conn.commit()
    except Exception as e:
        print(f"[Schema compatibility notice] {e}")

    if os.getenv("SEED_DEMO_DATA", "").strip().lower() == "true":
        try:
            from backend.seed import seed_database
            seed_database()
        except Exception as e:
            print(f"[Database Initialization Notice] {e}")
    yield

app = FastAPI(
    title="ComplainAI - Smart Complaint Classification & Priority Prediction System",
    description="Automated AI-driven complaint classification, transparent priority engine, and lifecycle tracking for campus facilities.",
    version="1.0.0",
    lifespan=lifespan
)

# Dynamic CORS Configuration for Vercel + Local Development
raw_origins = os.getenv("ALLOWED_ORIGINS", "")
if raw_origins:
    allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
else:
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://localhost:8001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:8001",
    ]

# Default regex allows all *.vercel.app deployment & preview domains
allowed_origin_regex = os.getenv("ALLOWED_ORIGIN_REGEX", r"https://.*\.vercel\.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allowed_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router)
app.include_router(complaints_router)
app.include_router(admin_router)
app.include_router(analytics_router)
app.include_router(ai_router)

# Health check endpoints (available at both /health and /api/health)
@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check():
    db_ok = False
    db_error = None
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception as exc:
        db_error = str(exc)
    finally:
        db.close()

    classifier_loaded = classifier_service.pipeline is not None
    overall_ok = db_ok and classifier_loaded
    payload = {
        "status": "healthy" if overall_ok else "unhealthy",
        "service": "ComplainAI Backend",
        "version": "1.0.0",
        "classifier_status": "loaded" if classifier_loaded else "unloaded",
        "database": "connected" if db_ok else "unavailable",
        "environment": os.getenv("ENVIRONMENT", "development")
    }
    if db_error:
        payload["database_error"] = db_error
    if not overall_ok:
        return JSONResponse(status_code=503, content=payload)
    return payload

# Mount React Production Frontend if built locally (for unified localhost delivery)
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "dist")

if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.api_route("/{full_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
    async def serve_frontend(full_path: str):
        # Return proper 404 for unknown API or health routes instead of HTTP 200
        if full_path == "api" or full_path.startswith("api/") or full_path == "health":
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
else:
    @app.get("/", tags=["Root"])
    def root_info():
        return {
            "product": "ComplainAI Backend API",
            "tagline": "Report Smarter. Prioritise Better. Resolve Faster.",
            "docs_url": "/docs",
            "health_check": "/health",
            "status": "running"
        }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False)
