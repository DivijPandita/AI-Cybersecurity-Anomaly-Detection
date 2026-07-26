"""
GRU-based sequence-aware anomaly detector + attack-type classifier.

Why GRU over LSTM: fewer parameters, faster to train, and on short windows
(10 events) the two perform almost identically — GRU is the more practical
beginner default here.

Design: input is a window of per-event deviation-feature vectors (from
baseline_profiler.deviation_features). The GRU reads the window and the
final hidden state feeds a classification head over
[normal, brute_force, impossible_travel, credential_stuffing,
 lateral_movement, device_spoofing, low_and_slow_exfiltration].

The risk score (0-100) is derived as 1 - P(normal), so it's always
consistent with the classification, and cheap to explain: "the model is
X% confident this is NOT normal behavior."
"""

import torch
import torch.nn as nn

N_FEATURES = 6  # matches FEATURE_ORDER in baseline_profiler.py


class GRUAnomalyClassifier(nn.Module):
    def __init__(self, n_features=N_FEATURES, hidden_size=32, n_classes=7, num_layers=1):
        super().__init__()
        self.gru = nn.GRU(
            input_size=n_features,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
        )
        self.classifier = nn.Sequential(
            nn.Linear(hidden_size, 16),
            nn.ReLU(),
            nn.Linear(16, n_classes),
        )

    def forward(self, x):
        # x: (batch, window_size, n_features)
        _, h_n = self.gru(x)
        h_last = h_n[-1]  # (batch, hidden_size)
        logits = self.classifier(h_last)  # (batch, n_classes)
        return logits

    @torch.no_grad()
    def score(self, x):
        """Returns (risk_score in [0,100], predicted_class_idx, class_probs)."""
        self.eval()
        logits = self.forward(x)
        probs = torch.softmax(logits, dim=-1)
        p_normal = probs[:, 0]
        risk = (1 - p_normal) * 100
        pred_class = torch.argmax(probs, dim=-1)
        return risk, pred_class, probs


def save_model(model, path):
    torch.save(model.state_dict(), path)


def load_model(path, **kwargs):
    model = GRUAnomalyClassifier(**kwargs)
    model.load_state_dict(torch.load(path, map_location="cpu"))
    model.eval()
    return model