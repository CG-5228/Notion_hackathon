import { useState } from "react";
import { createActivity } from "./api";
import { CATEGORIES } from "./types";
import { validateActivity, type ActivityInput } from "./validation";

type Props = { onCreated: (id: string, inviteHash: string | null) => void };

const empty: ActivityInput = {
  title: "", description: "", category: "coffee", startsAt: "", endsAt: "", venuePublic: "", visibility: "campus",
};

export function CreateActivity({ onCreated }: Props) {
  const [f, setF] = useState<ActivityInput>(empty);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof ActivityInput>(k: K, v: ActivityInput[K]) => setF({ ...f, [k]: v });

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const v = validateActivity(f);
    setErrs(v); setServerErr(null);
    if (Object.keys(v).length) return;
    setBusy(true);
    try { const r = await createActivity(f); onCreated(r.id, r.inviteHash); }
    catch (x: any) { setServerErr(x.message ?? "Could not create the activity."); }
    finally { setBusy(false); }
  };

  const field = (k: string) => errs[k] && <p className="text-sm text-red-700">{errs[k]}</p>;

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-xl space-y-4 p-4">
      <h1 className="text-2xl font-bold text-slate-900">Create an activity</h1>
      <label className="block">Title
        <input value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={120} className="mt-1 w-full rounded-lg border px-3 py-2" />
        {field("title")}
      </label>
      <label className="block">Category
        <select value={f.category} onChange={(e) => set("category", e.target.value as ActivityInput["category"])} className="mt-1 w-full rounded-lg border px-3 py-2">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">Starts
          <input type="datetime-local" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
          {field("startsAt")}
        </label>
        <label className="block">Ends (optional)
          <input type="datetime-local" value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
          {field("endsAt")}
        </label>
      </div>
      <label className="block">Public meeting point
        <input value={f.venuePublic} onChange={(e) => set("venuePublic", e.target.value)} placeholder="e.g. Library café, main entrance" className="mt-1 w-full rounded-lg border px-3 py-2" />
        <span className="text-xs text-slate-500">Use a public or general place. Never a home address.</span>
        {field("venuePublic")}
      </label>
      <label className="block">Description
        <textarea value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={2000} rows={4} className="mt-1 w-full rounded-lg border px-3 py-2" />
        {field("description")}
      </label>
      <fieldset>
        <legend className="mb-1">Who can see it?</legend>
        <label className="mr-4"><input type="radio" checked={f.visibility === "campus"} onChange={() => set("visibility", "campus")} /> Students at my university</label>
        <label><input type="radio" checked={f.visibility === "invite_only"} onChange={() => set("visibility", "invite_only")} /> Invite-only (private link)</label>
      </fieldset>
      {serverErr && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{serverErr}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-slate-900 py-3 font-semibold text-white disabled:opacity-50">
        {busy ? "Creating…" : "Create activity"}
      </button>
    </form>
  );
}
