import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.database import engine, Base
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
        from backend.seed import seed_database
        seed_database()
    except Exception as e:
        print(f"[Database Initialization Notice] {e}")
    yield

app = FastAPI(
    title="ResolveX AI - Smart Complaint Classification & Priority Prediction System",
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
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
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
    return {
        "status": "healthy",
        "service": "ResolveX AI Backend",
        "version": "1.0.0",
        "classifier_status": "loaded" if classifier_service.pipeline is not None else "unloaded",
        "database": "connected",
        "environment": os.getenv("ENVIRONMENT", "production")
    }

# Mount React Production Frontend if built locally (for unified localhost delivery)
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "dist")

if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.api_route("/{full_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
    async def serve_frontend(full_path: str):
        # Don't intercept API routes that 404
        if full_path.startswith("api/") or full_path == "health":
            return {"detail": "Not Found"}
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
else:
    @app.get("/", tags=["Root"])
    def root_info():
        return {
            "product": "ResolveX AI Backend API",
            "tagline": "Report Smarter. Prioritise Better. Resolve Faster.",
            "docs_url": "/docs",
            "health_check": "/health",
            "status": "running"
        }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False)
