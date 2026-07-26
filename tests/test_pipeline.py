import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from data_gen.generator import generate
from data_gen.schema import EVENT_COLUMNS
from backend.pipeline.preprocess import build_windows, WINDOW_SIZE, LABEL_TO_IDX
from backend.models.baseline_profiler import build_profile, deviation_features, features_to_vector
from backend.models.sequence_model import GRUAnomalyClassifier
import torch


def _rows():
    return generate(num_entities=15, days=15, attack_rate=0.05, seed=3)


def test_build_windows_shapes():
    rows = _rows()
    samples = build_windows(rows)
    assert len(samples) > 0
    window, label_idx, meta = samples[0]
    assert len(window) == WINDOW_SIZE
    assert len(window[0]) == 6  # n_features
    assert label_idx in LABEL_TO_IDX.values()


def test_baseline_profile_cold_start_features():
    feats = deviation_features({"geo_location": "x", "resource_accessed": "y",
                                  "device_fingerprint": "z", "auth_success": 1,
                                  "session_duration": 100, "timestamp": "2026-01-01T10:00:00"},
                                 profile=None)
    assert feats["cold_start"] == 1.0
    vec = features_to_vector(feats)
    assert len(vec) == 6


def test_gru_model_forward_pass_shape():
    model = GRUAnomalyClassifier(n_features=6, n_classes=7)
    x = torch.rand(4, WINDOW_SIZE, 6)  # batch of 4
    logits = model(x)
    assert logits.shape == (4, 7)


def test_gru_model_score_returns_valid_risk_range():
    model = GRUAnomalyClassifier(n_features=6, n_classes=7)
    x = torch.rand(2, WINDOW_SIZE, 6)
    risk, pred_class, probs = model.score(x)
    assert (risk >= 0).all() and (risk <= 100).all()
    assert probs.shape == (2, 7)