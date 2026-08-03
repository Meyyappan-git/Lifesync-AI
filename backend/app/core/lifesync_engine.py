from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any


def generate_lifesync_signals(documents: list[dict[str, Any]], profile: dict[str, Any] | None = None):
    alerts: list[dict[str, Any]] = []
    reminders: list[dict[str, Any]] = []

    for document in documents:
        name = (document.get("name") or "").lower()
        if "passport" in name or "visa" in name:
            alerts.append({
                "title": "Passport renewal window",
                "risk_level": "High",
                "reason": "Travel credentials often expire faster than expected and should be reviewed early.",
                "recommended_action": "Renew the document and store the updated copy in your vault.",
                "deadline": (datetime.now(timezone.utc) + timedelta(days=21)).isoformat(),
            })
            reminders.append({
                "title": "Renew passport",
                "message": "Schedule a renewal appointment and keep a copy on file.",
                "trigger_time": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
            })

    if not alerts:
        alerts.append({
            "title": "Routine readiness check",
            "risk_level": "Low",
            "reason": "Your records look complete for now, but a periodic review keeps unknowns from piling up.",
            "recommended_action": "Review your folders and update any missing records this week.",
            "deadline": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        })

    if not reminders:
        reminders.append({
            "title": "Review documents",
            "message": "Check your folders for missing records and stale information.",
            "trigger_time": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
        })

    return alerts, reminders
