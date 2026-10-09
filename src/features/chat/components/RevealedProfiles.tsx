import type { RevealedProfile } from "@/types";

/** Only what members consented to share. Never email, phone, student number or address. */
export function RevealedProfiles({ profiles }: { profiles: RevealedProfile[] }) {
  if (!profiles.length) return <p className="text-sm text-ink-muted">No other members remain in this plan.</p>;
  return (
    <ul aria-label="Revealed buddy profiles" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-3">
      {profiles.map((p, i) => (
        <li key={`${p.displayName}-${i}`} className="flex min-w-0 items-start gap-3 rounded-2xl border border-line bg-paper p-3">
          {p.avatarUrl ? (
            <img src={p.avatarUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sage font-display text-lg font-bold text-forest">
              {p.displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
            <p className="font-display text-base font-semibold leading-snug">{p.displayName}</p>
            <p className="mt-1 text-sm leading-snug text-ink-muted">{p.university}</p>
            {!!p.sharedInterests?.length && (
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">Into: {p.sharedInterests.join(", ")}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
