# Deployment / Demo Guide

## Local demo script (recommended order)

1. **Generate data** (once):
   ```bash
   cd data_gen && python3 generator.py --num-entities 200 --days 30 --out ../data/events.csv
   ```

2. **Train the model** (once):
   ```bash
   cd ../backend/pipeline
   python3 train.py --data ../../data/events.csv --epochs 15 --out ../../models/gru_model.pt
   ```

3. **Evaluate** (for your report/slides — copy these numbers into the
   presentation template's metrics slide):
   ```bash
   python3 evaluate.py --data ../../data/events.csv --model ../../models/gru_model.pt --budget 0.01
   ```

4. **Seed the DB** so entities have history (avoids everything looking like
   cold-start on first load):
   ```bash
   python3 seed_db.py --data ../../data/events.csv
   ```

5. **Start the backend**:
   ```bash
   cd ../api
   uvicorn main:app --reload --port 8000
   ```

6. **Start the frontend** (separate terminal):
   ```bash
   cd ../../frontend
   npm install   # first time only
   npm run dev
   ```

7. **Trigger a few live alerts for the demo** — write a tiny script
   (or reuse this snippet) that reads a handful of rows from
   `data/events.csv`, strips the `label` field, and POSTs them to
   `/events/ingest`:

   ```python
   import csv, json, requests

   with open("data/events.csv") as f:
       rows = list(csv.DictReader(f))

   # pick a few anomalous + a few normal rows for a good demo mix
   anomalies = [r for r in rows if r["label"] != "normal"][:5]
   normals = [r for r in rows if r["label"] == "normal"][:5]
   batch = anomalies + normals
   for r in batch:
       r["auth_success"] = int(r["auth_success"])
       r["session_duration"] = int(r["session_duration"])
       r.pop("label", None)

   resp = requests.post("http://localhost:8000/events/ingest", json=batch)
   print(resp.json()["scored"], "events scored")
   ```

   The dashboard picks these up on its next 5-second poll — narrate the
   demo as "the model just flagged N events, ranked by risk, with an
   explanation for each."

## Production deployment notes (for the report's "future work" section)

- Swap SQLite for Postgres; add connection pooling.
- Put the FastAPI app behind a proper ASGI server (gunicorn + uvicorn
  workers) and a reverse proxy.
- Replace polling with a websocket/SSE push from the backend.
- Move event ingestion from direct REST calls to a message queue consumer
  (Kafka/RabbitMQ) so scoring can scale horizontally.
- Add authentication/authorization to the API before any real deployment —
  none is implemented in this prototype.