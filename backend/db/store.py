"""
SQLite storage layer. Simple by design (per the beginner-solo scope) — swap for
Postgres/Elasticsearch later without changing the interface much.
"""

import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "app.db")


def get_conn():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS events (
            event_id TEXT PRIMARY KEY,
            entity_id TEXT,
            entity_type TEXT,
            timestamp TEXT,
            source_ip TEXT,
            geo_location TEXT,
            resource_accessed TEXT,
            auth_method TEXT,
            auth_success INTEGER,
            session_duration INTEGER,
            command_sequence TEXT,
            device_fingerprint TEXT,
            label TEXT
        );

        CREATE TABLE IF NOT EXISTS entity_profiles (
            entity_id TEXT PRIMARY KEY,
            entity_type TEXT,
            home_geo TEXT,
            usual_resources TEXT,
            usual_auth TEXT,
            usual_device_fingerprint TEXT,
            avg_session_seconds REAL,
            event_count INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS alerts (
            alert_id TEXT PRIMARY KEY,
            event_id TEXT,
            entity_id TEXT,
            timestamp TEXT,
            risk_score REAL,
            predicted_label TEXT,
            top_factors TEXT,
            reviewed INTEGER DEFAULT 0
        );
        """
    )
    conn.commit()
    conn.close()


def insert_events(rows):
    conn = get_conn()
    conn.executemany(
        """INSERT OR REPLACE INTO events VALUES
        (:event_id, :entity_id, :entity_type, :timestamp, :source_ip, :geo_location,
         :resource_accessed, :auth_method, :auth_success, :session_duration,
         :command_sequence, :device_fingerprint, :label)""",
        rows,
    )
    conn.commit()
    conn.close()


def upsert_entity_profile(profile: dict):
    conn = get_conn()
    profile = dict(profile)
    profile["usual_resources"] = json.dumps(profile.get("usual_resources", []))
    conn.execute(
        """INSERT INTO entity_profiles
        (entity_id, entity_type, home_geo, usual_resources, usual_auth,
         usual_device_fingerprint, avg_session_seconds, event_count)
        VALUES (:entity_id, :entity_type, :home_geo, :usual_resources, :usual_auth,
                :usual_device_fingerprint, :avg_session_seconds, :event_count)
        ON CONFLICT(entity_id) DO UPDATE SET
            home_geo=excluded.home_geo,
            usual_resources=excluded.usual_resources,
            usual_auth=excluded.usual_auth,
            usual_device_fingerprint=excluded.usual_device_fingerprint,
            avg_session_seconds=excluded.avg_session_seconds,
            event_count=excluded.event_count
        """,
        profile,
    )
    conn.commit()
    conn.close()


def get_entity_profile(entity_id):
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM entity_profiles WHERE entity_id = ?", (entity_id,)
    ).fetchone()
    conn.close()
    if row is None:
        return None
    d = dict(row)
    d["usual_resources"] = json.loads(d["usual_resources"] or "[]")
    return d


def get_entity_events(entity_id, limit=200):
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM events WHERE entity_id = ? ORDER BY timestamp DESC LIMIT ?",
        (entity_id, limit),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def insert_alert(alert: dict):
    conn = get_conn()
    alert = dict(alert)
    alert["top_factors"] = json.dumps(alert.get("top_factors", []))
    conn.execute(
        """INSERT OR REPLACE INTO alerts VALUES
        (:alert_id, :event_id, :entity_id, :timestamp, :risk_score,
         :predicted_label, :top_factors, :reviewed)""",
        alert,
    )
    conn.commit()
    conn.close()


def get_alerts(limit=100, min_score=0.0):
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM alerts WHERE risk_score >= ? ORDER BY risk_score DESC LIMIT ?",
        (min_score, limit),
    ).fetchall()
    conn.close()
    out = []
    for r in rows:
        d = dict(r)
        d["top_factors"] = json.loads(d["top_factors"] or "[]")
        out.append(d)
    return out


if __name__ == "__main__":
    init_db()
    print(f"Initialized DB at {DB_PATH}")