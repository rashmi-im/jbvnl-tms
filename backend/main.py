import os
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.scheduler import start_scheduler
from app.routers import (
    auth_router,
    failure_router,
    dashboard_router,
    report_router,
    master_router,
    notification_router,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
    except Exception as e:
        print(f"⚠️ Database initialization error: {e}")
        
    if not os.environ.get("VERCEL"):
        try:
            start_scheduler()
        except Exception as e:
            print(f"⚠️ Scheduler start error: {e}")
    yield

app = FastAPI(
    title="Transformer Management System API",
    description="Backend service for Transformer Failure & Replacement Management",
    version="2.0.0",
    lifespan=lifespan
)

from app.security import SecurityHeadersMiddleware, RateLimiterMiddleware

# Register Security & Protection Middlewares
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimiterMiddleware)

# Path normalization middleware for Vercel serverless routing
@app.middleware("http")
async def normalize_api_path(request, call_next):
    path = request.scope.get("path", "")
    # If Vercel stripped /api, normalize it so FastAPI router matches /api/...
    if not path.startswith("/api") and not path.startswith("/docs") and not path.startswith("/openapi"):
        request.scope["path"] = f"/api{path}"
    return await call_next(request)

# Configure CORS for React frontend (supports Vercel preview & production deployments)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all modular routers both with and without /api prefix (handles Vercel root_path stripping)
all_routers = [
    auth_router.router,
    failure_router.router,
    dashboard_router.router,
    report_router.router,
    master_router.router,
    notification_router.router,
]
for r in all_routers:
    app.include_router(r)
    app.include_router(r, prefix="/api")

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "2.0.0"}


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"⚡ Starting TMS Backend Server on http://0.0.0.0:{port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

