import { useState } from "react";
import { Link } from "react-router-dom";
import { ButtonLink, Icon, buttonClass, type IconName } from "@/components";
import { EventsFeed } from "@/features/events";
import { useSession } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { COPY } from "@/types";

const categories: { id: string; label: string; icon: IconName }[] = [
  { id: "all", label: "A bit of everything", icon: "compass" },
  { id: "coffee", label: "Food & coffee", icon: "coffee" },
  { id: "outdoors", label: "Outdoors", icon: "mountain" },
  { id: "tech", label: "Tech & games", icon: "code" },
  { id: "culture", label: "Arts & culture", icon: "film" },
];

const ideas = [
  { category: "coffee", title: "Coffee & a catch-up", description: "Your favourite café. A new conversation.", image: "coffee", tag: "The everyday kind", tone: "bg-brand-light text-brand" },
  { category: "outdoors", title: "Take the scenic route", description: "Fresh air is better with good company.", image: "hiking", tag: "A little adventure", tone: "bg-sage text-forest" },
  { category: "tech", title: "Build something great", description: "Big ideas start with a small team.", image: "creative", tag: "Make something", tone: "bg-lilac text-lilac-deep" },
  { category: "culture", title: "Make it a movie night", description: "For the film. And the chat afterwards.", image: "cinema", tag: "Out of the ordinary", tone: "bg-warn-bg text-warn-ink" },
];

const steps: { title: string; body: string; icon: IconName }[] = [
  { title: "Start with your uni email", body: "Verify an approved university email and confirm you're 18+. A shared starting point, not a public profile.", icon: "mail" },
  { title: "Find a plan that feels like you", body: "Pick an activity, then choose one buddy or a small group of 3–5. It's about what you want to do.", icon: "compass" },
  { title: "Say hello. See how it goes.", body: "Chat under a nickname first. Your limited profile is shared only when everyone agrees to go.", icon: "chat" },
];

