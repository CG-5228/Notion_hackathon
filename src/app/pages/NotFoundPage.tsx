import { ButtonLink, Icon } from "@/components";
export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center sm:py-24">
      <span className="mx-auto mb-6 grid h-18 w-18 place-items-center rounded-3xl bg-brand-light text-brand"><Icon name="compass" size={34} /></span>
      <p className="eyebrow text-brand">404</p>
      <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">A little off the beaten path.</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">This page doesn't exist, but your next good plan might. Let's get you back to familiar ground.</p>
      <ButtonLink to="/" className="mt-7">Back to Discover<Icon name="arrow-right" size={17} /></ButtonLink>
    </div>
  );
}
