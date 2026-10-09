import {
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  isInterestTag,
  type IcebreakerQuestion,
  type InterestTag,
} from "./interests";

const MAX_Q_LEN = 140;
const MAX_OPT_LEN = 40;
const MAX_OPTIONS = 4;

// Words that would indicate psychological / health inference. Questions containing them are dropped.
const BANNED = /\b(anxi|depress|mental|therap|diagnos|disorder|lonel|trauma|medicat|adhd|autis|introvert|extrovert|personality|sexual|dating|religio|politic)/i;

export type AiIcebreakerResult = { questions: IcebreakerQuestion[]; suggestedTags: InterestTag[] };

function clean(s: unknown, max: number): string | null {
  if (typeof s !== "string") return null;
  const t = s.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
  if (!t || t.length > max || BANNED.test(t)) return null;
  return t;
}

/** Validates/clamps raw model output. Returns null if not enough usable questions. */
export function sanitizeAiResult(raw: unknown): AiIcebreakerResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { questions?: unknown; suggestedTags?: unknown };
  if (!Array.isArray(r.questions)) return null;
  const questions: IcebreakerQuestion[] = [];
  for (const [i, q] of r.questions.entries()) {
    if (questions.length >= MAX_QUESTIONS) break;
    const question = clean((q as { question?: unknown })?.question, MAX_Q_LEN);
    if (!question) continue;
    const rawOpts = (q as { options?: unknown })?.options;
    const options = Array.isArray(rawOpts)
      ? rawOpts.map((o) => clean(o, MAX_OPT_LEN)).filter((o): o is string => !!o).slice(0, MAX_OPTIONS)
      : [];
    questions.push({ id: `ai-${i}`, question, ...(options.length >= 2 ? { options } : {}) });
  }
  if (questions.length < MIN_QUESTIONS) return null;
  const suggestedTags = Array.isArray(r.suggestedTags)
    ? Array.from(new Set(r.suggestedTags.filter(isInterestTag))).slice(0, 3)
    : [];
  return { questions, suggestedTags };
}
