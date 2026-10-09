import { ButtonLink } from "@/components";
export function NotFoundPage() {
  return (
    <div className="py-24 text-center">
      <p className="font-display text-8xl font-extrabold text-lilac">404</p>
      <h1 className="mt-2 text-2xl font-bold">Nobody's here — not even a buddy.</h1>
      <ButtonLink to="/" className="mt-6">Back home</ButtonLink>
    </div>
  );
}
