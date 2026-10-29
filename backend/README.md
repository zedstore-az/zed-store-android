# ZED STORE cloud backend

This is a deployment scaffold, not a live Birmarket integration yet.

- GET /health: deployment health check.
- GET /api/products: protected by ZED_APP_API_KEY; returns HTTP 503 until the Birmarket adapter is verified.

Deploy using render.yaml. Keep all secrets in the host environment, never in GitHub or the APK.

Before enabling live inventory, verify that Birmarket permits server-side refresh-token use and establish expiry/rotation behavior. The observed browser refresh request alone does not prove a supported server-side integration contract. Then implement token refresh, pagination, and normalized product ID, SKU, price, quantity, status, and image URLs. Do not use browser-session scraping.
