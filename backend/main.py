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
    init_db()
    start_scheduler()
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

# Configure CORS for React frontend
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]
if os.environ.get("FRONTEND_URL"):
    origins.append(os.environ.get("FRONTEND_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if os.environ.get("NODE_ENV") != "production" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Include all modular routers
app.include_router(auth_router.router)
app.include_router(failure_router.router)
app.include_router(dashboard_router.router)
app.include_router(report_router.router)
app.include_router(master_router.router)
app.include_router(notification_router.router)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "2.0.0"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"⚡ Starting TMS Backend Server on http://0.0.0.0:{port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
