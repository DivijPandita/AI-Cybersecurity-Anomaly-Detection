const BASE_URL = "http://localhost:8000";

export async function fetchAlerts(limit = 50, minScore = 0) {
  const res = await fetch(`${BASE_URL}/alerts?limit=${limit}&min_score=${minScore}`);
  if (!res.ok) throw new Error("Failed to fetch alerts");
  return res.json();
}

export async function fetchEntityHistory(entityId, limit = 50) {
  const res = await fetch(`${BASE_URL}/entity/${entityId}/history?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch entity history");
  return res.json();
}

export async function checkHealth() {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) return { status: "error", model_loaded: false };
    return res.json();
  } catch {
    return { status: "unreachable", model_loaded: false };
  }
}