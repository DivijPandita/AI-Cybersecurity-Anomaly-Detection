import RiskMeter from "./RiskMeter.jsx";

export default function ExplainabilityPanel({ alert }) {
  if (!alert) {
    return (
      <div style={{ padding: 20, color: "var(--text-tertiary)", fontSize: 13 }}>
        Select an alert to see why it was flagged.
      </div>
    );
  }

  const factors = alert.top_factors || [];
  const maxContribution = Math.max(0.01, ...factors.map((f) => f.contribution));

  return (
    <div style={{ padding: "16px 20px" }}>
      <div className="mono" style={{ fontSize: 12, color: "var(--text-secondary)", letterSpacing: 1, marginBottom: 14 }}>
        WHY THIS WAS FLAGGED
      </div>

      <div style={{ marginBottom: 18 }}>
        <RiskMeter score={alert.risk_score} />
      </div>

      <div style={{ fontSize: 13, marginBottom: 16, lineHeight: 1.5, color: "var(--text-secondary)" }}>
        Classified as <strong style={{ color: "var(--text-primary)" }}>{alert.predicted_label.replace(/_/g, " ")}</strong>
        {alert.scoring_method && (
          <>
            {" "}via <span className="mono" style={{ color: "var(--text-tertiary)" }}>{alert.scoring_method}</span>
          </>
        )}
        .
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {factors.map((f, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: "var(--text-primary)" }}>{f.factor}</span>
              <span className="mono" style={{ color: "var(--text-tertiary)" }}>{f.contribution.toFixed(2)}</span>
            </div>
            <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
              <div
                style={{
                  width: `${(f.contribution / maxContribution) * 100}%`,
                  height: "100%",
                  background: "var(--accent-cyan)",
                }}
              />
            </div>
          </div>
        ))}
        {factors.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>No contributing factors recorded.</div>
        )}
      </div>
    </div>
  );
}