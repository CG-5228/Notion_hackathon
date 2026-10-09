import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Notice } from "@/components";
import { createActivity } from "./api";
import { CATEGORIES } from "./types";
import { validateActivity, type ActivityInput } from "./validation";
import { FieldError, inputClass } from "./components/Labels";

type Props = {
  /** Defaults to navigating to the new activity (with its invite link when invite-only). */
  onCreated?: (id: string, inviteHash: string | null) => void;
};

const empty: ActivityInput = {
  title: "", description: "", category: "coffee", startsAt: "", endsAt: "", venuePublic: "", visibility: "campus",
};

export function CreateActivity({ onCreated }: Props = {}) {
  const navigate = useNavigate();
  const [f, setF] = useState<ActivityInput>(empty);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof ActivityInput>(k: K, v: ActivityInput[K]) => setF({ ...f, [k]: v });

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const v = validateActivity(f);
    setErrs(v); setServerErr(null);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      const r = await createActivity(f);
      if (onCreated) onCreated(r.id, r.inviteHash);
      else navigate(`/events/${r.id}${r.inviteHash ? `?invite=${r.inviteHash}` : ""}`);
    } catch (x) { setServerErr(x instanceof Error ? x.message : "Could not create the activity."); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">Create an activity</h1>
        <p className="mt-2 text-ink-muted">Student-created activities are visible to your campus or by private link only.</p>
      </div>
      <label className="block text-sm font-semibold">Title
        <input value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={120} className={inputClass} />
        <FieldError message={errs.title} />
      </label>
      <label className="block text-sm font-semibold">Category
        <select value={f.category} onChange={(e) => set("category", e.target.value as ActivityInput["category"])} className={`${inputClass} capitalize`}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Starts
          <input type="datetime-local" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} className={inputClass} />
          <FieldError message={errs.startsAt} />
        </label>
        <label className="block text-sm font-semibold">Ends (optional)
          <input type="datetime-local" value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} className={inputClass} />
          <FieldError message={errs.endsAt} />
        </label>
      </div>
      <label className="block text-sm font-semibold">Public meeting point
        <input value={f.venuePublic} onChange={(e) => set("venuePublic", e.target.value)} placeholder="e.g. Library café, main entrance" className={inputClass} />
        <span className="mt-1 block text-xs font-normal text-ink-muted">Use a public or general place. Never a home address.</span>
        <FieldError message={errs.venuePublic} />
      </label>
      <label className="block text-sm font-semibold">Description
        <textarea value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={2000} rows={4} className={inputClass} />
        <FieldError message={errs.description} />
      </label>
      <fieldset className="rounded-xl bg-sand p-4 text-sm">
        <legend className="px-1 font-semibold">Who can see it?</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex items-center gap-2"><input type="radio" className="accent-ink" checked={f.visibility === "campus"} onChange={() => set("visibility", "campus")} /> Students at my university</label>
          <label className="flex items-center gap-2"><input type="radio" className="accent-ink" checked={f.visibility === "invite_only"} onChange={() => set("visibility", "invite_only")} /> Invite-only (private link)</label>
        </div>
        <FieldError message={errs.visibility} />
      </fieldset>
      {serverErr && <Notice tone="error">{serverErr}</Notice>}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create activity"}</Button>
    </form>
  );
}
