import { useEffect, useState } from "react";
import { fetchEntityHistory } from "../services/api.js";

export function useEntityHistory(entityId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!entityId) {
      setData(null);
      return;
    }
    setLoading(true);
    fetchEntityHistory(entityId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [entityId]);

  return { data, loading };
}