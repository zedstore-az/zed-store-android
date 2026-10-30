import logging
import os
from typing import Any

import httpx
from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.middleware.cors import CORSMiddleware

BIRM_MARKET_REFRESH_URL = "https://bbu.umico.az/api/v1/auth/refresh-token"
BIRM_MARKET_PRODUCTS_URL = "https://catalog-bbu-rb-api.birmarket.az/bbu/v1/products"
MERCHANT_UUID = os.getenv(
    "BIRM_MARKET_MERCHANT_UUID",
    "46557d74-7dc3-43c5-bc3b-f28236dfdd3e",
)
INCLUDE_FIELDS = (
    "id,categories,manufacturer,product_offers,gtin,mpn,image_urls,photos,"
    "new_images,name_az,name_ru,raw_title,status,moderation_status,merchant_uuid,"
    "old_price,retail_price,qty,state,deactivate_reason_key,deactivate_reason_label,"
    "deactivated_at,l_length,l_width,l_height,l_brutto_weight"
)

logger = logging.getLogger("zed_store")

app = FastAPI(title="ZED STORE Backend", version="0.2.3")
bearer_scheme = HTTPBearer(auto_error=False)
origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "").split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/")
def root():
    return {
        "ok": True,
        "service": "zed-store-backend",
        "message": "ZED STORE backend is running",
        "health": "/health",
        "api_docs": "/docs",
    }


def require_app_key(authorization: str | None):
    expected = os.getenv("ZED_APP_API_KEY")
    if not expected:
        raise HTTPException(status_code=503, detail="Backend setup incomplete")
    if authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="Unauthorized")


def integration_configured() -> bool:
    return bool(
        os.getenv("BIRM_MARKET_REFRESH_TOKEN")
        and os.getenv("BIRM_MARKET_SOURCE_CODE", "CUSTOMER")
    )


@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "zed-store-backend",
        "integration": "configured" if integration_configured() else "not_configured",
        "checks": {
            "app_key_configured": bool(os.getenv("ZED_APP_API_KEY")),
            "refresh_token_configured": bool(os.getenv("BIRM_MARKET_REFRESH_TOKEN")),
            "source_code": os.getenv("BIRM_MARKET_SOURCE_CODE", "CUSTOMER"),
            "merchant_uuid_configured": bool(MERCHANT_UUID),
        },
    }


def _find_value(payload: Any, key: str):
    if isinstance(payload, dict):
        if key in payload:
            return payload[key]
        for value in payload.values():
            found = _find_value(value, key)
            if found is not None:
                return found
    elif isinstance(payload, list):
        for value in payload:
            found = _find_value(value, key)
            if found is not None:
                return found
    return None


def _refresh_access_token(client: httpx.Client) -> str:
    refresh_token = os.getenv("BIRM_MARKET_REFRESH_TOKEN")
    source_code = os.getenv("BIRM_MARKET_SOURCE_CODE", "CUSTOMER")
    if not refresh_token:
        raise HTTPException(status_code=503, detail="Birmarket refresh token is not configured")

    try:
        response = client.post(
            BIRM_MARKET_REFRESH_URL,
            json={"refresh_token": refresh_token, "source_code": source_code},
        )
        response.raise_for_status()
        payload = response.json()
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code
        logger.error("Birmarket token refresh rejected: HTTP %s", status)
        if status in (401, 403):
            detail = f"Birmarket rejected the refresh token (HTTP {status}); update BIRM_MARKET_REFRESH_TOKEN in Render Environment."
        elif status == 400:
            detail = "Birmarket rejected the refresh request (HTTP 400); verify BIRM_MARKET_SOURCE_CODE is CUSTOMER."
        elif status == 429:
            detail = "Birmarket rate limit reached while refreshing the token (HTTP 429); retry later."
        else:
            detail = f"Birmarket token refresh failed (HTTP {status})."
        raise HTTPException(status_code=502, detail=detail)
    except httpx.RequestError as exc:
        logger.error("Birmarket token refresh network error: %s", type(exc).__name__)
        raise HTTPException(status_code=502, detail="Birmarket token refresh failed")
    except ValueError:
        logger.error("Birmarket token refresh returned invalid JSON")
        raise HTTPException(status_code=502, detail="Birmarket token refresh failed")

    access_token = _find_value(payload, "access_token")
    if not isinstance(access_token, str) or not access_token:
        logger.error("Birmarket token refresh response did not contain access_token")
        raise HTTPException(status_code=502, detail="Birmarket did not return an access token")
    return access_token


