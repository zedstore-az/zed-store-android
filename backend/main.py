import os
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ZED STORE Backend", version="0.1.0")
origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "").split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False,
                   allow_methods=["GET"], allow_headers=["Authorization", "Content-Type"])

@app.get("/")
def root():
    return {
        "ok": True,
        "service": "zed-store-backend",
        "message": "ZED STORE backend is running",
        "health": "/health",
        "api_docs": "/docs"
    }


def require_app_key(authorization: str | None):
    expected = os.getenv("ZED_APP_API_KEY")
    if not expected:
        raise HTTPException(status_code=503, detail="Backend setup incomplete")
    if authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="Unauthorized")

@app.get("/health")
def health():
    return {"ok": True, "service": "zed-store-backend", "integration": "not_configured"}

@app.get("/api/products")
def products(authorization: str | None = Header(default=None)):
    require_app_key(authorization)
    raise HTTPException(status_code=503, detail="Birmarket connection is not configured yet")
