import { useCallback, useEffect, useRef, useState } from "react";
import { matchingApi, subscribeToMatch, type BuddyStatus } from "./api";

const POLL_MS = 5000;

/** Server-truth buddy status for an event: polls while waiting/forming, plus realtime on the match row. */
export function useBuddyStatus(eventId: string) {
  const [status, setStatus] = useState<BuddyStatus | null>(null);
  const [error, setError] = useState<unknown>(null);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const s = await matchingApi.getMyBuddyStatus(eventId);
      if (alive.current) { setStatus(s); setError(null); }
    } catch (e) {
      if (alive.current) setError(e);
    }
  }, [eventId]);

  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => { alive.current = false; };
  }, [refresh]);

  const waiting = status?.state === "queued" || status?.state === "forming";
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [waiting, refresh]);

  const matchId = status && "matchId" in status ? status.matchId : undefined;
  useEffect(() => {
    if (!matchId) return;
    return subscribeToMatch(matchId, () => void refresh());
  }, [matchId, refresh]);

  return { status, setStatus, error, refresh };
}
