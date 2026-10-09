import { useCallback, useEffect, useRef, useState } from "react";
import { chatApi } from "./api";
import type { ChatMatchView, ChatMessage } from "./types";

type State =
  | { phase: "loading" }
  | { phase: "error"; error: unknown }
  | { phase: "ready"; view: ChatMatchView; messages: ChatMessage[] };

/** Loads match + messages and keeps them fresh from the realtime signal. */
export function useMatchRoom(matchId: string, { withMessages = true } = {}) {
  const [state, setState] = useState<State>({ phase: "loading" });
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const view = await chatApi.getMatch(matchId);
      const messages = withMessages && view.chatEnabled ? await chatApi.getMessages(matchId) : [];
      if (alive.current) setState({ phase: "ready", view, messages });
    } catch (error) {
      if (alive.current) setState({ phase: "error", error });
    }
  }, [matchId, withMessages]);

  useEffect(() => {
    alive.current = true;
    void refresh();
    const unsubscribe = chatApi.subscribe(matchId, () => void refresh());
    return () => { alive.current = false; unsubscribe(); };
  }, [matchId, refresh]);

  const setView = useCallback((view: ChatMatchView) => {
    setState((s) => (s.phase === "ready" ? { ...s, view } : { phase: "ready", view, messages: [] }));
  }, []);
  const appendMessage = useCallback((m: ChatMessage) => {
    setState((s) => (s.phase === "ready" && !s.messages.some((x) => x.id === m.id)
      ? { ...s, messages: [...s.messages, m] } : s));
  }, []);

  return { state, refresh, setView, appendMessage };
}
