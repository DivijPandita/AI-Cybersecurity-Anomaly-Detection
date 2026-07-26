"""
Loads a generated events.csv into the database and pre-computes entity
profiles, so the dashboard/demo has realistic history instead of every
entity looking cold-start.

Run:
    python seed_db.py --data ../../data/events.csv
"""

import argparse
import sys
import os
from collections import defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from backend.db import store
from backend.models.baseline_profiler import build_profile
from backend.pipeline.preprocess import load_events, group_by_entity


def seed(data_path):
    store.init_db()
    rows = load_events(data_path)
    store.insert_events(rows)

    by_entity = group_by_entity(rows)
    for entity_id, events in by_entity.items():
        profile = build_profile(entity_id, events)
        if profile:
            profile.pop("typical_hours", None)
            store.upsert_entity_profile(profile)

    print(f"Seeded {len(rows)} events across {len(by_entity)} entities")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="../../data/events.csv")
    args = parser.parse_args()
    seed(args.data)