function severity(score) {
  if (score >= 80) return { label: "CRITICAL", css: "var(--risk-critical)" };
  if (score >= 55) return { label: "HIGH", css: "var(--risk-high)" };
  if (score >= 30) return { label: "MEDIUM", css: "var(--risk-medium)" };
  return { label: "LOW", css: "var(--risk-low)" };
}

export default function RiskMeter({ score, size = "md" }) {
  const filled = Math.round((score / 100) * 10);
  const { label, css } = severity(score);
  const segH = size === "sm" ? 10 : 14;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 120 }}>
      <div style={{ display: "flex", gap: 2 }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: segH,
              borderRadius: 1,
              background: i < filled ? css : "var(--border)",
              transition: "background 200ms",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="mono" style={{ fontSize: 11, letterSpacing: 0.5, color: css, fontWeight: 600 }}>
          {label}
        </span>
        <span className="mono" style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          {score.toFixed(0)}
        </span>
      </div>
    </div>
  );
}