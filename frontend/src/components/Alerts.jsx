import { useState } from "react";
import AlertTable from "../components/AlertTable.jsx";
import EntityHistory from "../components/EntityHistory.jsx";
import ExplainabilityPanel from "../components/ExplainabilityPanel.jsx";
import { useAlerts } from "../hooks/useAlerts.js";
import { useEntityHistory } from "../hooks/useEntityHistory.js";

export default function Alerts() {
  const { alerts, loading } = useAlerts();
  const [selected, setSelected] = useState(null);
  const { data: entityData, loading: entityLoading } = useEntityHistory(selected?.entity_id);
  const [search, setSearch] = useState("");

  const filtered = alerts.filter(
    (a) =>
      !search ||
      a.entity_id.includes(search) ||
      a.predicted_label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Alert Queue</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" }}>
            {filtered.length} of {alerts.length} events
          </p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by entity or attack type…"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 7,
            padding: "7px 12px",
            color: "var(--text-primary)",
            fontSize: 12.5,
            width: 260,
          }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 16, flex: 1, minHeight: 0 }}>
        <div style={{ overflowY: "auto" }}>
          <AlertTable alerts={filtered} loading={loading} onSelect={setSelected} selectedId={selected?.alert_id} />
        </div>
        <div className="card" style={{ overflowY: "auto" }}>
          <EntityHistory data={entityData} loading={selected && entityLoading} />
        </div>
        <div className="card" style={{ overflowY: "auto" }}>
          <ExplainabilityPanel alert={selected} />
        </div>
      </div>
    </div>
  );
}