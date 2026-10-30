from fastapi import FastAPI

app = FastAPI(
    title="ZED STORE Calculator Service",
    version="1.0.0",
    description="Standalone calculator app. No marketplace or inventory integrations.",
)


@app.get("/")
def root():
    return {
        "ok": True,
        "service": "zed-store-calculator",
        "message": "The ZED STORE calculator runs independently in the Android app.",
        "health": "/health",
    }


@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "zed-store-calculator",
        "mode": "standalone",
        "integrations": [],
    }
