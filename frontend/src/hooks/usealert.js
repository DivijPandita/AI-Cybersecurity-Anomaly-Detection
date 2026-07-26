import { useCallback, useEffect, useState } from "react";
import { fetchAlerts } from "../services/api.js";

const POLL_INTERVAL_MS = 5000;

export function useAlerts(limit = 100) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchAlerts(limit);
      setAlerts(data);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  return { alerts, loading, error, refresh: load };
}