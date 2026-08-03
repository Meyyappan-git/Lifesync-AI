from app.core.lifesync_engine import generate_lifesync_signals


def test_generate_lifesync_signals_for_expiring_documents():
    documents = [{"name": "Passport Renewal", "file_type": "pdf"}]

    alerts, reminders = generate_lifesync_signals(documents, None)

    assert any(alert["title"] == "Passport renewal window" for alert in alerts)
    assert any(reminder["title"] == "Renew passport" for reminder in reminders)
