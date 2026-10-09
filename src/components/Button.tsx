import type { ButtonHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "@/lib/cn";

type Variant = "primary" | "mint" | "ghost" | "outline" | "danger";
type Size = "md" | "lg";

const base = "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";
const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper shadow-soft hover:bg-ink-soft hover:-translate-y-0.5",
  mint: "bg-mint text-ink shadow-soft hover:brightness-105 hover:-translate-y-0.5",
  ghost: "text-ink hover:bg-ink/5",
  outline: "border border-ink/15 bg-paper/70 text-ink hover:border-ink/40",
  danger: "bg-danger text-paper hover:brightness-110",
};
const sizes: Record<Size, string> = { md: "h-11 px-5 text-sm", lg: "h-14 px-7 text-base" };

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(base, variants[variant], sizes[size], extra);
}

export function Button({ variant = "primary", size = "md", className, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...rest} />;
}

export function ButtonLink({ variant = "primary", size = "md", className, ...rest }:
  LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}
