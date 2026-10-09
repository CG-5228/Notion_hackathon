/**
 * Honest placeholder for a feature screen another member has not delivered yet.
 * It deliberately implements NOTHING — no fake events, matches or chats.
 */
export function ReservedSlot({ name, owner, description }: { name: string; owner: string; description: string }) {
  return (
    <section className="grain rounded-card border-2 border-dashed border-ink/15 p-8 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lilac-deep">Coming from {owner}</p>
      <h2 className="mt-2 text-2xl font-bold">{name}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{description}</p>
      <p className="mt-4 text-xs text-ink-muted">Not built yet — nothing on this screen is real data.</p>
    </section>
  );
}
