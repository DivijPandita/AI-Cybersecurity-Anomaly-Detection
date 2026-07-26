"""
Synthetic access-log generator.

Design:
1. Create a population of entities (users, service accounts, edge devices),
   each with a habitual "normal" profile (typical login hours, home geo,
   usual resources, usual device fingerprint).
2. Simulate normal sessions sampled around that profile with noise.
3. Inject attack patterns at controlled rates (default 0.5-3% of sessions),
   each attack type breaking one or more assumptions of the entity's profile.
4. Keep ground-truth labels in a separate column — at inference time this
   column must be dropped/hidden, it exists only for training/evaluation.

Run:
    python generator.py --num-entities 200 --days 30 --out data/events.csv
"""

import argparse
import csv
import random
import uuid
from datetime import datetime, timedelta

from faker import Faker

from schema import EntityType, AuthMethod, Label, EVENT_COLUMNS, ANOMALY_LABELS

fake = Faker()

RESOURCE_POOL = [
    "/finance/reports", "/hr/records", "/engineering/repo", "/db/customer_table",
    "/admin/console", "/vpn/gateway", "/file_server/shared", "/plant_control/plc1",
    "/plant_control/plc2", "/scada/hmi", "/email/inbox", "/crm/leads",
]

GEO_POOL = [
    "Mumbai,IN", "Delhi,IN", "Bengaluru,IN", "Pune,IN", "Chennai,IN",
    "Hyderabad,IN", "Singapore,SG", "Frankfurt,DE", "London,UK", "Moscow,RU",
    "Lagos,NG", "Sao Paulo,BR",
]

# Rough lat/lon for a few of the above, used only to make "impossible travel"
# time-gap math plausible. Kept intentionally small/approximate.
GEO_COORDS = {
    "Mumbai,IN": (19.07, 72.87), "Delhi,IN": (28.61, 77.20),
    "Bengaluru,IN": (12.97, 77.59), "Pune,IN": (18.52, 73.85),
    "Chennai,IN": (13.08, 80.27), "Hyderabad,IN": (17.38, 78.48),
    "Singapore,SG": (1.35, 103.82), "Frankfurt,DE": (50.11, 8.68),
    "London,UK": (51.51, -0.13), "Moscow,RU": (55.75, 37.62),
    "Lagos,NG": (6.52, 3.38), "Sao Paulo,BR": (-23.55, -46.63),
}


def haversine_km(a, b):
    from math import radians, sin, cos, sqrt, atan2
    lat1, lon1 = a
    lat2, lon2 = b
    r = 6371
    dlat, dlon = radians(lat2 - lat1), radians(lon2 - lon1)
    h = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * r * atan2(sqrt(h), sqrt(1 - h))


class EntityProfile:
    """The 'normal' habitual profile for one entity — the thing the ML models
    will eventually learn implicitly. Kept explicit here so the generator can
    sample around it and so attacks can be defined as deviations from it."""

    def __init__(self, entity_id, entity_type):
        self.entity_id = entity_id
        self.entity_type = entity_type
        self.home_geo = random.choice(GEO_POOL)
        self.login_hour_center = random.randint(7, 19)
        self.usual_resources = random.sample(RESOURCE_POOL, k=random.randint(2, 4))
        self.usual_auth = random.choice(list(AuthMethod))
        self.device_fingerprint = f"{fake.user_agent()}|{fake.mac_address()}"
        self.avg_session_seconds = random.randint(120, 2400)


def sample_normal_event(profile, ts):
    hour_offset = random.gauss(0, 1.5)
    ts = ts.replace(hour=min(23, max(0, int(profile.login_hour_center + hour_offset))))
    return dict(
        event_id=str(uuid.uuid4()),
        entity_id=profile.entity_id,
        entity_type=profile.entity_type.value,
        timestamp=ts.isoformat(),
        source_ip=fake.ipv4_public(),
        geo_location=profile.home_geo,
        resource_accessed=random.choice(profile.usual_resources),
        auth_method=profile.usual_auth.value,
        auth_success=1,
        session_duration=max(10, int(random.gauss(profile.avg_session_seconds, profile.avg_session_seconds * 0.2))),
        command_sequence="|".join(random.choices(["ls", "read", "query", "download_small", "view"], k=random.randint(1, 4))),
        device_fingerprint=profile.device_fingerprint,
        label=Label.NORMAL.value,
    )


