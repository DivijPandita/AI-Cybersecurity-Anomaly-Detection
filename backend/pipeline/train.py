"""
Trains the GRU anomaly/attack-type classifier.

Class imbalance handling: true intrusions are ~0.5-3% of events, so naive
training collapses to "always predict normal." We use inverse-frequency
class weights in the loss (cheap, no synthetic oversampling needed at this
scale) — a step up from the old project's Isolation Forest, which had no
notion of a loss function or class weighting at all since it was unsupervised.

Run:
    python train.py --data ../../data/events.csv --epochs 15
"""

import argparse
import sys
import os
import random

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from backend.pipeline.preprocess import load_events, build_windows, LABEL_TO_IDX, IDX_TO_LABEL
from backend.models.sequence_model import GRUAnomalyClassifier, save_model


class WindowDataset(Dataset):
    def __init__(self, samples):
        self.samples = samples

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        window, label, meta = self.samples[idx]
        return torch.tensor(window, dtype=torch.float32), torch.tensor(label, dtype=torch.long)


def class_weights(samples, n_classes):
    counts = [1e-6] * n_classes
    for _, label, _ in samples:
        counts[label] += 1
    total = sum(counts)
    weights = [total / (n_classes * c) for c in counts]
    return torch.tensor(weights, dtype=torch.float32)


def train(data_path, epochs=15, batch_size=32, lr=1e-3, out_path="../../models/gru_model.pt", seed=42):
    random.seed(seed)
    torch.manual_seed(seed)

    rows = load_events(data_path)
    samples = build_windows(rows)
    random.shuffle(samples)

    split = int(len(samples) * 0.8)
    train_samples, val_samples = samples[:split], samples[split:]

    n_classes = len(LABEL_TO_IDX)
    weights = class_weights(train_samples, n_classes)
    print("Class weights (inverse frequency):", {IDX_TO_LABEL[i]: round(w.item(), 2) for i, w in enumerate(weights)})

    train_loader = DataLoader(WindowDataset(train_samples), batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(WindowDataset(val_samples), batch_size=batch_size)

    model = GRUAnomalyClassifier(n_classes=n_classes)
    criterion = nn.CrossEntropyLoss(weight=weights)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)

    for epoch in range(epochs):
        model.train()
        total_loss = 0
        for x, y in train_loader:
            optimizer.zero_grad()
            logits = model(x)
            loss = criterion(logits, y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * x.size(0)

        val_acc, val_recall_anomaly = evaluate_quick(model, val_loader, n_classes)
        print(f"Epoch {epoch+1}/{epochs} - train_loss={total_loss/len(train_samples):.4f} "
              f"val_acc={val_acc:.3f} val_anomaly_recall={val_recall_anomaly:.3f}")

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    save_model(model, out_path)
    print(f"Saved model to {out_path}")
    return model


@torch.no_grad()
def evaluate_quick(model, loader, n_classes):
    model.eval()
    correct, total = 0, 0
    anomaly_correct, anomaly_total = 0, 0
    for x, y in loader:
        logits = model(x)
        preds = torch.argmax(logits, dim=-1)
        correct += (preds == y).sum().item()
        total += y.size(0)
        anomaly_mask = y != 0
        anomaly_total += anomaly_mask.sum().item()
        anomaly_correct += ((preds == y) & anomaly_mask).sum().item()
    acc = correct / max(total, 1)
    recall = anomaly_correct / max(anomaly_total, 1)
    return acc, recall


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="../../data/events.csv")
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--out", default="../../models/gru_model.pt")
    args = parser.parse_args()
    train(args.data, epochs=args.epochs, out_path=args.out)