const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "alerts", label: "Alerts" },
  { id: "entities", label: "Entities" },
  { id: "analytics", label: "Analytics" },
  { id: "model", label: "Model" },
  { id: "settings", label: "Settings" },
];

export default function TopNav({ active, onChange, health }) {
  const isUp = health.status === "ok";

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: 56,
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-green))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 13,
              color: "#04141c",
            }}
          >
            S
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.3 }}>Sentinel</span>
        </div>

        <nav style={{ display: "flex", gap: 4 }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              style={{
                padding: "7px 14px",
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 500,
                color: active === tab.id ? "var(--text-primary)" : "var(--text-secondary)",
                background: active === tab.id ? "var(--surface-2)" : "transparent",
                transition: "background 150ms, color 150ms",
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          model: {health.model_loaded ? "GRU active" : "rule-based fallback"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: isUp ? "var(--accent-green)" : "var(--risk-critical)",
              boxShadow: isUp ? "0 0 6px var(--accent-green)" : "none",
              animation: isUp ? "pulse 2s infinite" : "none",
            }}
          />
          <span className="mono" style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            {isUp ? "LIVE" : "OFFLINE"}
          </span>
        </div>
      </div>
    </header>
  );
}