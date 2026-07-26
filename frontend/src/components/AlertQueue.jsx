import RiskMeter from "./RiskMeter.jsx";

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AlertQueue({ alerts, selectedId, onSelect, loading }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span className="mono" style={{ fontSize: 12, color: "var(--text-secondary)", letterSpacing: 1 }}>
          ALERT QUEUE
        </span>
        <span className="mono" style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          {alerts.length} events
        </span>
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        {loading && alerts.length === 0 && (
          <div style={{ padding: 24, color: "var(--text-tertiary)", fontSize: 13 }}>Loading alerts…</div>
        )}
        {!loading && alerts.length === 0 && (
          <div style={{ padding: 24, color: "var(--text-tertiary)", fontSize: 13 }}>
            No alerts yet. Ingest events via the API to populate the queue.
          </div>
        )}
        {alerts.map((alert) => (
          <div
            key={alert.alert_id}
            onClick={() => onSelect(alert)}
            tabIndex={0}
            role="button"
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
              cursor: "pointer",
              background: selectedId === alert.alert_id ? "var(--surface-2)" : "transparent",
              borderLeft: selectedId === alert.alert_id ? "2px solid var(--accent-cyan)" : "2px solid transparent",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                {alert.predicted_label.replace(/_/g, " ")}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {alert.entity_id.slice(0, 8)}… · {timeAgo(alert.timestamp)}
              </div>
            </div>
            <RiskMeter score={alert.risk_score} size="sm" />
          </div>
        ))}
      </div>
    </div>
  );
}