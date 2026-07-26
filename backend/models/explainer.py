"""
Explainability layer.

Two complementary techniques, both cheap and appropriate for a beginner-solo
build:

1. Feature-level explanation (primary, always available): our deviation
   features (new_geo, new_resource, new_device, off_hours, auth_failed,
   session_anomaly) are already human-interpretable by construction — so the
   simplest, most robust explanation is just "which of these were highest for
   this event." No SHAP/LIME dependency needed, and it can never contradict
   the score since the score IS a function of these features (directly for
   cold-start, indirectly via the GRU otherwise).

2. Model saliency (secondary, when the GRU is used): input-gradient
   magnitude w.r.t. the risk score, averaged over the window, shows which
   *positions in time* and which *features* the model actually leaned on —
   useful for sanity-checking that the GRU is picking up on the right signal
   and not spurious correlations.
"""

import torch

FEATURE_LABELS = {
    "new_geo": "logged in from an unfamiliar location",
    "new_resource": "accessed a resource never touched before",
    "new_device": "device fingerprint doesn't match usual device",
    "off_hours": "activity far outside usual hours",
    "auth_failed": "authentication failed",
    "session_anomaly": "session duration far from typical",
}


def explain_from_features(features: dict, top_k=3):
    """Rule-based explanation — always available, always consistent with the
    rule-based risk score."""
    ranked = sorted(features.items(), key=lambda kv: kv[1], reverse=True)
    ranked = [(k, v) for k, v in ranked if k in FEATURE_LABELS and v > 0.05]
    return [
        {"factor": FEATURE_LABELS[k], "contribution": round(v, 2)}
        for k, v in ranked[:top_k]
    ]


def explain_from_model(model, window_tensor, top_k=3):
    """Gradient-based saliency: how much would the risk score change if each
    feature, at each timestep, changed slightly? Averaged over the window to
    give one importance value per feature.

    Note: this does its own grad-enabled forward pass — it must NOT reuse
    model.score(), which runs under torch.no_grad() and would leave x.grad
    as None."""
    model.eval()
    x = window_tensor.clone().detach()
    if x.dim() == 2:
        x = x.unsqueeze(0)  # (1, window_size, n_features)
    x.requires_grad_(True)

    with torch.set_grad_enabled(True):
        logits = model(x)
        p_anomaly = 1 - torch.softmax(logits, dim=-1)[:, 0]
        p_anomaly.sum().backward()

    saliency = x.grad.abs().mean(dim=1).squeeze(0)  # (n_features,) avg over time
    from backend.models.baseline_profiler import FEATURE_ORDER
    ranked = sorted(zip(FEATURE_ORDER, saliency.tolist()), key=lambda kv: kv[1], reverse=True)
    return [
        {"factor": FEATURE_LABELS.get(k, k), "contribution": round(v, 3)}
        for k, v in ranked[:top_k]
    ]