import { Link } from "react-router-dom";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="20" className="fill-brand" />
      <g fill="none" stroke="white" strokeWidth="4.5" strokeLinecap="round">
        <path d="M17 37v-8a7 7 0 0 1 14 0v9a7 7 0 0 1-14 0m16-12v9a7 7 0 0 0 14 0v-8a7 7 0 0 0-14 0" />
        <path d="M26 32h12" />
      </g>
    </svg>
  );
}

export function Logo() {
  return (
    <Link to="/" aria-label="Find Your Buddy home" className="inline-flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight">
      <LogoMark size={39} /> <span className="leading-[1.05]">find your<br />buddy<span className="text-brand">.</span></span>
    </Link>
  );
}
