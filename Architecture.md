# Architecture

## Pipeline overview

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  data_gen/       │     │  baseline_profiler│     │  sequence_model     │
│  generator.py    │────▶│  per-entity stats │────▶│  GRU: window of     │
│  (synthetic logs,│     │  + deviation      │     │  deviation features │
│  labeled attacks)│     │  features         │     │  → risk + class     │
└─────────────────┘     └──────────────────┘     └──────────┬─────────┘
                                                              │
                          ┌──────────────────┐                │
                          │  explainer.py     │◀───────────────┘
                          │  feature attrib.  │
                          │  + GRU saliency   │
                          └────────┬──────────┘
                                   │
                          ┌────────▼──────────┐     ┌────────────────────┐
                          │  FastAPI backend   │────▶│  React dashboard    │
                          │  /alerts /entity/  │     │  alert queue,       │
                          │  /explain          │     │  entity history,    │
                          │  SQLite store      │     │  explainability     │
                          └────────────────────┘     └────────────────────┘
```

## Why this shape

**Synthetic data generator (`data_gen/`)**
Real intrusion datasets are scarce, outdated, or don't match this schema. The
generator builds an explicit per-entity "normal" profile (home geo, usual
resources, usual device, habitual hours) and samples around it with noise,
then injects each of the 7 required attack patterns at a controlled rate
(default 2%, configurable). Ground truth is kept in the `label` column and
must be dropped before scoring — the API never reads it.

**Baseline profiler (`backend/models/baseline_profiler.py`)**
Two jobs: (1) turn a raw event into small, human-readable deviation features
(new_geo, new_resource, new_device, off_hours, auth_failed,
session_anomaly) that both the GRU and a human analyst can reason about, and
(2) provide a rule-based risk score as a **cold-start fallback** — when an
entity has fewer than `COLD_START_THRESHOLD` (20) events, the GRU has
nothing meaningful to learn from yet, so we fall back to a transparent
weighted-sum score instead of trusting an undertrained model.

**Sequence model (`backend/models/sequence_model.py`)**
A GRU reads a sliding window (default 10 events) of deviation features per
entity and outputs both an anomaly score and an attack-type classification
in one forward pass — chosen over separate binary + multiclass models to
keep the risk score and the classification always consistent with each
other (risk = 1 - P(normal), always derived from the same softmax as the
predicted label).

GRU over LSTM: fewer parameters, faster to train, near-identical accuracy on
short windows like these — a better fit for a solo, beginner-scoped build.

**Class imbalance** is handled with inverse-frequency class weights in the
training loss (`backend/pipeline/train.py`), not oversampling — simpler to
reason about at this data scale and avoids duplicating rare attack patterns
in a way that could make the model memorize specific synthetic instances.

**Explainability (`backend/models/explainer.py`)**
Two techniques:
1. Feature-level (always available): since deviation features are already
   interpretable by construction, the top-3 highest-value features ARE the
   explanation. Used for cold-start / rule-based scores.
2. Gradient saliency (when the GRU scores an event): input-gradient
   magnitude w.r.t. P(anomaly), averaged over the window, shows which
   features the model actually leaned on — a sanity check that it isn't
   keying off something spurious.

**API (`backend/api/main.py`)**
FastAPI, matching the shape (not the content) of the previous project's
backend. Endpoints are scoped to what this problem statement asks for:
`/events/ingest` (score + store), `/alerts` (ranked queue), `/entity/{id}/history`
(profile + recent events), `/explain/{alert_id}`. No SOAR/containment
endpoints — out of scope for this brief.

**Dashboard (`frontend/`)**
React, no state library needed at this scale (component-local `useState` +
polling). Polls `/alerts` every 5 seconds to simulate a live stream, per the
problem statement's "real-time updates (or simulated stream)" allowance —
a real deployment would swap this for a websocket or SSE push without
changing the component structure.

## Data flow for a single event

1. Event arrives at `/events/ingest`.
2. Backend pulls the entity's recent history from SQLite.
3. `baseline_profiler.build_profile()` builds a profile from everything
   *before* this event (no future leakage).
4. `deviation_features()` turns the event into a 6-dim feature vector.
5. If enough history exists (≥ `WINDOW_SIZE` + not cold-start): the last
   `WINDOW_SIZE` feature vectors go through the GRU → risk score + predicted
   attack type + gradient-saliency explanation.
6. Otherwise: rule-based score + feature-level explanation.
7. Event + alert are persisted; entity profile is updated for next time.
8. Dashboard picks up the new alert on its next poll.