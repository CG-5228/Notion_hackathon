import type { ReactNode, SVGProps } from "react";

const paths = {
  compass: <><circle cx="12" cy="12" r="9" /><path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  calendar: <><rect x="4" y="5" width="16" height="16" rx="3" /><path d="M8 3v4m8-4v4M4 11h16m-11 5h2" /></>,
  "arrow-right": <path d="M4 12h16m-6-6 6 6-6 6" />,
  "arrow-left": <path d="M20 12H4m6-6-6 6 6 6" />,
  "arrow-up-right": <path d="M6 18 18 6M6 6h12v12" />,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></>,
  users: <><path d="M15 21v-2a5 5 0 0 0-10 0v2m14 0v-2a5 5 0 0 0-2-4M16 3a4 4 0 0 1 0 8" /><circle cx="10" cy="7" r="4" /></>,
  user: <><circle cx="12" cy="7" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>,
  chat: <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.8-5.5a9 9 0 0 1-.8-4A8.5 8.5 0 0 1 12.5 3H13a8.5 8.5 0 0 1 8 8v.5Z" />,
  coffee: <><path d="M4 9h12v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9Zm12 1h2a3 3 0 1 1 0 6h-2M7 3v2m5-2v2M2 23h17" /></>,
  mountain: <><path d="m2 20 7-14 5 9 3-6 5 11H2Z" /><path d="m6 12 3 2 3-2" /></>,
  code: <path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18" />,
  film: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16m10-16v16M3 9h4m-4 6h4m10-6h4m-4 6h4" /></>,
  sparkles: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM21 1v4m-2-2h4" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m3 7 9 6 9-6" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  "eye-off": <><path d="m3 3 18 18M10.5 5.1 12 5c6.5 0 10 7 10 7a19 19 0 0 1-3 3.8M6.2 6.2A20 20 0 0 0 2 12s3.5 7 10 7a12 12 0 0 0 5.8-1.8" /><path d="M10 10a3 3 0 0 0 4 4" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v.01" /></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
  logout: <><path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4m5-13 5 5-5 5m-6-5h15" /></>,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 20, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{paths[name]}</svg>;
}
