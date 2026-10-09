import { useCallback, useEffect, useRef, useState } from "react";
import { BACKEND_SETUP_ERROR, backendErrorMessage } from "@/lib/backend-errors";
import { matchingApi, subscribeToMatch, type BuddyActivity } from "./api";

const POLL_MS = 5000;
const ERROR_FALLBACK = "Your matching activity is temporarily unavailable. Please try again.";

export function useMyBuddyActivity() {
  const [items, setItems] = useState<BuddyActivity[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const alive = useRef(false);
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const result = await matchingApi.getMyBuddyActivity();
      if (alive.current && version === requestVersion.current) {
        setItems(result);
        setErrorMessage(null);
      }
    } catch (error) {
      if (alive.current && version === requestVersion.current) {
        const message = backendErrorMessage(error, ERROR_FALLBACK);
        setErrorMessage(message === BACKEND_SETUP_ERROR ? message : ERROR_FALLBACK);
      }
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => { alive.current = false; };
  }, [refresh]);

  const shouldPoll = items?.some((item) => item.state === "waiting" || item.state === "forming") ?? false;
  useEffect(() => {
    if (!shouldPoll) return;
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [refresh, shouldPoll]);

  const matchIds = [...new Set((items ?? []).flatMap((item) => item.matchId ? [item.matchId] : []))];
  const matchKey = matchIds.join(",");
  useEffect(() => {
    const unsubscribe = matchIds.map((matchId) => subscribeToMatch(matchId, () => void refresh()));
    return () => unsubscribe.forEach((stop) => stop());
  }, [matchKey, refresh]);

  return { items, errorMessage, refresh };
}
