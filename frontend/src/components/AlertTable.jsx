import RiskPill from "./RiskPill.jsx";
import { formatLabel, formatDateTime } from "../utils/format.js";

export default function AlertTable({ alerts, onSelect, selectedId, loading, maxRows }) {
  const rows = maxRows ? alerts.slice(0, maxRows) : alerts;

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {["#", "Timestamp", "Entity", "Attack Type", "Risk"].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "10px 16px",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: "var(--text-tertiary)",
                  fontWeight: 600,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={5} style={{ padding: "10px 16px" }}>
                  <div className="skeleton" style={{ height: 16, width: "100%" }} />
                </td>
              </tr>
            ))}

          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: "24px 16px", color: "var(--text-tertiary)", textAlign: "center" }}>
                No alerts yet. Ingest events via the API to populate the queue.
              </td>
            </tr>
          )}

          {!loading &&
            rows.map((alert, i) => (
              <tr
                key={alert.alert_id}
                onClick={() => onSelect?.(alert)}
                className="fade-in"
                style={{
                  borderBottom: "1px solid var(--border)",
                  cursor: onSelect ? "pointer" : "default",
                  background: selectedId === alert.alert_id ? "var(--surface-2)" : "transparent",
                  transition: "background 120ms",
                }}
                onMouseEnter={(e) => {
                  if (selectedId !== alert.alert_id) e.currentTarget.style.background = "var(--surface-hover)";
                }}
                onMouseLeave={(e) => {
                  if (selectedId !== alert.alert_id) e.currentTarget.style.background = "transparent";
                }}
              >
                <td className="mono" style={{ padding: "10px 16px", color: "var(--text-tertiary)" }}>
                  {i + 1}
                </td>
                <td className="mono" style={{ padding: "10px 16px", color: "var(--text-secondary)" }}>
                  {formatDateTime(alert.timestamp)}
                </td>
                <td className="mono" style={{ padding: "10px 16px", color: "var(--text-secondary)" }}>
                  {alert.entity_id.slice(0, 10)}…
                </td>
                <td style={{ padding: "10px 16px", fontWeight: 500 }}>{formatLabel(alert.predicted_label)}</td>
                <td style={{ padding: "10px 16px" }}>
                  <RiskPill score={alert.risk_score} />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}