import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "warning" | "info" | "error" | "success";
const tones: Record<Tone, string> = {
  warning: "bg-warn-bg text-warn-ink border-warn-ink/20",
  info: "bg-lilac/25 text-ink border-lilac-deep/20",
  error: "bg-danger/10 text-danger border-danger/25",
  success: "bg-mint/30 text-ink border-mint-deep/30",
};
const icons: Record<Tone, string> = { warning: "⚠", info: "ℹ", error: "✕", success: "✓" };

/** Prominent, accessible notice. Use tone="warning" for the mandatory buddy warnings. */
export function Notice({ tone = "info", title, children, className }:
  { tone?: Tone; title?: string; children: ReactNode; className?: string }) {
  return (
    <div role={tone === "error" || tone === "warning" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-2xl border p-4 text-sm leading-relaxed", tones[tone], className)}>
      <span aria-hidden className="mt-0.5 font-bold">{icons[tone]}</span>
      <div>{title && <p className="mb-0.5 font-semibold">{title}</p>}{children}</div>
    </div>
  );
}
