import type { EventDetail } from "../types";

const pill = "rounded-full px-2.5 py-0.5";

export function KindBadge({ e }: { e: Pick<EventDetail, "kind" | "visibility" | "isDemo"> }) {
  return (
    <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
      {e.kind === "curated_public"
        ? <span className={`${pill} bg-mint/40 text-ink`}>Curated public</span>
        : <span className={`${pill} bg-lilac/40 text-ink`}>Student-created</span>}
      {e.visibility === "invite_only" && <span className={`${pill} bg-sand text-ink-soft`}>Invite-only</span>}
      {e.visibility === "campus" && <span className={`${pill} bg-sand text-ink-soft`}>Campus only</span>}
      {e.isDemo && <span className={`${pill} bg-sun/60 text-warn-ink`}>Demo data</span>}
    </div>
  );
}

export function GoingCount({ n, unis }: { n: number; unis?: number }) {
  return (
    <p className="text-sm text-ink-muted">
      {n === 0 ? "No one has said they're going yet" : `${n} student${n === 1 ? "" : "s"} said they're going`}
      {unis !== undefined && ` · from ${unis} universities`}
      <span className="sr-only"> (self-reported intent, not confirmed attendance)</span>
    </p>
  );
}

export const inputClass =
  "mt-1.5 w-full rounded-xl border border-line bg-paper px-4 py-3 text-ink outline-none transition focus:border-lilac-deep";

export function FieldError({ message }: { message?: string }) {
  return message ? <p role="alert" className="mt-1 text-sm text-danger">{message}</p> : null;
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
