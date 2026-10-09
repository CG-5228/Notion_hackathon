import type { EventDetail } from "../types";

export function KindBadge({ e }: { e: Pick<EventDetail, "kind" | "visibility" | "isDemo"> }) {
  return (
    <div className="flex flex-wrap gap-1.5 text-xs font-medium">
      {e.kind === "curated_public" ? (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-900">Curated public</span>
      ) : (
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-900">Student-created</span>
      )}
      {e.visibility === "invite_only" && (
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-800">Invite-only</span>
      )}
      {e.visibility === "campus" && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">Campus only</span>
      )}
      {e.isDemo && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">Demo data</span>
      )}
    </div>
  );
}

export function GoingCount({ n, unis }: { n: number; unis?: number }) {
  return (
    <p className="text-sm text-slate-600">
      {n === 0 ? "No one has said they're going yet" : `${n} student${n === 1 ? "" : "s"} said they're going`}
      {unis !== undefined && ` · from ${unis} universities`}
      <span className="sr-only"> (self-reported intent, not confirmed attendance)</span>
    </p>
  );
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
