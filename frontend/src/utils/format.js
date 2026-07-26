export function severity(score) {
  if (score >= 80) return { label: "CRITICAL", color: "var(--risk-critical)" };
  if (score >= 55) return { label: "HIGH", color: "var(--risk-high)" };
  if (score >= 30) return { label: "MEDIUM", color: "var(--risk-medium)" };
  return { label: "LOW", color: "var(--risk-low)" };
}

export function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function formatLabel(label) {
  return label.replace(/_/g, " ");
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}