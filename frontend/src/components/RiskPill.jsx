import { severity } from "../utils/format.js";

export default function RiskPill({ score }) {
  const { label, color } = severity(score);
  return (
    <span
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        borderRadius: 5,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: 0.4,
        color,
        background: `${color}1a`,
        border: `1px solid ${color}40`,
      }}
    >
      {label} · {score.toFixed(0)}
    </span>
  );
}