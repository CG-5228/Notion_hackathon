import type { ButtonHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "@/lib/cn";

type Variant = "primary" | "mint" | "ghost" | "outline" | "danger";
type Size = "md" | "lg";

const base = "inline-flex shrink-0 items-center justify-center gap-2.5 rounded-full font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
const variants: Record<Variant, string> = {
  primary: "bg-brand text-white shadow-soft enabled:hover:bg-brand-dark enabled:hover:-translate-y-0.5 [&:not(button)]:hover:bg-brand-dark",
  mint: "bg-mint text-ink shadow-soft hover:brightness-105 hover:-translate-y-0.5",
  ghost: "text-ink hover:bg-ink/5",
  outline: "border border-line bg-surface text-ink hover:border-ink/40 hover:bg-paper",
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