export function LandingPage() {
  const { status } = useSession();
  const [category, setCategory] = useState("all");
  const visibleIdeas = ideas.filter((idea) => category === "all" || idea.category === category);

  if (status === "ready") return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div><p className="eyebrow mb-3 text-brand">Make a little room for something good</p><h1 className="text-3xl font-extrabold sm:text-4xl">Find your next good plan.</h1><p className="mt-3 text-ink-muted">Same activity. New company. See where it takes you.</p></div>
        <ButtonLink to="/activities/new"><Icon name="plus" size={18} />Create a plan</ButtonLink>
      </div>
      <EventsFeed />
    </div>
  );

  return (
    <div className="space-y-12 sm:space-y-16">
      <section aria-labelledby="welcome-title" className="grid items-center gap-9 pb-1 pt-2 md:grid-cols-[1.08fr_1fr] md:gap-5">
        <div className="animate-rise">
          <p className="eyebrow mb-5 flex items-center gap-2 text-ink-muted"><span className="h-1.5 w-1.5 rounded-full bg-brand" />Student life, with a little more company</p>
          <h1 id="welcome-title" className="hero-title font-extrabold">Good plans.<br /><span className="text-brand">Better company.</span></h1>
          <p className="mt-5 max-w-[26rem] text-[15px] leading-relaxed text-ink-muted sm:text-base">That gig. A coffee. The weekend adventure.<br className="hidden xl:block" /> Find students who want to do it too.<br className="hidden xl:block" /> Because you don't have to go it alone.</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href="#activity-inspiration" className={buttonClass("primary", "lg", "!h-12 !px-6 !text-sm")}>Find your kind of plan<Icon name="arrow-up-right" size={18} /></a>
            <a href="#how-it-works" className={buttonClass("ghost", "md", "!px-3")}>How it works<Icon name="arrow-right" size={16} /></a>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-medium text-ink-muted">
            <span className="flex items-center gap-1.5"><Icon name="shield" size={15} className="text-mint-deep" />University email required</span>
            <span className="flex items-center gap-1.5"><Icon name="lock" size={14} className="text-mint-deep" />Anonymous first</span>
          </div>
        </div>
        <div className="hero-collage" aria-label="A little inspiration for your next shared plan">
          <img className="hero-photo" src="/images/friends.jpg" alt="Friends spending time together outdoors" width="650" height="800" />
          <div className="hero-coffee" aria-hidden="true"><img src="/images/coffee.jpg" alt="" width="300" height="250" /><span className="mt-2 block text-center font-display text-xs font-semibold">good coffee, better company.</span></div>
          <div className="hero-stamp" aria-hidden="true">less solo.<br />more stories.<span className="mx-auto mt-1"><Icon name="sparkles" size={16} /></span></div>
          <div className="hero-note"><span className="grid h-9 w-9 place-items-center rounded-full bg-sage text-mint-deep"><Icon name="users" size={19} /></span><p className="text-xs font-semibold leading-relaxed">A plan in common.<br /><span className="font-normal text-ink-muted">A good place to start.</span></p></div>
          <Icon name="sparkles" size={28} className="absolute -right-1 top-0 text-brand" />
        </div>
      </section>

      <section id="activity-inspiration" aria-label="Activity inspiration" className="border-t border-line pt-9">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="eyebrow mb-2 text-brand">Big plans, small plans, your plans</p><h2 className="text-2xl font-bold sm:text-[28px]">What are you up for?</h2></div>
          <span className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[11px] text-ink-muted"><Icon name="sparkles" size={13} />A little inspiration</span>
        </div>
        <p className="mt-2 text-sm text-ink-muted">These are activity ideas, not live events. Join to discover what's really happening.</p>
        <div role="group" aria-label="Filter activity ideas" className="-mx-1 mb-6 mt-5 flex gap-2 overflow-x-auto px-1 py-1.5">
          {categories.map((item) => <button key={item.id} type="button" onClick={() => setCategory(item.id)} aria-pressed={category === item.id} className={cn("flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-semibold transition-colors", category === item.id ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-soft hover:border-ink-muted")}><Icon name={item.icon} size={15} />{item.label}</button>)}
        </div>
        <p className="sr-only" role="status">{visibleIdeas.length} activity {visibleIdeas.length === 1 ? "idea" : "ideas"}</p>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {visibleIdeas.map((idea) => <Link key={idea.category} to="/auth?mode=signup" className="activity-card group overflow-hidden rounded-2xl border border-line bg-surface transition-shadow hover:shadow-lift">
            <div className="relative aspect-[1.3] overflow-hidden"><img src={`/images/${idea.image}.jpg`} alt="" width="560" height="430" loading="lazy" className="activity-image h-full w-full object-cover" /><span className="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-ink">Activity idea</span></div>
            <div className="p-3 sm:p-4"><p className="font-display text-[15px] font-bold leading-snug sm:text-base">{idea.title}</p><p className="mt-2 hidden min-h-9 text-xs leading-relaxed text-ink-muted sm:block">{idea.description}</p><div className="mt-4 flex items-center justify-between gap-1.5"><span className={cn("rounded-full px-2 py-1 text-[10px] font-medium", idea.tone)}>{idea.tag}</span><Icon name="arrow-up-right" size={17} className="shrink-0 text-ink-muted transition group-hover:text-brand" /></div><span className="sr-only"> — Sign up to discover real activities</span></div>
          </Link>)}
        </div>
      </section>

      <section id="how-it-works" aria-labelledby="how-title" className="rounded-3xl bg-sage px-5 py-7 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow mb-2 text-mint-deep">Low pressure. Real possibilities.</p><h2 id="how-title" className="text-2xl font-bold sm:text-[28px]">Your plan. Your pace.</h2></div><p className="max-w-54 text-sm leading-relaxed text-ink-soft">A shared interest is a pretty good way to break the ice.</p></div>
        <div className="mt-8 grid gap-7 md:grid-cols-3 md:gap-6">
          {steps.map((step, index) => <div key={step.title}><div className="mb-4 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/80 text-forest"><Icon name={step.icon} size={20} /></span><span className="font-display text-xs font-bold text-mint-deep">0{index + 1}</span><span className="h-px flex-1 bg-forest/10" /></div><h3 className="text-base font-bold">{step.title}</h3><p className="mt-2 text-xs leading-[1.8] text-ink-soft">{step.body}</p></div>)}
        </div>
      </section>

      <section aria-labelledby="company-title">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow mb-2 text-brand">There's more than one way to go</p><h2 id="company-title" className="text-2xl font-bold sm:text-[28px]">One buddy or a little crew?</h2></div><ButtonLink to="/auth?mode=signup" variant="outline">Find your buddy<Icon name="arrow-up-right" size={16} /></ButtonLink></div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-brand-light text-brand"><Icon name="user" /></span><div><h3 className="text-lg font-bold">Just the two of you</h3><p className="text-xs text-ink-muted">One-on-one · 2 students</p></div></div><p className="mt-4 text-sm leading-relaxed text-ink-soft">A familiar face for your next new thing. Chat first, make a plan, and decide together.</p><p className="mt-4 border-t border-line pt-4 text-xs leading-relaxed text-warn-ink"><strong className="mb-1 block">Keep a little flexibility in your plans.</strong>{COPY.pairWarning}</p></div>
          <div className="rounded-2xl bg-forest p-6 text-white"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-mint"><Icon name="users" /></span><div><h3 className="text-lg font-bold">Meet your little crew</h3><p className="text-xs text-white/75">Small group · 3–5 students</p></div></div><p className="mt-4 text-sm leading-relaxed text-white/85">More perspectives, more conversation. Everyone gets a say, and every yes matters.</p><p className="mt-4 border-t border-white/20 pt-4 text-xs leading-relaxed text-white/80"><strong className="mb-1 block font-semibold text-white">More company, not more certainty.</strong>{COPY.groupNotice}</p></div>
        </div>
      </section>

      <section id="privacy" aria-labelledby="privacy-title" className="grid gap-6 border-y border-line py-8 md:grid-cols-[1fr_1.15fr] md:gap-10">
        <div className="flex items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-light text-brand"><Icon name="shield" size={22} /></span><div><h2 id="privacy-title" className="text-xl font-bold">Connection, without<br />the oversharing.</h2><p className="mt-3 text-xs leading-relaxed text-ink-muted">Not a dating app. No public profiles to swipe through. Just students with a plan in common.</p></div></div>
        <div className="space-y-3 text-xs leading-relaxed text-ink-muted"><p><strong className="font-semibold text-ink">Your choice, always.</strong> Match-specific nicknames first. Limited profiles only after everyone agrees. Report and block controls are part of the planned chat experience.</p><p>{COPY.verificationLimit}</p><p>{COPY.safetyTip}</p></div>
      </section>
    </div>
  );
}
