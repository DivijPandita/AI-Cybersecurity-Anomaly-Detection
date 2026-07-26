export default function EntityHistory({ data, loading }) {
  if (loading) {
    return <div style={{ padding: 20, color: "var(--text-tertiary)", fontSize: 13 }}>Loading entity history…</div>;
  }
  if (!data) {
    return (
      <div style={{ padding: 20, color: "var(--text-tertiary)", fontSize: 13 }}>
        Select an alert to view the entity's behavior history.
      </div>
    );
  }

  const { profile, events } = data;

  return (
    <div style={{ padding: "16px 20px", overflowY: "auto", height: "100%" }}>
      <div className="mono" style={{ fontSize: 12, color: "var(--text-secondary)", letterSpacing: 1, marginBottom: 12 }}>
        ENTITY PROFILE
      </div>

      {profile ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 20,
            fontSize: 12,
          }}
        >
          <Field label="Type" value={profile.entity_type} />
          <Field label="Events seen" value={profile.event_count} />
          <Field label="Home geo" value={profile.home_geo} />
          <Field label="Usual auth" value={profile.usual_auth} />
          <Field label="Avg session" value={`${Math.round(profile.avg_session_seconds)}s`} />
          <Field label="Usual resources" value={(profile.usual_resources || []).join(", ") || "—"} span />
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--risk-medium)", marginBottom: 20 }}>
          No baseline profile yet — this entity is in cold-start.
        </div>
      )}

      <div className="mono" style={{ fontSize: 12, color: "var(--text-secondary)", letterSpacing: 1, marginBottom: 10 }}>
        RECENT EVENTS
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {events.slice(0, 15).map((e) => (
          <div
            key={e.event_id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              fontSize: 12,
              padding: "6px 10px",
              background: "var(--surface-2)",
              borderRadius: 4,
              border: "1px solid var(--border)",
            }}
          >
            <span className="mono" style={{ color: "var(--text-tertiary)", flexShrink: 0 }}>
              {new Date(e.timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
            <span style={{ color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {e.resource_accessed}
            </span>
            <span className="mono" style={{ color: "var(--text-tertiary)", flexShrink: 0 }}>{e.geo_location}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, span }) {
  return (
    <div style={{ gridColumn: span ? "1 / -1" : "auto" }}>
      <div style={{ color: "var(--text-tertiary)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
        {label}
      </div>
      <div className="mono" style={{ color: "var(--text-primary)" }}>{String(value)}</div>
    </div>
  );
}