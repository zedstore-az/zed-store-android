# ZED STORE Calculator

The Android application is a standalone calculator. Calculation logic and tariff/category data are bundled locally in the Android app.

## No external integrations

This project intentionally contains no Birmarket API connection, product inventory, warehouse screen, product synchronization, seller-portal navigation, or marketplace API client.

## Android app

The APK is built from `ZED_STORE_Android_Studio_Project.zip` by the GitHub Actions workflow.

## Optional Render health service

The small FastAPI service in this folder only exposes `/` and `/health` for deployment health checks. The Android calculator does not depend on it and it has no marketplace or inventory endpoints.
