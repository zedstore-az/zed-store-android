import unittest

from order_mapping import (
    map_delivery_status,
    map_payment_status,
    normalize_birmarket_order,
)


class OrderMappingTests(unittest.TestCase):
    def test_known_delivery_states(self):
        cases = {
            "READY_FOR_PICKUP": "ready",
            "ON_PUDO": "pudo",
            "DELIVERED": "delivered",
            "CANCELLED_BY_CUSTOMER": "cancelled",
            "CANCELLED_BY_LOGISTICS": "cancelled",
            "CANCELLED_BY_MARKETPLACE": "cancelled",
        }
        for source, expected in cases.items():
            with self.subTest(source=source):
                self.assertEqual(map_delivery_status(source), expected)

    def test_unknown_delivery_state_is_new(self):
        self.assertEqual(map_delivery_status("SOME_NEW_STATE"), "new")
        self.assertEqual(map_delivery_status(None), "new")

    def test_payment_states_are_conservative(self):
        self.assertEqual(map_payment_status("PAID"), "paid")
        self.assertEqual(map_payment_status("DISBURSED"), "paid")
        self.assertEqual(map_payment_status("NOT_PAID"), "unpaid")
        self.assertEqual(map_payment_status("BUYER_REJECT"), "unpaid")
        self.assertEqual(map_payment_status(None), "unpaid")

    def test_cancel_reason_does_not_change_delivery_status(self):
        order = normalize_birmarket_order({
            "id": "external-1",
            "order_number": "123456",
            "state": "DELIVERED",
            "payment_state": "DISBURSED",
            "cancel_reason": "ODOO_OTHER",
        })
        self.assertEqual(order["delivery_status"], "delivered")
        self.assertEqual(order["payment_status"], "paid")

    def test_normalized_result_excludes_customer_personal_data(self):
        order = normalize_birmarket_order({
            "id": "external-2",
            "number": "654321",
            "state": "ON_PUDO",
            "payment_state": "NOT_PAID",
            "customer_name": "Example",
            "customer_phone": "+000000000",
        })
        self.assertEqual(order["delivery_status"], "pudo")
        self.assertNotIn("customer_name", order)
        self.assertNotIn("customer_phone", order)


if __name__ == "__main__":
    unittest.main()
