"""
Schema definitions for the synthetic access-log dataset.

This mirrors the schema requested in the problem statement:
entity_id, entity_type, timestamp, source_ip/geo_location, resource_accessed,
auth_method, session_duration, command_sequence, device_fingerprint, label.
"""

from enum import Enum


class EntityType(str, Enum):
    USER = "user"
    SERVICE_ACCOUNT = "service_account"
    EDGE_DEVICE = "edge_device"


class AuthMethod(str, Enum):
    PASSWORD = "password"
    TOKEN = "token"
    CERTIFICATE = "certificate"
    BIOMETRIC = "biometric"


class Label(str, Enum):
    NORMAL = "normal"
    BRUTE_FORCE = "brute_force"
    IMPOSSIBLE_TRAVEL = "impossible_travel"
    CREDENTIAL_STUFFING = "credential_stuffing"
    LATERAL_MOVEMENT = "lateral_movement"
    DEVICE_SPOOFING = "device_spoofing"
    LOW_AND_SLOW_EXFIL = "low_and_slow_exfiltration"
    INSIDER_DRIFT = "insider_drift"  # edge case, ambiguous, used for FP tuning


# Attack labels that count as ground-truth anomalies for evaluation.
# insider_drift is intentionally excluded here — it's an edge case, not a hard anomaly.
ANOMALY_LABELS = [
    Label.BRUTE_FORCE,
    Label.IMPOSSIBLE_TRAVEL,
    Label.CREDENTIAL_STUFFING,
    Label.LATERAL_MOVEMENT,
    Label.DEVICE_SPOOFING,
    Label.LOW_AND_SLOW_EXFIL,
]

ALL_LABELS = [Label.NORMAL] + ANOMALY_LABELS + [Label.INSIDER_DRIFT]

# Column order used everywhere (CSV, DB, model input) so nothing drifts out of sync.
EVENT_COLUMNS = [
    "event_id",
    "entity_id",
    "entity_type",
    "timestamp",
    "source_ip",
    "geo_location",
    "resource_accessed",
    "auth_method",
    "auth_success",
    "session_duration",
    "command_sequence",
    "device_fingerprint",
    "label",
]