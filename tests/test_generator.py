import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "data_gen"))
from generator import generate
from schema import EVENT_COLUMNS, Label


def test_generate_produces_events():
    rows = generate(num_entities=20, days=5, attack_rate=0.05, seed=1)
    assert len(rows) > 0


def test_generate_schema_matches():
    rows = generate(num_entities=5, days=3, seed=1)
    for row in rows:
        assert set(row.keys()) == set(EVENT_COLUMNS)


def test_generate_injects_attacks():
    rows = generate(num_entities=50, days=10, attack_rate=0.1, seed=2)
    labels = {r["label"] for r in rows}
    assert Label.NORMAL.value in labels
    # with attack_rate=0.1 over 500 entity-days we expect at least one non-normal label
    assert len(labels) > 1


def test_generate_is_deterministic_with_seed():
    rows_a = generate(num_entities=10, days=5, seed=7)
    rows_b = generate(num_entities=10, days=5, seed=7)
    assert [r["label"] for r in rows_a] == [r["label"] for r in rows_b]