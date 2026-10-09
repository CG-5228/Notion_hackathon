import { Icon } from "./Icon";

/** Preserve feature ownership without simulating live data. */
export function ReservedSlot({ name, owner, description }: { name: string; owner: string; description: string }) {
  return (
    <section className="rounded-card border border-dashed border-ink/20 bg-surface px-6 py-14 text-center sm:px-10">
      <span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-sage text-mint-deep"><Icon name="sparkles" size={28} /></span>
      <p className="eyebrow text-brand">Awaiting integration · {owner}</p>
      <h2 className="mt-3 text-2xl font-bold">{name}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-muted">{description}</p>
      <p className="mx-auto mt-6 max-w-sm rounded-xl bg-paper px-4 py-3 text-xs leading-relaxed text-ink-muted">This feature is still being connected. No live data is shown here yet.</p>
    </section>
  );
}
