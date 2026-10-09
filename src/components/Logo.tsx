import { Link } from "react-router-dom";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="18" className="fill-ink" />
      <circle cx="25" cy="32" r="11" className="fill-mint" />
      <circle cx="39" cy="32" r="11" className="fill-lilac" fillOpacity="0.9" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 font-display text-lg font-bold">
      <LogoMark /> <span>Find Your Buddy</span>
    </Link>
  );
}
