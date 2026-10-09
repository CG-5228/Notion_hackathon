import { ButtonLink, Card } from "@/components";
import { EventsFeed } from "@/features/events";
import { useSession } from "@/lib/auth";
import { COPY } from "@/types";

const steps = [
  { n: "01", title: "Verify with your uni email", body: "Only confirmed addresses at approved Irish universities get in. No personal emails." },
  { n: "02", title: "Pick an event", body: "Hackathons, gigs, coffee, the big shop. See anonymous ‘going’ counts — never names." },
  { n: "03", title: "Chat under a pseudonym", body: "Match one-on-one or in a group of 3–5. Names stay hidden until everyone agrees to go." },
];

export function LandingPage() {
  const { status } = useSession();
  if (status === "ready") return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold sm:text-4xl">What's on</h1>
      <EventsFeed />
    </div>
  );
  return (
    <div className="-mx-4 -mt-8 sm:-mx-6">
      <section className="bg-aurora relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
        <div aria-hidden className="pointer-events-none absolute -right-10 top-24 hidden h-64 w-64 animate-float rounded-[40%] bg-lilac/60 blur-sm lg:block" />
        <div aria-hidden className="pointer-events-none absolute right-48 top-64 hidden h-36 w-36 animate-float rounded-full bg-mint/70 [animation-delay:-3s] lg:block" />
        <div className="relative mx-auto max-w-6xl">
          <p className="animate-rise inline-flex items-center gap-2 rounded-full border border-ink/10 bg-paper/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
            <span className="h-2 w-2 rounded-full bg-mint-deep" /> For verified university students · 18+
          </p>
          <h1 className="animate-rise mt-6 max-w-3xl text-5xl font-extrabold leading-[0.95] sm:text-7xl [animation-delay:80ms]">
            Don't want to go alone?<br /><span className="bg-gradient-to-r from-mint-deep via-ink to-lilac-deep bg-clip-text text-transparent">Find your buddy.</span>
          </h1>
          <p className="animate-rise mt-6 max-w-xl text-lg text-ink-soft [animation-delay:160ms]">
            Meet another student — or a small group — heading to the same event. Chat anonymously first. Reveal only when everyone says yes.
          </p>
          <div className="animate-rise mt-8 flex flex-wrap gap-3 [animation-delay:240ms]">
            <ButtonLink to="/auth?mode=signup" size="lg" variant="primary">Join with uni email →</ButtonLink>
            <ButtonLink to="/auth" size="lg" variant="outline">I have an account</ButtonLink>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-16 sm:px-6 md:grid-cols-3">
        {steps.map((s) => (
          <Card key={s.n} className="transition hover:-translate-y-1 hover:shadow-lift">
            <span className="font-display text-sm font-bold text-lilac-deep">{s.n}</span>
            <h3 className="mt-3 text-xl font-bold">{s.title}</h3>
            <p className="mt-2 text-sm text-ink-muted">{s.body}</p>
          </Card>
        ))}
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 sm:px-6 md:grid-cols-2">
        <div className="rounded-card bg-ink p-8 text-paper shadow-lift">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint">One-on-one</p>
          <h3 className="mt-2 text-3xl font-bold">Exactly two of you.</h3>
          <p className="mt-4 rounded-2xl bg-paper/10 p-4 text-sm leading-relaxed text-paper/90">⚠ {COPY.pairWarning}</p>
        </div>
        <div className="rounded-card bg-lilac/40 p-8 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lilac-deep">Group · 3–5</p>
          <h3 className="mt-2 text-3xl font-bold">Safety in numbers-ish.</h3>
          <p className="mt-4 rounded-2xl bg-paper/70 p-4 text-sm leading-relaxed">{COPY.groupNotice}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="grain rounded-card border border-line p-6 text-sm text-ink-muted">
          <p className="font-semibold text-ink">Honest limits</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>{COPY.verificationLimit}</li>
            <li>{COPY.safetyTip}</li>
            <li>{COPY.attendanceDisclaimer}</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
