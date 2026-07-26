export default function ModuleCard({ title, description, onClick }) {
  return (
    <div
      className="card card-hoverable fade-in"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      style={{ padding: "16px 18px", flex: 1, minWidth: 0 }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>{description}</div>
    </div>
  );
}