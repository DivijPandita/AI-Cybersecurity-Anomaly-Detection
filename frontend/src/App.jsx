import { useState } from "react";
import TopNav from "./components/TopNav.jsx";
import { useHealth } from "./hooks/useHealth.js";
import Dashboard from "./pages/Dashboard.jsx";
import Alerts from "./pages/Alerts.jsx";
import Entities from "./pages/Entities.jsx";
import Analytics from "./pages/Analytics.jsx";
import Model from "./pages/Model.jsx";
import Settings from "./pages/Settings.jsx";

const PAGES = {
  dashboard: Dashboard,
  alerts: Alerts,
  entities: Entities,
  analytics: Analytics,
  model: Model,
  settings: Settings,
};

export default function App() {
  const [active, setActive] = useState("dashboard");
  const health = useHealth();
  const Page = PAGES[active] ?? Dashboard;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <TopNav active={active} onChange={setActive} health={health} />
      <main style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <Page onNavigate={setActive} />
      </main>
    </div>
  );
}
