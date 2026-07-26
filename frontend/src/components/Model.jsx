import { useHealth } from "../hooks/useHealth.js";

const CONFIG = [
  { label: "Architecture", value: "GRU (1 layer, hidden size 32)" },
  { label: "Input window", value: "10 events" },
  { label: "Input features", value: "6 (deviation features per event)" },
  { label: "Output classes", value: "7 (normal + 6 attack types)" },
  { label: "Cold-start threshold", value: "20 events" },
  { label: "Loss function", value: "Cross-entropy, inverse-frequency class weights" },
];

export default function Model() {
  const health = useHealth();

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Model</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" }}>
          Live status from <span className="mono">/health</span>, plus configuration reference from the training pipeline.
        </p>
      </div>

      <div style={{ display: "flex", gap: 14 }}>
        <StatusTile
          label="Backend"
          ok={health.status === "ok"}
          value={health.status === "ok" ? "Connected" : "Unreachable"}
        />
        <StatusTile
          label="Model"
          ok={health.model_loaded}
          value={health.model_loaded ? "GRU loaded" : "Rule-based fallback"}
        />
        <StatusTile label="Database" ok={health.status === "ok"} value={health.status === "ok" ? "SQLite OK" : "Unknown"} />
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div
          className="mono"
          style={{ fontSize: 11, color: "var(--text-secondary)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}
        >
          Configuration
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {CONFIG.map((c) => (
            <div key={c.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
              <span style={{ color: "var(--text-secondary)" }}>{c.label}</span>
              <span className="mono" style={{ color: "var(--text-primary)" }}>{c.value}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 14, marginBottom: 0 }}>
          This configuration is fixed at training time (see <span className="mono">backend/pipeline/train.py</span>) —
          it isn't fetched live, only the status tiles above are.
        </p>
      </div>
    </div>
  );
}

function StatusTile({ label, ok, value }) {
  return (
    <div className="card fade-in" style={{ padding: "16px 18px", flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: ok ? "var(--accent-green)" : "var(--risk-critical)",
          }}
        />
        <span style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{value}</div>
    </div>
  );
}