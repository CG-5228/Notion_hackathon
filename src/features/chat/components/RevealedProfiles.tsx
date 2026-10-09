import type { RevealedProfile } from "@/types";

/** Only what members consented to share. Never email, phone, student number or address. */
export function RevealedProfiles({ profiles }: { profiles: RevealedProfile[] }) {
  if (!profiles.length) return <p className="text-sm text-ink-muted">No other members remain in this plan.</p>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {profiles.map((p, i) => (
        <li key={`${p.displayName}-${i}`} className="flex gap-3 rounded-2xl border border-line bg-paper p-4">
          {p.avatarUrl ? (
            <img src={p.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span aria-hidden className="grid h-12 w-12 place-items-center rounded-full bg-lilac/40 font-display text-lg font-bold">
              {p.displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div>
            <p className="font-semibold">{p.displayName}</p>
            <p className="text-sm text-ink-muted">{p.university}</p>
            {!!p.sharedInterests?.length && (
              <p className="mt-1 text-xs text-ink-muted">Into: {p.sharedInterests.join(", ")}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
