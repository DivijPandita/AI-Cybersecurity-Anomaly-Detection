"""
FastAPI backend for the behavioral anomaly detection platform.

Endpoints:
  POST /events/ingest         - ingest one or more raw events, score them, store alerts
  GET  /alerts                - ranked alert queue for the analyst dashboard
  GET  /entity/{entity_id}/history  - recent event history + profile for one entity
  GET  /explain/{event_id}    - contributing factors for a specific scored event
  GET  /health

Run (from backend/api/):
    uvicorn main:app --reload --port 8000
Then open http://localhost:8000/docs
"""

import sys
import os
import uuid
from typing import List

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch

from backend.db import store
from backend.models.baseline_profiler import (
    build_profile, deviation_features, features_to_vector,
    rule_based_risk_score, COLD_START_THRESHOLD,
)
from backend.models.explainer import explain_from_features, explain_from_model
from backend.pipeline.preprocess import LABEL_TO_IDX, IDX_TO_LABEL, WINDOW_SIZE
from backend.models.sequence_model import load_model, GRUAnomalyClassifier

app = FastAPI(title="Behavioral Anomaly Detection API")

# Allow the React frontend to call this API during local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "models", "gru_model.pt")
_model = None


def get_model():
    global _model
    if _model is None:
        if os.path.exists(MODEL_PATH):
            _model = load_model(MODEL_PATH, n_classes=len(LABEL_TO_IDX))
        else:
            _model = None  # falls back to rule-based scoring everywhere
    return _model


class EventIn(BaseModel):
    event_id: str
    entity_id: str
    entity_type: str
    timestamp: str
    source_ip: str
    geo_location: str
    resource_accessed: str
    auth_method: str
    auth_success: int
    session_duration: int
    command_sequence: str
    device_fingerprint: str


@app.on_event("startup")
def startup():
    store.init_db()


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": get_model() is not None}


@app.post("/events/ingest")
def ingest_events(events: List[EventIn]):
    """Score incoming events against each entity's history and raise alerts.
    In a real deployment this would be called by a streaming consumer; here
    it's called directly (or by the /simulate demo) to keep things simple."""
    model = get_model()
    results = []

    for event in events:
        event_dict = event.dict()
        event_dict["label"] = "unknown"  # ground truth is hidden at inference

        history = store.get_entity_events(event.entity_id, limit=200)
        history = list(reversed(history))  # chronological
        history.append(event_dict)  # temporarily append to build features against "before now"
        profile_events = history[:-1]

        profile = build_profile(event.entity_id, profile_events) if len(profile_events) >= 3 else None
        features = deviation_features(event_dict, profile)

        cold_start = profile is None or profile.get("event_count", 0) < COLD_START_THRESHOLD

        if model is not None and not cold_start and len(profile_events) >= WINDOW_SIZE:
            window_feats = []
            running_profile_events = profile_events[:-WINDOW_SIZE] if len(profile_events) > WINDOW_SIZE else []
            recent = profile_events[-WINDOW_SIZE + 1:] + [event_dict]
            seen = running_profile_events
            for e in recent:
                p = build_profile(event.entity_id, seen) if len(seen) >= 3 else None
                window_feats.append(features_to_vector(deviation_features(e, p)))
                seen.append(e)
            x = torch.tensor([window_feats], dtype=torch.float32)
            risk_tensor, pred_class, probs = model.score(x)
            risk_score = float(risk_tensor.item())
            predicted_label = IDX_TO_LABEL[int(pred_class.item())]
            explanation = explain_from_model(model, x[0])
            method = "gru_sequence_model"
        else:
            risk_score = rule_based_risk_score(features) * 100
            predicted_label = "cold_start_unknown" if cold_start else "normal"
            explanation = explain_from_features(features)
            method = "rule_based_cold_start" if cold_start else "rule_based_baseline"

        # persist raw event + updated profile
        store.insert_events([event_dict])
        if profile:
            profile["entity_id"] = event.entity_id
            profile.pop("typical_hours", None)
            store.upsert_entity_profile(profile)

        alert = {
            "alert_id": str(uuid.uuid4()),
            "event_id": event.event_id,
            "entity_id": event.entity_id,
            "timestamp": event.timestamp,
            "risk_score": risk_score,
            "predicted_label": predicted_label,
            "top_factors": explanation,
            "reviewed": 0,
        }
        store.insert_alert(alert)
        results.append({**alert, "scoring_method": method, "cold_start": cold_start})

    return {"scored": len(results), "results": results}


@app.get("/alerts")
def get_alerts(limit: int = 50, min_score: float = 0.0):
    return store.get_alerts(limit=limit, min_score=min_score)


@app.get("/entity/{entity_id}/history")
def entity_history(entity_id: str, limit: int = 100):
    events = store.get_entity_events(entity_id, limit=limit)
    profile = store.get_entity_profile(entity_id)
    if not events and not profile:
        raise HTTPException(status_code=404, detail="Entity not found")
    return {"entity_id": entity_id, "profile": profile, "events": events}


@app.get("/explain/{alert_id}")
def explain(alert_id: str):
    alerts = store.get_alerts(limit=1000)
    match = next((a for a in alerts if a["alert_id"] == alert_id), None)
    if not match:
        raise HTTPException(status_code=404, detail="Alert not found")
    return match