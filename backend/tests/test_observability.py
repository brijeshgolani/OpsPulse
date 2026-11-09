import unittest

from app.observability import mask_sensitive_data


class MaskSensitiveDataTests(unittest.TestCase):
    def test_masks_sensitive_fields_recursively(self):
        data = {
            "api_key": "do-not-export",
            "tool": {"password": "also-secret"},
            "message": "Investigation is proceeding.",
        }

        masked = mask_sensitive_data(data=data)

        self.assertEqual(masked["api_key"], "[REDACTED]")
        self.assertEqual(masked["tool"]["password"], "[REDACTED]")
        self.assertEqual(masked["message"], data["message"])
        self.assertEqual(data["api_key"], "do-not-export")

    def test_masks_secret_values_and_personal_email_in_text(self):
        text = (
            "Authorization: Bearer abc.def "
            "GROQ=gsk_12345678901234567890 "
            "contact=person@example.com"
        )

        masked = mask_sensitive_data(data=text)

        self.assertNotIn("abc.def", masked)
        self.assertNotIn("gsk_12345678901234567890", masked)
        self.assertNotIn("person@example.com", masked)
        self.assertIn("[REDACTED_EMAIL]", masked)

    def test_masks_database_connection_urls(self):
        masked = mask_sensitive_data(
            data="postgresql://dbuser:database-password@db.example.com:5432/app"
        )

        self.assertEqual(masked, "[REDACTED_DATABASE_URL]")


if __name__ == "__main__":
    unittest.main()
