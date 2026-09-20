import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .api.endpoints import router as api_router
from .services.data_loader import data_loader
from .services.ml_engine import ml_engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Industrial AI Copilot Backend...")
    # Preload data and models
    data_loader.load_all()
    ml_engine.train_or_load()
    logger.info("Backend warm-up complete. Ready for requests.")
    yield
    logger.info("Shutting down Industrial AI Copilot Backend...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Industrial AI Copilot — Decision-Support Platform for Discrete-Event Manufacturing",
    lifespan=lifespan
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

from pathlib import Path
from fastapi import Request, HTTPException
from fastapi.responses import FileResponse

frontend_dist = settings.PROJECT_ROOT / "frontend" / "dist"
frontend_assets = frontend_dist / "assets"
backend_assets = settings.BASE_DIR / "app" / "assets"

@app.get("/assets/{file_path:path}")
def serve_assets(file_path: str):
    f_path = frontend_assets / file_path
    if f_path.is_file():
        return FileResponse(str(f_path))
    b_path = backend_assets / file_path
    if b_path.is_file():
        return FileResponse(str(b_path))
    raise HTTPException(status_code=404, detail=f"Asset '{file_path}' not found")

@app.get("/")
def root(request: Request):
    index_file = frontend_dist / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "HEALTHY",
        "dataset": "Rockwell Arena Model 3 (Shared Manufacturing Facility)",
        "docs_url": "/docs"
    }

@app.get("/health")
def health():
    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "frontend_deployed": (frontend_dist / "index.html").exists(),
        "dataset_loaded": data_loader.is_loaded
    }

# SPA client-side routing fallback
@app.get("/{full_path:path}")
def serve_spa(full_path: str, request: Request):
    if full_path.startswith("api") or full_path in ["docs", "redoc", "openapi.json", "assets"]:
        return None
    target_file = frontend_dist / full_path
    if target_file.is_file():
        return FileResponse(str(target_file))
    index_file = frontend_dist / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"detail": "Not found"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
