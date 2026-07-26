import { useEffect, useState } from "react";
import { checkHealth } from "../services/api.js";

const POLL_INTERVAL_MS = 5000;

export function useHealth() {
  const [health, setHealth] = useState({ status: "unreachable", model_loaded: false });

  useEffect(() => {
    const check = () => checkHealth().then(setHealth);
    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return health;
}