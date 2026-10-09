export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-ink-muted">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />
      <span className="text-sm">{label}…</span>
    </div>
  );
}
