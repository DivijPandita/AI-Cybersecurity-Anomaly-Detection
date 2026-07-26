"""
Turns raw event rows into (sequence_of_feature_vectors, label) samples for the
sequence model.

Approach: for each entity, sort events chronologically, build a rolling
baseline profile from everything BEFORE the current window (so we never leak
future information into "normal" the model is judged against), compute
deviation features per event, and slide a fixed-size window over the
sequence. The label for a window is the label of its LAST event — that's the
"event we're scoring right now, using recent context."
"""

import sys
import os
import csv
from collections import defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from data_gen.schema import Label, ANOMALY_LABELS
from backend.models.baseline_profiler import build_profile, deviation_features, features_to_vector

WINDOW_SIZE = 10
LABEL_TO_IDX = {label.value: i for i, label in enumerate([Label.NORMAL] + ANOMALY_LABELS)}
IDX_TO_LABEL = {i: l for l, i in LABEL_TO_IDX.items()}


def load_events(csv_path):
    with open(csv_path) as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        r["auth_success"] = int(r["auth_success"])
        r["session_duration"] = int(r["session_duration"])
    return rows


def group_by_entity(rows):
    by_entity = defaultdict(list)
    for r in rows:
        by_entity[r["entity_id"]].append(r)
    for entity_id in by_entity:
        by_entity[entity_id].sort(key=lambda r: r["timestamp"])
    return by_entity


def build_windows(rows, window_size=WINDOW_SIZE, min_history=3):
    """Returns list of (feature_matrix [window_size x n_features], label_idx, meta)."""
    by_entity = group_by_entity(rows)
    samples = []

    for entity_id, events in by_entity.items():
        seen = []  # events used to build the "before now" profile
        feature_buffer = []

        for i, event in enumerate(events):
            profile = build_profile(entity_id, seen) if len(seen) >= min_history else None
            feats = deviation_features(event, profile)
            vec = features_to_vector(feats)
            feature_buffer.append(vec)
            seen.append(event)

            if len(feature_buffer) >= window_size:
                window = feature_buffer[-window_size:]
                label = event["label"]
                label_idx = LABEL_TO_IDX.get(label, LABEL_TO_IDX[Label.NORMAL.value])
                # insider_drift isn't in LABEL_TO_IDX (ambiguous edge case) -> falls back to normal
                samples.append((window, label_idx, {"entity_id": entity_id, "event_id": event["event_id"]}))

    return samples


if __name__ == "__main__":
    rows = load_events("../../data/events.csv")
    samples = build_windows(rows)
    print(f"Built {len(samples)} windowed samples from {len(rows)} events")
    from collections import Counter
    label_counts = Counter(IDX_TO_LABEL[s[1]] for s in samples)