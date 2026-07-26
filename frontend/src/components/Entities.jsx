import { useState } from "react";
import EntityHistory from "../components/EntityHistory.jsx";
import { useEntityHistory } from "../hooks/useEntityHistory.js";
import { useAlerts } from "../hooks/useAlerts.js";

export default function Entities() {
  const [input, setInput] = useState("");
  const [activeId, setActiveId] = useState(null);
  const { data, loading } = useEntityHistory(activeId);
  const { alerts } = useAlerts();

  const knownEntities = [...new Set(alerts.map((a) => a.entity_id))].slice(0, 8);

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Entities</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" }}>
          Look up a user, service account, or device by its entity ID.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setActiveId(input.trim())}
          placeholder="Paste an entity_id…"
          style={{
            flex: 1,
            maxWidth: 420,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 7,
            padding: "9px 12px",
            color: "var(--text-primary)",
            fontSize: 13,
          }}
          className="mono"
        />
        <button
          onClick={() => setActiveId(input.trim())}
          className="card card-hoverable"
          style={{ padding: "9px 18px", fontSize: 13, fontWeight: 600, color: "var(--accent-cyan)" }}
        >
          Look up
        </button>
      </div>

      {knownEntities.length > 0 && (
        <div>
          <div className="mono" style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 8 }}>
            RECENTLY ALERTED ENTITIES
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {knownEntities.map((id) => (
              <button
                key={id}
                onClick={() => {
                  setInput(id);
                  setActiveId(id);
                }}
                className="mono"
                style={{
                  fontSize: 11.5,
                  padding: "5px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: activeId === id ? "var(--surface-2)" : "transparent",
                  color: "var(--text-secondary)",
                }}
              >
                {id.slice(0, 14)}…
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ minHeight: 300 }}>
        {activeId ? (
          <EntityHistory data={data} loading={loading} />
        ) : (
          <div style={{ padding: 24, color: "var(--text-tertiary)", fontSize: 13 }}>
            Enter or select an entity ID above to view its profile and history.
          </div>
        )}
      </div>
    </div>
  );
}