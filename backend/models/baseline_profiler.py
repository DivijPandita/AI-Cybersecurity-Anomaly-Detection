"""
Baseline profiler — builds a statistical "normal" representation per entity.

Two jobs:
1. Feature engineering: turn a raw event, in context of the entity's profile,
   into numeric deviation features the sequence model can consume
   (e.g. is this a new geo? new device? off-hours? new resource?).
2. Cold-start fallback: when an entity has little/no history, the sequence
   model has nothing to learn from — this profiler still gives a rule-based
   risk estimate until enough events accumulate (configurable threshold).
"""

import json
from collections import Counter, defaultdict
from datetime import datetime

COLD_START_THRESHOLD = 20  # events needed before we trust the sequence model fully


def build_profile(entity_id, events):
    """events: list of dicts for one entity, chronological."""
    if not events:
        return None

    hours = [datetime.fromisoformat(e["timestamp"]).hour for e in events]
    geos = Counter(e["geo_location"] for e in events)
    resources = Counter(e["resource_accessed"] for e in events)
    devices = Counter(e["device_fingerprint"] for e in events)
    durations = [e["session_duration"] for e in events]

    return {
        "entity_id": entity_id,
        "entity_type": events[-1]["entity_type"],
        "home_geo": geos.most_common(1)[0][0],
        "usual_resources": [r for r, _ in resources.most_common(5)],
        "usual_auth": Counter(e["auth_method"] for e in events).most_common(1)[0][0],
        "usual_device_fingerprint": devices.most_common(1)[0][0],
        "avg_session_seconds": sum(durations) / len(durations),
        "event_count": len(events),
        "typical_hours": hours,
    }


def deviation_features(event, profile):
    """Return a small numeric feature vector describing how much `event`
    deviates from `profile`. Values are roughly 0 (matches normal) to 1
    (fully novel), so they're directly usable as model inputs and directly
    readable for explainability."""
    if profile is None:
        # cold start — no history, flag everything as "unknown" at max novelty
        return {
            "new_geo": 1.0, "new_resource": 1.0, "new_device": 1.0,
            "off_hours": 0.5, "auth_failed": 1 - event.get("auth_success", 1),
            "session_anomaly": 0.5, "cold_start": 1.0,
        }

    hour = datetime.fromisoformat(event["timestamp"]).hour
    typical_hours = profile.get("typical_hours", [])
    hour_spread = min(
        [abs(hour - h) for h in typical_hours] + [12]
    ) if typical_hours else 12

    avg_dur = profile.get("avg_session_seconds", event["session_duration"]) or 1
    session_dev = min(1.0, abs(event["session_duration"] - avg_dur) / max(avg_dur, 1))

    return {
        "new_geo": 0.0 if event["geo_location"] == profile["home_geo"] else 1.0,
        "new_resource": 0.0 if event["resource_accessed"] in profile["usual_resources"] else 1.0,
        "new_device": 0.0 if event["device_fingerprint"] == profile["usual_device_fingerprint"] else 1.0,
        "off_hours": min(1.0, hour_spread / 12),
        "auth_failed": float(1 - event.get("auth_success", 1)),
        "session_anomaly": session_dev,
        "cold_start": 1.0 if profile.get("event_count", 0) < COLD_START_THRESHOLD else 0.0,
    }


def rule_based_risk_score(features: dict) -> float:
    """Fallback score (0-1) used for cold-start entities or as a baseline
    sanity check next to the learned model. Simple weighted sum — deliberately
    interpretable, this IS the explanation when the sequence model can't be
    trusted yet."""
    weights = {
        "new_geo": 0.25, "new_resource": 0.15, "new_device": 0.2,
        "off_hours": 0.1, "auth_failed": 0.2, "session_anomaly": 0.1,
    }
    score = sum(features.get(k, 0) * w for k, w in weights.items())
    return min(1.0, score)


FEATURE_ORDER = ["new_geo", "new_resource", "new_device", "off_hours", "auth_failed", "session_anomaly"]


def features_to_vector(features: dict):
    return [features.get(k, 0.0) for k in FEATURE_ORDER]