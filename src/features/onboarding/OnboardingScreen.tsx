import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Notice, Spinner } from "@/components";
import { useSession } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { getFallbackQuestions, INTERESTS, interestLabel, type IcebreakerQuestion, type InterestTag } from "./interests";
import { fetchAiIcebreakers } from "./ai";
import { createLocalAnswerStore, loadMyInterests, saveMyInterests, type SavedAnswer } from "./store";

type Step = "interests" | "questions" | "privacy" | "done";

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick}
      className={cn("rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        selected ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink hover:border-ink/40")}>
      {children}
    </button>
  );
}

export function OnboardingScreen() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const navigate = useNavigate();
  const answerStore = useMemo(() => createLocalAnswerStore(window.localStorage), []);

  const [step, setStep] = useState<Step>("interests");
  const [selected, setSelected] = useState<InterestTag[]>([]);
  const [shareable, setShareable] = useState<Set<InterestTag>>(new Set());
  const [questions, setQuestions] = useState<IcebreakerQuestion[]>([]);
  const [suggested, setSuggested] = useState<InterestTag[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [usedAi, setUsedAi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    loadMyInterests(userId)
      .then((rows) => {
        setSelected(rows.map((r) => r.tag));
        setShareable(new Set(rows.filter((r) => r.shareable).map((r) => r.tag)));
      })
      .catch(() => undefined);
  }, [userId]);

  const toggle = (t: InterestTag) => setSelected((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  async function toQuestions() {
    setLoading(true);
    const ai = selected.length ? await fetchAiIcebreakers(selected) : null;
    setQuestions(ai?.questions ?? getFallbackQuestions(selected));
    setSuggested((ai?.suggestedTags ?? []).filter((t) => !selected.includes(t)));
    setUsedAi(!!ai);
    setLoading(false);
    setStep("questions");
  }

  async function finish() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      await saveMyInterests(userId, selected.map((tag) => ({ tag, shareable: shareable.has(tag) })));
      const saved: SavedAnswer[] = questions
        .filter((q) => answers[q.id]?.trim())
        .map((q) => ({ questionId: q.id, question: q.question, answer: answers[q.id]!.trim() }));
      answerStore.save(userId, saved);
      setStep("done");
    } catch {
      setError("We couldn't save your interests. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const stepNo = { interests: 1, questions: 2, privacy: 3, done: 3 }[step];

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
      {step !== "done" && <p className="text-sm font-medium text-ink-muted">Step {stepNo} of 3</p>}

      {step === "interests" && (
        <section aria-labelledby="ob-interests" className="animate-rise">
          <h1 id="ob-interests" className="mt-2 text-3xl font-bold">What are you into?</h1>
          <p className="mt-2 text-ink-muted">Pick any that fit — or none. You choose later what buddies can see.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {INTERESTS.map((i) => <Chip key={i.tag} selected={selected.includes(i.tag)} onClick={() => toggle(i.tag)}>{i.label}</Chip>)}
          </div>
          <Button className="mt-8 w-full" size="lg" onClick={toQuestions} disabled={loading}>
            {loading ? <><Spinner /> Getting questions…</> : "Next"}
          </Button>
        </section>
      )}

      {step === "questions" && (
        <section aria-labelledby="ob-q">
          <h1 id="ob-q" className="mt-2 text-3xl font-bold">A few easy icebreakers</h1>
          <p className="mt-2 text-ink-muted">All optional. Your answers stay on this device.</p>
          {!usedAi && <p className="mt-1 text-xs text-ink-muted">Using our standard questions.</p>}
          <div className="mt-6 space-y-4">
            {questions.map((q) => (
              <Card key={q.id} className="p-5">
                <p className="font-medium">{q.question}</p>
                {q.options ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {q.options.map((o) => (
                      <Chip key={o} selected={answers[q.id] === o}
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: a[q.id] === o ? "" : o }))}>{o}</Chip>
                    ))}
                  </div>
                ) : (
                  <input aria-label={q.question} maxLength={140} value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    className="mt-3 h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm" />
                )}
              </Card>
            ))}
          </div>
          {suggested.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium">You might also like — tap to add:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {suggested.map((t) => (
                  <Chip key={t} selected={false} onClick={() => { toggle(t); setSuggested((s) => s.filter((x) => x !== t)); }}>+ {interestLabel(t)}</Chip>
                ))}
              </div>
            </div>
          )}
          <div className="mt-8 flex gap-3">
            <Button variant="outline" onClick={() => setStep("interests")}>Back</Button>
            <Button className="flex-1" onClick={() => setStep("privacy")}>Next</Button>
          </div>
        </section>
      )}

      {step === "privacy" && (
        <section aria-labelledby="ob-p">
          <h1 id="ob-p" className="mt-2 text-3xl font-bold">What can buddies see?</h1>
          <p className="mt-2 text-ink-muted">Nothing is shown until everyone agrees to go. Then, only interests you switch on here are shared.</p>
          {selected.length === 0 ? (
            <Notice className="mt-6">You didn't pick any interests — that's fine.</Notice>
          ) : (
            <ul className="mt-6 divide-y divide-line rounded-card border border-line bg-paper">
              {selected.map((t) => (
                <li key={t} className="flex items-center justify-between px-5 py-3">
                  <span>{interestLabel(t)}</span>
                  <label className="flex items-center gap-2 text-sm text-ink-muted">
                    <input type="checkbox" checked={shareable.has(t)}
                      onChange={(e) => setShareable((s) => { const n = new Set(s); e.target.checked ? n.add(t) : n.delete(t); return n; })} />
                    Share after reveal
                  </label>
                </li>
              ))}
            </ul>
          )}
          {error && <Notice tone="error" className="mt-4">{error}</Notice>}
          <div className="mt-8 flex gap-3">
            <Button variant="outline" onClick={() => setStep("questions")}>Back</Button>
            <Button className="flex-1" onClick={finish} disabled={saving || !userId}>{saving ? "Saving…" : "Finish"}</Button>
          </div>
        </section>
      )}

      {step === "done" && (
        <section aria-labelledby="ob-d" className="text-center animate-rise">
          <h1 id="ob-d" className="text-3xl font-bold">You're all set</h1>
          <p className="mt-2 text-ink-muted">You can change your interests any time.</p>
          <Button variant="mint" size="lg" className="mt-8" onClick={() => navigate("/")}>Find events</Button>
        </section>
      )}
    </div>
  );
}
