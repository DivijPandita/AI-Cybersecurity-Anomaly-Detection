import { useEffect, useState } from "react";
import { fetchAlerts } from "../services/api.js";

export default function Settings() {
  const [threshold, setThreshold] = useState(0);
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchAlerts(500, threshold)
      .then((data) => setCount(data.length))
      .catch(() => setCount(null))
      .finally(() => setLoading(false));
  }, [threshold]);

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18, maxWidth: 560 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Settings</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" }}>
          Adjust how the alert queue is filtered. This calls <span className="mono">/alerts?min_score=…</span> live —
          no data is faked here.
        </p>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 10 }}>
          <span>Minimum risk score to show as an alert</span>
          <span className="mono" style={{ color: "var(--accent-cyan)" }}>{threshold}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--accent-cyan)" }}
        />
        <div style={{ marginTop: 14, fontSize: 13, color: "var(--text-secondary)" }}>
          {loading ? (
            <div className="skeleton" style={{ height: 16, width: 180 }} />
          ) : (
            <>Matching alerts at this threshold: <strong style={{ color: "var(--text-primary)" }}>{count ?? "—"}</strong></>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div className="mono" style={{ fontSize: 11, color: "var(--text-secondary)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
          API
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Backend base URL: <span className="mono" style={{ color: "var(--text-primary)" }}>http://localhost:8000</span>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6 }}>
          Dashboard poll interval: <span className="mono" style={{ color: "var(--text-primary)" }}>5s</span>
        </div>
      </div>
    </div>
  );
}