import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import AttackTypeChart from "../components/AttackTypeChart.jsx";
import { useAlerts } from "../hooks/useAlerts.js";
import { severity } from "../utils/format.js";

function riskBuckets(alerts) {
  const buckets = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  const colorFor = { LOW: "var(--risk-low)", MEDIUM: "var(--risk-medium)", HIGH: "var(--risk-high)", CRITICAL: "var(--risk-critical)" };
  for (const a of alerts) buckets[severity(a.risk_score).label]++;
  return Object.entries(buckets).map(([name, value]) => ({ name, value, color: colorFor[name] }));
}

export default function Analytics() {
  const { alerts, loading } = useAlerts();
  const pieData = riskBuckets(alerts);
  const hasData = alerts.length > 0;

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Analytics</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" }}>
          Attack-type distribution and risk-band breakdown across all scored events.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <SectionLabel>Alerts by Attack Type</SectionLabel>
          <AttackTypeChart alerts={alerts} loading={loading} />
        </div>

        <div className="card" style={{ padding: 20 }}>
          <SectionLabel>Risk Distribution</SectionLabel>
          {loading ? (
            <div className="skeleton" style={{ height: 260, width: "100%" }} />
          ) : !hasData ? (
            <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
              No alerts yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="var(--surface)" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      className="mono"
      style={{ fontSize: 11, color: "var(--text-secondary)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}
    >
      {children}
    </div>
  );
}