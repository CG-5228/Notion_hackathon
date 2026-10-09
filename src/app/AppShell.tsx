import { NavLink, Outlet } from "react-router-dom";
import { Logo, ButtonLink } from "@/components";
import { useSession } from "@/lib/auth";
import { cn } from "@/lib/cn";

const nav = [
  { to: "/", label: "Discover", icon: "◎" },
  { to: "/activities/new", label: "Create", icon: "＋" },
  { to: "/my-activities", label: "My plans", icon: "☰" },
];

export function AppShell() {
  const { status, signOut } = useSession();
  const signedIn = status !== "signed_out" && status !== "loading";
  return (
    <div className="min-h-dvh pb-24 md:pb-0">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">Skip to content</a>
      <header className="glass sticky top-0 z-40 border-b border-line/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end className={({ isActive }) => cn("rounded-full px-4 py-2 text-sm font-medium transition", isActive ? "bg-ink text-paper" : "text-ink-soft hover:bg-ink/5")}>{n.label}</NavLink>
            ))}
          </nav>
          {signedIn
            ? <button onClick={() => void signOut()} className="text-sm font-semibold text-ink-soft hover:text-ink">Sign out</button>
            : <ButtonLink to="/auth" variant="primary">Student sign in</ButtonLink>}
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><Outlet /></main>
      <footer className="mx-auto hidden max-w-6xl px-6 pb-10 text-xs text-ink-muted md:block">
        Find Your Buddy is a student meetup helper, not a dating app. We never guarantee attendance or safety — meet in public places.
      </footer>
      <nav aria-label="Mobile" className="glass fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-full border border-line p-1.5 shadow-lift md:hidden">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end className={({ isActive }) => cn("flex flex-1 flex-col items-center rounded-full py-2 text-[11px] font-semibold transition", isActive ? "bg-ink text-paper" : "text-ink-soft")}>
            <span aria-hidden className="text-base leading-none">{n.icon}</span>{n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
