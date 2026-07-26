import { useEffect, useState, useCallback } from "react";
import { fetchAlerts, fetchEntityHistory, checkHealth } from "./api.js";
import AlertQueue from "./components/AlertQueue.jsx";
import EntityHistory from "./components/EntityHistory.jsx";
import ExplainabilityPanel from "./components/ExplainabilityPanel.jsx";

const POLL_INTERVAL_MS = 5000;

export default function App() {
  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [selected, setSelected] = useState(null);
  const [entityData, setEntityData] = useState(null);
  const [loadingEntity, setLoadingEntity] = useState(false);
  const [health, setHealth] = useState({ status: "unreachable", model_loaded: false });
  const [search, setSearch] = useState("");

  const loadAlerts = useCallback(async () => {
    try {
      const data = await fetchAlerts(100);
      setAlerts(data);
    } catch {
      // API not reachable yet — queue stays as-is, health indicator communicates this
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    checkHealth().then(setHealth);
    const interval = setInterval(() => {
      loadAlerts();
      checkHealth().then(setHealth);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadAlerts]);

  useEffect(() => {
    if (!selected) return;
    setLoadingEntity(true);
    fetchEntityHistory(selected.entity_id)
      .then(setEntityData)
      .catch(() => setEntityData(null))
      .finally(() => setLoadingEntity(false));
  }, [selected]);

  const filtered = alerts.filter(
    (a) =>
      !search ||
      a.entity_id.includes(search) ||
      a.predicted_label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: health.status === "ok" ? "var(--risk-low)" : "var(--risk-critical)",
              boxShadow: health.status === "ok" ? "0 0 8px var(--risk-low)" : "none",
              animation: health.status === "ok" ? "pulse 2s infinite" : "none",
            }}
          />
          <span className="mono" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 1 }}>
            SENTINEL
          </span>
          <span className="mono" style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            behavioral anomaly console
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by entity or attack type…"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "6px 10px",
              color: "var(--text-primary)",
              fontSize: 12,
              width: 260,
            }}
          />
          <span className="mono" style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            model: {health.model_loaded ? "GRU active" : "rule-based fallback"}
          </span>
        </div>
      </header>

      <main style={{ display: "grid", gridTemplateColumns: "360px 1fr 340px", flex: 1, minHeight: 0 }}>
        <section style={{ borderRight: "1px solid var(--border)", minHeight: 0 }}>
          <AlertQueue
            alerts={filtered}
            selectedId={selected?.alert_id}
            onSelect={setSelected}
            loading={loadingAlerts}
          />
        </section>

        <section style={{ borderRight: "1px solid var(--border)", minHeight: 0, overflowY: "auto" }}>
          <EntityHistory data={entityData} loading={loadingEntity} />
        </section>

        <section style={{ minHeight: 0, overflowY: "auto" }}>
          <ExplainabilityPanel alert={selected} />
        </section>
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
