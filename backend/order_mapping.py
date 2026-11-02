"""Pure mapping helpers for Birmarket order payloads.

This module deliberately performs no network requests and does not read browser
cookies, Seller Cabinet sessions, or access tokens. A supported, authorized
server-to-server data source must be supplied by a separate adapter.
"""

from __future__ import annotations

from typing import Any


DELIVERY_STATUS_MAP = {
    "READY_FOR_PICKUP": "ready",
    "ON_PUDO": "pudo",
    "DELIVERED": "delivered",
    "CANCELLED_BY_CUSTOMER": "cancelled",
    "CANCELLED_BY_LOGISTICS": "cancelled",
    "CANCELLED_BY_MARKETPLACE": "cancelled",
}

PAYMENT_STATUS_MAP = {
    "PAID": "paid",
    "DISBURSED": "paid",
    "NOT_PAID": "unpaid",
    "BUYER_REJECT": "unpaid",
}


def _state_value(value: Any) -> str:
    """Return a normalized enum value from a string or enum-like object."""
    if isinstance(value, dict):
        value = value.get("value") or value.get("code") or value.get("name")
    if not isinstance(value, str):
        return ""
    return value.strip().upper()


def map_delivery_status(value: Any) -> str:
    """Map known Birmarket states to ZED STORE states; unknown states stay new."""
    return DELIVERY_STATUS_MAP.get(_state_value(value), "new")


def map_payment_status(value: Any) -> str:
    """Map explicit payment states; unknown/missing values remain unpaid."""
    return PAYMENT_STATUS_MAP.get(_state_value(value), "unpaid")


def normalize_birmarket_order(record: dict[str, Any]) -> dict[str, Any]:
    """Normalize safe order fields without retaining customer PII or raw payload.

    The caller should persist customer details only through the approved order
    import flow and should avoid logging the source payload.
    """
    if not isinstance(record, dict):
        raise TypeError("record must be a dictionary")

    order_number = record.get("order_number") or record.get("number")
    order_id = record.get("id") or record.get("uuid")
    state = record.get("state") or record.get("order_state")
    payment_state = record.get("payment_state")

    return {
        "external_order_id": str(order_id) if order_id is not None else None,
        "order_number": str(order_number) if order_number is not None else None,
        "delivery_status": map_delivery_status(state),
        "payment_status": map_payment_status(payment_state),
    }
