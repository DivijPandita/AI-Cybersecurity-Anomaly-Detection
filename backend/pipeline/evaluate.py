"""
Evaluation aligned directly to the hackathon's stated criteria:
- detection accuracy on imbalanced labels
- correct anomaly-type classification
- false positive rate at a realistic analyst alert budget (e.g. top 1% of events)

Run:
    python evaluate.py --data ../../data/events.csv --model ../../models/gru_model.pt
"""

import argparse
import sys
import os

import torch
from torch.utils.data import DataLoader

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from backend.pipeline.preprocess import load_events, build_windows, LABEL_TO_IDX, IDX_TO_LABEL
from backend.pipeline.train import WindowDataset
from backend.models.sequence_model import load_model


def evaluate(data_path, model_path, alert_budget=0.01):
    rows = load_events(data_path)
    samples = build_windows(rows)
    n_classes = len(LABEL_TO_IDX)
    model = load_model(model_path, n_classes=n_classes)

    loader = DataLoader(WindowDataset(samples), batch_size=64)

    all_risk, all_true, all_pred = [], [], []
    with torch.no_grad():
        for x, y in loader:
            risk, pred_class, probs = model.score(x)
            all_risk.extend(risk.tolist())
            all_true.extend(y.tolist())
            all_pred.extend(pred_class.tolist())

    # --- per-class precision/recall ---
    print("\nPer-class metrics:")
    for cls_idx, cls_name in IDX_TO_LABEL.items():
        tp = sum(1 for t, p in zip(all_true, all_pred) if t == cls_idx and p == cls_idx)
        fp = sum(1 for t, p in zip(all_true, all_pred) if t != cls_idx and p == cls_idx)
        fn = sum(1 for t, p in zip(all_true, all_pred) if t == cls_idx and p != cls_idx)
        support = sum(1 for t in all_true if t == cls_idx)
        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        print(f"  {cls_name:28s} support={support:5d}  precision={precision:.3f}  recall={recall:.3f}")

    # --- false positive rate at alert budget ---
    n_alerts = max(1, int(len(all_risk) * alert_budget))
    ranked = sorted(zip(all_risk, all_true), key=lambda t: t[0], reverse=True)[:n_alerts]
    false_positives = sum(1 for score, true_label in ranked if true_label == LABEL_TO_IDX["normal"])
    fp_rate = false_positives / n_alerts
    true_anomalies_caught = sum(1 for _, t in ranked if t != LABEL_TO_IDX["normal"])
    total_anomalies = sum(1 for t in all_true if t != LABEL_TO_IDX["normal"])

    print(f"\nAt top {alert_budget*100:.0f}% alert budget ({n_alerts} alerts):")
    print(f"  False positive rate: {fp_rate:.3f}")
    print(f"  Anomalies caught: {true_anomalies_caught}/{total_anomalies} "
          f"({true_anomalies_caught/max(total_anomalies,1)*100:.1f}% recall at budget)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="../../data/events.csv")
    parser.add_argument("--model", default="../../models/gru_model.pt")
    parser.add_argument("--budget", type=float, default=0.01)
    args = parser.parse_args()
    evaluate(args.data, args.model, alert_budget=args.budget)