def inject_attack(profile, ts, attack_type):
    base = sample_normal_event(profile, ts)
    base["label"] = attack_type.value

    if attack_type == Label.BRUTE_FORCE:
        base["auth_success"] = 0
        base["source_ip"] = fake.ipv4_public()
        base["session_duration"] = random.randint(1, 5)
        base["command_sequence"] = "auth_attempt"

    elif attack_type == Label.IMPOSSIBLE_TRAVEL:
        far_geo = random.choice([g for g in GEO_POOL if g != profile.home_geo])
        base["geo_location"] = far_geo
        base["source_ip"] = fake.ipv4_public()
        # ground truth distance kept implicit; the model must learn it from
        # consecutive events for the same entity_id via the sequence pipeline

    elif attack_type == Label.CREDENTIAL_STUFFING:
        base["auth_success"] = random.choice([0, 0, 0, 1])
        base["source_ip"] = "203.0.113." + str(random.randint(1, 5))  # few shared IPs
        base["session_duration"] = random.randint(1, 3)

    elif attack_type == Label.LATERAL_MOVEMENT:
        unseen = [r for r in RESOURCE_POOL if r not in profile.usual_resources]
        base["resource_accessed"] = random.choice(unseen) if unseen else random.choice(RESOURCE_POOL)
        base["command_sequence"] = "|".join(random.choices(["enumerate", "connect", "escalate", "pivot"], k=random.randint(2, 5)))

    elif attack_type == Label.DEVICE_SPOOFING:
        base["device_fingerprint"] = f"{fake.user_agent()}|{fake.mac_address()}"  # mismatched vs history

    elif attack_type == Label.LOW_AND_SLOW_EXFIL:
        base["timestamp"] = ts.replace(hour=random.choice([1, 2, 3, 4])).isoformat()
        base["command_sequence"] = "download_small"
        base["session_duration"] = random.randint(60, 300)

    elif attack_type == Label.INSIDER_DRIFT:
        new_resource = random.choice(RESOURCE_POOL)
        base["resource_accessed"] = new_resource
        profile.usual_resources = list(set(profile.usual_resources + [new_resource]))[:5]

    return base


def generate(num_entities=200, days=30, avg_events_per_entity_per_day=3,
             attack_rate=0.02, seed=42):
    random.seed(seed)
    Faker.seed(seed)

    profiles = []
    for _ in range(num_entities):
        etype = random.choices(
            list(EntityType), weights=[0.7, 0.2, 0.1]
        )[0]
        profiles.append(EntityProfile(str(uuid.uuid4()), etype))

    start = datetime.now() - timedelta(days=days)
    rows = []
    for profile in profiles:
        for day in range(days):
            n_events = max(1, int(random.gauss(avg_events_per_entity_per_day, 1)))
            for _ in range(n_events):
                ts = start + timedelta(days=day, hours=random.random() * 24)
                if random.random() < attack_rate:
                    attack_type = random.choice(ANOMALY_LABELS + [Label.INSIDER_DRIFT])
                    rows.append(inject_attack(profile, ts, attack_type))
                else:
                    rows.append(sample_normal_event(profile, ts))

    rows.sort(key=lambda r: r["timestamp"])
    return rows


def write_csv(rows, out_path):
    with open(out_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=EVENT_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--num-entities", type=int, default=200)
    parser.add_argument("--days", type=int, default=30)
    parser.add_argument("--attack-rate", type=float, default=0.02)
    parser.add_argument("--out", type=str, default="../data/events.csv")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    import os
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    rows = generate(args.num_entities, args.days, attack_rate=args.attack_rate, seed=args.seed)
    write_csv(rows, args.out)
    print(f"Wrote {len(rows)} events to {args.out}")
    anomalies = sum(1 for r in rows if r["label"] != Label.NORMAL.value)
    print(f"Anomalous events: {anomalies} ({anomalies/len(rows)*100:.2f}%)")