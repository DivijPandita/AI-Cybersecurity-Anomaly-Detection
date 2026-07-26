import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { formatLabel, severity } from "../utils/format.js";

function buildData(alerts) {
  const counts = {};
  const riskSums = {};
  for (const a of alerts) {
    counts[a.predicted_label] = (counts[a.predicted_label] || 0) + 1;
    riskSums[a.predicted_label] = (riskSums[a.predicted_label] || 0) + a.risk_score;
  }
  return Object.entries(counts)
    .map(([label, count]) => ({
      label: formatLabel(label),
      count,
      avgRisk: riskSums[label] / count,
    }))
    .sort((a, b) => b.count - a.count);
}

export default function AttackTypeChart({ alerts, loading }) {
  if (loading) {
    return <div className="skeleton" style={{ height: 260, width: "100%" }} />;
  }

  const data = buildData(alerts);

  if (data.length === 0) {
    return (
      <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
        No alerts yet — ingest events to populate this chart.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
        <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "var(--text-primary)" }}
          formatter={(value, name, props) => [value, "alerts"]}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={severity(entry.avgRisk).color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}