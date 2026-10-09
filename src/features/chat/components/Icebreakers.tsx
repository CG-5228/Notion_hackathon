/** Static, deterministic starters. Suggestions only — tapping one fills the box, never sends. */
export const ICEBREAKERS = [
  "Have you been to this kind of event before?",
  "Where would be an easy public spot to meet beforehand?",
  "What are you most looking forward to?",
  "Are you coming straight from campus?",
] as const;

export function Icebreakers({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Conversation starters">
      {ICEBREAKERS.map((t) => (
        <button key={t} type="button" onClick={() => onPick(t)}
          className="shrink-0 rounded-full border border-lilac-deep/30 bg-lilac/20 px-3 py-1.5 text-xs text-ink hover:bg-lilac/35">
          {t}
        </button>
      ))}
    </div>
  );
}
