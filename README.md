# Sentinel — AI-Powered Behavioral Anomaly Detection

A behavioral anomaly detection platform for cybersecurity: models "normal" access
behavior per entity (user, service account, edge device), detects intrusions in
near real-time using a GRU sequence model, classifies the likely attack type,
and explains every alert to a SOC analyst.

Built for the hackathon problem statement on behavioral anomaly detection —
see `docs/architecture.md` for the full design and `docs/reuse_decisions.md`
for how this evolved from an earlier, broader cyber-resilience project.

## What's inside

```
data_gen/       synthetic access-log generator (schema + attack injector)
backend/
  models/       baseline profiler, GRU sequence model, explainability layer
  pipeline/     preprocessing, training, evaluation, DB seeding
  api/          FastAPI backend
  db/           SQLite storage layer
frontend/       React dashboard (alert queue, entity history, explainability)
tests/          pytest suite for the generator and ML pipeline
docs/           architecture, reuse decisions, deployment, limitations
```

## Quickstart

### 1. Backend setup

```bash
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Generate synthetic data

```bash
cd data_gen
python3 generator.py --num-entities 200 --days 30 --out ../data/events.csv
```

Prints how many events were generated and what fraction are anomalous
(default ~2%, matching the 0.5-3% range in the problem statement).

### 3. Train the model

```bash
cd ../backend/pipeline
python3 train.py --data ../../data/events.csv --epochs 15 --out ../../models/gru_model.pt
```

Uses class-weighted loss to handle the extreme imbalance (true intrusions are
a tiny fraction of events) — watch `val_anomaly_recall` climb across epochs.

### 4. Evaluate

```bash
python3 evaluate.py --data ../../data/events.csv --model ../../models/gru_model.pt --budget 0.02
```

Reports per-class precision/recall and the false-positive rate at a realistic
analyst alert budget (top N% of events) — directly matching the evaluation
criteria in the problem statement.

### 5. Seed the database (for the dashboard demo)

```bash
python3 seed_db.py --data ../../data/events.csv
```

### 6. Run the API

```bash
cd ../api
uvicorn main:app --reload --port 8000
```

Open http://localhost:8000/docs for the interactive API explorer.

### 7. Run the dashboard

```bash
cd ../../frontend
npm install
npm run dev
```

Open http://localhost:5173. The dashboard polls `/alerts` every 5 seconds to
simulate a live stream (see `docs/architecture.md` for why polling instead of
websockets, for this scope).

### 8. Generate some alerts to see it work

The dashboard starts empty until events are scored. Ingest a batch:

```bash
curl -X POST http://localhost:8000/events/ingest \
  -H "Content-Type: application/json" \
  -d @path/to/some_events.json
```

Or write a small script that reads a few rows from `data/events.csv`, drops
the `label` column, and POSTs them — see `docs/deployment.md` for a full demo
script.

## Running tests

```bash
pip install pytest
pytest tests/ -v
```

## Known limitations

See `docs/limitations.md`.