def _fetch_products_page(client: httpx.Client, access_token: str, page: int):
    params = {
        "q[s]": "updated_at desc",
        "q[status_in]": "active,out_of_stock,ready_to_publish",
        "q[product_offers_active_eq]": "true",
        "q[product_offers_deleted_eq]": "false",
        "q[product_offers_merchant_uuid_eq]": MERCHANT_UUID,
        "per_page": 20,
        "page": page,
        "include_fields": INCLUDE_FIELDS,
    }
    try:
        response = client.get(
            BIRM_MARKET_PRODUCTS_URL,
            params=params,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        payload = response.json()
    except (httpx.HTTPError, ValueError):
        raise HTTPException(status_code=502, detail="Birmarket products request failed")

    records = payload.get("data", []) if isinstance(payload, dict) else []
    if not isinstance(records, list):
        raise HTTPException(status_code=502, detail="Unexpected Birmarket products response")
    return records, payload.get("meta", {}) if isinstance(payload, dict) else {}


def _normalize_product(record: dict):
    attributes = record.get("attributes") or {}
    offer_list = attributes.get("product_offers") or []
    offer = next(
        (
            item for item in offer_list
            if isinstance(item, dict)
            and item.get("merchant_uuid") == MERCHANT_UUID
            and item.get("active") is not False
            and item.get("deleted") is not True
        ),
        {},
    )
    photos = attributes.get("photos") or {}
    images = []

    for key in ("img_url_standard", "img_url_zoom", "img_url_original"):
        url = photos.get(key)
        if isinstance(url, str) and url not in images:
            images.append(url)

    for url in photos.get("img_urls_secondary") or []:
        if isinstance(url, str) and url not in images:
            images.append(url)

    for url in attributes.get("image_urls") or []:
        if isinstance(url, str) and url not in images:
            images.append(url)

    for item in attributes.get("new_images") or []:
        if not isinstance(item, dict):
            continue
        for size in ("medium", "big", "original", "small"):
            url = (item.get(size) or {}).get("url")
            if isinstance(url, str) and url not in images:
                images.append(url)

    return {
        "id": attributes.get("id") or record.get("id"),
        "title": attributes.get("name_az") or attributes.get("raw_title") or attributes.get("name_ru"),
        "sku": offer.get("sku") or attributes.get("mpn"),
        "mpn": attributes.get("mpn"),
        "price": offer.get("retail_price", attributes.get("retail_price")),
        "old_price": offer.get("old_price", attributes.get("old_price")),
        "quantity": offer.get("qty", attributes.get("qty")),
        "status": attributes.get("status"),
        "state": attributes.get("state"),
        "manufacturer": attributes.get("manufacturer"),
        "categories": attributes.get("categories") or [],
        "images": images,
        "merchant_uuid": attributes.get("merchant_uuid"),
    }


@app.get("/api/products")
def products(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
    authorization = f"Bearer {credentials.credentials}" if credentials else None
    require_app_key(authorization)
    if not integration_configured():
        raise HTTPException(status_code=503, detail="Birmarket connection is not configured")

    all_records = []
    page = 1
    max_pages = 100

    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        access_token = _refresh_access_token(client)
        while page <= max_pages:
            records, meta = _fetch_products_page(client, access_token, page)
            all_records.extend(records)

            total_pages = meta.get("total_pages") if isinstance(meta, dict) else None
            if isinstance(total_pages, int):
                if page >= total_pages:
                    break
            elif len(records) < 20:
                break
            page += 1

    return {
        "ok": True,
        "count": len(all_records),
        "page_size": 20,
        "products": [_normalize_product(item) for item in all_records if isinstance(item, dict)],
    }
