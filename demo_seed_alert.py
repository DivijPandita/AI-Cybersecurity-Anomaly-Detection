"""
Convenience script for demos: reads a mix of anomalous + normal rows from
data/events.csv, strips the ground-truth label, and POSTs them to the
running API so the dashboard has something to show.

Run this AFTER the backend (`uvicorn main:app`) is already running and the
DB has been seeded (`backend/pipeline/seed_db.py`).

    python3 demo_seed_alerts.py
"""

import csv
import json
import urllib.request

DATA_PATH = "data/events.csv"
API_URL = "http://localhost:8000/events/ingest"


def main():
    with open(DATA_PATH) as f:
        rows = list(csv.DictReader(f))

    anomalies = [r for r in rows if r["label"] != "normal"][:8]
    normals = [r for r in rows if r["label"] == "normal"][:8]
    batch = anomalies + normals

    for r in batch:
        r["auth_success"] = int(r["auth_success"])
        r["session_duration"] = int(r["session_duration"])
        r.pop("label", None)

    payload = json.dumps(batch).encode()
    req = urllib.request.Request(
        API_URL, data=payload, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())
        print(f"{result['scored']} events scored. Open the dashboard to see the alerts.")


if __name__ == "__main__":
    main()