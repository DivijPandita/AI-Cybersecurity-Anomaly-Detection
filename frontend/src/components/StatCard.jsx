export default function StatCard({ label, value, accent, loading }) {
  return (
    <div
      className="card fade-in"
      style={{
        padding: "16px 18px",
        borderTop: accent ? `2px solid ${accent}` : undefined,
        flex: 1,
        minWidth: 0,
      }}
    >
      {loading ? (
        <>
          <div className="skeleton" style={{ height: 26, width: "50%", marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 12, width: "70%" }} />
        </>
      ) : (
        <>
          <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>{value}</div>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginTop: 4,
            }}
          >
            {label}
          </div>
        </>
      )}
    </div>
  );
}