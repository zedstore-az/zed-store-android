# ZED STORE cloud backend

FastAPI backend deployed on Render.

## Endpoints

- `GET /`: service information.
- `GET /health`: deployment and Birmarket configuration status.
- `GET /api/products`: fetches the seller's active product offers from Birmarket, including product images, prices, quantities, SKU and categories. Requires `Authorization: Bearer <ZED_APP_API_KEY>`.

## Render environment variables

Set these in the Render service's Environment page. Never commit secrets to GitHub or put them in the Android app.

- `ZED_APP_API_KEY`: keep the generated app key already configured in Render.
- `BIRM_MARKET_REFRESH_TOKEN`: the seller account refresh token.
- `BIRM_MARKET_SOURCE_CODE`: `CUSTOMER`.
- `BIRM_MARKET_MERCHANT_UUID`: `46557d74-7dc3-43c5-bc3b-f28236dfdd3e` (already has a default in code).
- `CORS_ORIGINS`: optional comma-separated allowed origins.

The observed refresh request returned both access and refresh tokens, and the user reports the refresh token remained unchanged in their test. This implementation reads the refresh token from the Render environment and does not expose either token in API responses or logs. If Birmarket rotates the refresh token in future, update the Render environment variable securely.

## Important verification note

This adapter follows the observed browser request format: POST refresh with `refresh_token` and `source_code`, then GET the seller-filtered products endpoint with a Bearer access token. This observation does not itself establish an official supported server-to-server API contract. Confirm Birmarket permits this use before relying on it for production operations.

The product endpoint uses 20-item pagination and stops at the reported total page count, or when a page contains fewer than 20 records. Do not use browser-session cookies or scrape the seller cabinet.
