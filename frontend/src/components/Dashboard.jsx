import StatCard from "../components/StatCard.jsx";
import ModuleCard from "../components/ModuleCard.jsx";
import AttackTypeChart from "../components/AttackTypeChart.jsx";
import AlertTable from "../components/AlertTable.jsx";
import { useAlerts } from "../hooks/useAlerts.js";
import { useHealth } from "../hooks/useHealth.js";

const MODULES = [
  { id: "alerts", title: "Alert Queue", description: "Ranked alerts with entity history and explainability." },
  { id: "entities", title: "Entities", description: "Search any entity's baseline profile and recent activity." },
  { id: "analytics", title: "Analytics", description: "Attack-type distribution and risk breakdown over time." },
  { id: "model", title: "Model", description: "GRU sequence model status, config, and inference health." },
];

export default function Dashboard({ onNavigate }) {
  const { alerts, loading } = useAlerts();
  const health = useHealth();

  const totalEvents = alerts.length;
  const critical = alerts.filter((a) => a.risk_score >= 80).length;
  const entities = new Set(alerts.map((a) => a.entity_id)).size;
  const avgRisk = totalEvents ? alerts.reduce((s, a) => s + a.risk_score, 0) / totalEvents : 0;

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" }}>
          {health.status === "ok" ? "Live" : "Offline"} · {totalEvents} scored events · model:{" "}
          {health.model_loaded ? "GRU active" : "rule-based fallback"}
        </p>
      </div>

      <div style={{ display: "flex", gap: 14 }}>
        <StatCard label="Total Events" value={totalEvents} loading={loading} />
        <StatCard label="Critical Alerts" value={critical} accent="var(--risk-critical)" loading={loading} />
        <StatCard label="Entities Monitored" value={entities} accent="var(--accent-cyan)" loading={loading} />
        <StatCard label="Avg Risk Score" value={avgRisk.toFixed(1)} accent="var(--accent-green)" loading={loading} />
      </div>

      <div>
        <SectionLabel>Modules</SectionLabel>
        <div style={{ display: "flex", gap: 14 }}>
          {MODULES.map((m) => (
            <ModuleCard key={m.id} title={m.title} description={m.description} onClick={() => onNavigate(m.id)} />
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <div className="card" style={{ padding: 18 }}>
          <SectionLabel>Alerts by Attack Type</SectionLabel>
          <AttackTypeChart alerts={alerts} loading={loading} />
        </div>
        <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column" }}>
          <SectionLabel>Top Risk Entities</SectionLabel>
          <TopEntities alerts={alerts} loading={loading} />
        </div>
      </div>

      <div>
        <SectionLabel>Recent Alerts</SectionLabel>
        <AlertTable alerts={alerts} loading={loading} maxRows={8} onSelect={() => onNavigate("alerts")} />
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      className="mono"
      style={{ fontSize: 11, color: "var(--text-secondary)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}
    >
      {children}
    </div>
  );
}

function TopEntities({ alerts, loading }) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 28, width: "100%" }} />
        ))}
      </div>
    );
  }

  const byEntity = {};
  for (const a of alerts) {
    if (!byEntity[a.entity_id] || byEntity[a.entity_id] < a.risk_score) {
      byEntity[a.entity_id] = a.risk_score;
    }
  }
  const top = Object.entries(byEntity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  if (top.length === 0) {
    return <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>No entities scored yet.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {top.map(([entityId, score]) => (
        <div
          key={entityId}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5 }}
        >
          <span className="mono" style={{ color: "var(--text-secondary)" }}>
            {entityId.slice(0, 12)}…
          </span>
          <span style={{ fontWeight: 600, color: score >= 80 ? "var(--risk-critical)" : "var(--text-primary)" }}>
            {score.toFixed(0)}
          </span>
        </div>
      ))}
    </div>
  );
}