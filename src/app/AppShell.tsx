import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Logo, ButtonLink, Icon, Notice, type IconName } from "@/components";
import { useSession } from "@/lib/auth";
import { cn } from "@/lib/cn";

const nav: { to: string; label: string; mobile: string; icon: IconName }[] = [
  { to: "/", label: "Discover", mobile: "Discover", icon: "compass" },
  { to: "/activities/new", label: "Create a plan", mobile: "Create", icon: "plus" },
  { to: "/my-activities", label: "My plans", mobile: "My plans", icon: "calendar" },
];

function pageLabel(path: string) {
  if (path === "/") return "Discover";
  if (path.startsWith("/auth")) return "Your student account";
  if (path.startsWith("/onboarding")) return "Make yourself at home";
  if (path.startsWith("/activities/new")) return "Create a plan";
  if (path.startsWith("/my-activities")) return "My plans";
  if (path.startsWith("/events")) return "Explore an activity";
  if (path.startsWith("/find-buddy")) return "Find your company";
  if (path.startsWith("/buddy")) return "Your conversation";
  if (path.startsWith("/plans") || path.startsWith("/meetups")) return "Your meetup";
  return "A little off the beaten path";
}

export function AppShell() {
  const { status, profile, session, signOut } = useSession();
  const { pathname, hash } = useLocation();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const signedIn = status !== "signed_out" && status !== "loading";
  const isAccountPage = pathname === "/auth";
  const isDemo = profile?.isDemo || session?.user.app_metadata?.fyb_demo === true;

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "instant" });
    else window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash]);

  async function handleSignOut() {
    setSigningOut(true);
    setSignOutError(null);
    try { await signOut(); }
    catch { setSignOutError("We couldn't sign you out. Please try again."); }
    finally { setSigningOut(false); }
  }

  return (
    <div className={cn("min-h-dvh", !isAccountPage && "pb-24 lg:pb-0")}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-white">Skip to content</a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-58 flex-col border-r border-line bg-paper px-5 py-8 lg:flex">
        <div className="px-3"><Logo /></div>
        <p className="eyebrow mb-4 mt-14 px-4 text-ink-muted">A little less solo</p>
        <nav className="space-y-2" aria-label="Main">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end className={({ isActive }) => cn("flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-semibold transition-colors", isActive ? "bg-brand-light text-brand" : "text-ink-soft hover:bg-sand")}>
              <Icon name={item.icon} />{item.label}
            </NavLink>
          ))}
        </nav>
        {status !== "ready" && <><div className="mx-4 my-7 border-t border-line" />
        <nav aria-label="About Find Your Buddy" className="space-y-1">
          <a href="/#how-it-works" className="flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm text-ink-muted transition hover:bg-sand hover:text-ink"><Icon name="sparkles" size={18} />How it works</a>
          <a href="/#privacy" className="flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm text-ink-muted transition hover:bg-sand hover:text-ink"><Icon name="shield" size={18} />Our promise</a>
        </nav></>}

        <div className="mt-auto pt-10">
          {!signedIn && <div className="relative overflow-hidden rounded-2xl bg-sage p-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-forest"><Icon name="users" /></div>
            <p className="font-display text-lg font-bold leading-tight">Your people.<br />Your kind of plans.</p>
            <p className="mb-4 mt-2 text-xs leading-relaxed text-ink-muted">A new connection starts with something in common.</p>
            <ButtonLink to="/auth?mode=signup" className="w-full !px-3 !text-xs">Find your buddy<Icon name="arrow-up-right" size={16} /></ButtonLink>
          </div>}
          <p className="mt-6 flex items-center justify-center gap-2 text-[11px] text-ink-muted"><span className="h-1.5 w-1.5 rounded-full bg-mint-deep" />Made for student life · 18+</p>
        </div>
      </aside>

      <div className="lg:ml-58">
        <header className="glass sticky top-0 z-30 border-b border-line">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-5 sm:px-8 xl:px-11">
            <div className="lg:hidden"><Logo /></div>
            <div className="hidden items-center gap-3 lg:flex">
              <span className="font-display text-lg font-bold">{pageLabel(pathname)}</span>
              <span className="hidden border-l border-line pl-3 text-xs text-ink-muted xl:block">Less scrolling. More living.</span>
            </div>
            <div className="flex items-center gap-3 sm:gap-5">
              {signedIn ? <button onClick={() => void handleSignOut()} disabled={signingOut} className="flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-ink-soft hover:bg-sand disabled:opacity-50"><Icon name="logout" size={17} />{signingOut ? "Signing out…" : "Sign out"}</button> : <>
                <NavLink to="/auth" className="hidden min-h-11 items-center text-sm font-semibold text-ink-soft hover:text-brand sm:inline-flex">Sign in</NavLink>
                <ButtonLink to="/auth?mode=signup" className="!px-4 sm:!px-5"><span className="sm:hidden">Join in</span><span className="hidden sm:inline">Join with uni email</span><Icon name="arrow-up-right" size={17} /></ButtonLink>
              </>}
            </div>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="mx-auto min-h-[calc(100dvh-13rem)] max-w-7xl px-5 py-8 outline-none sm:px-8 sm:py-10 xl:px-11">
          {isDemo && <Notice tone="warning" title="Demo account · synthetic student" className="mb-6">This account was provisioned for testing. Its email ownership and student identity have not been verified. Do not use real personal data in this demo.</Notice>}
          {signOutError && <Notice tone="error" className="mb-6">{signOutError}</Notice>}
          <Outlet />
        </main>
        <footer className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-5 pb-8 pt-4 text-xs text-ink-muted sm:flex-row sm:px-8 xl:px-11">
          <p className="flex items-center gap-1.5">A shared plan. A new connection.<Icon name="heart" size={13} className="text-brand" /></p>
          <p>No swiping. No attendance or safety guarantees.</p>
        </footer>
      </div>

      {!isAccountPage && <nav aria-label="Mobile" className="glass fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-line px-4 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} end className={({ isActive }) => cn("mx-auto flex min-h-13 w-full max-w-28 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors", isActive ? "bg-brand-light text-brand" : "text-ink-muted hover:bg-sand")}>
            <Icon name={item.icon} size={21} />{item.mobile}
          </NavLink>
        ))}
      </nav>}
    </div>
  );
}
