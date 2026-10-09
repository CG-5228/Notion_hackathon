import { describe, expect, it } from "vitest";
import { getFallbackQuestions, getIcebreakerSuggestions, INTEREST_TAGS } from "./interests";
import { sanitizeAiResult } from "./validate";
import { createLocalAnswerStore, shareableTags } from "./store";

function memStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe("fallback questions (no AI key)", () => {
  it("returns 3 questions when no tags chosen", () => expect(getFallbackQuestions([])).toHaveLength(3));
  it("never exceeds 5 questions", () => expect(getFallbackQuestions(INTEREST_TAGS)).toHaveLength(5));
  it("hackathons asks build vs talks", () =>
    expect(getFallbackQuestions(["hackathons"])[0]?.question).toBe("Are you more into building projects or attending tech talks?"));
  it("catalogue matches the 15 interests seeded in 0001", () => expect(INTEREST_TAGS).toHaveLength(15));
});

describe("AI output validation", () => {
  it("drops mental-health questions and rejects if fewer than 3 remain", () => {
    expect(sanitizeAiResult({
      questions: [{ question: "Do you have social anxiety?" }, { question: "City walk or museum?" }, { question: "Coffee or tea?" }],
      suggestedTags: [],
    })).toBeNull();
  });
  it("caps at 5 questions and filters unknown tags", () => {
    const qs = Array.from({ length: 8 }, (_, i) => ({ question: `Question ${i}?` }));
    const r = sanitizeAiResult({ questions: qs, suggestedTags: ["cinema", "hacking-bank"] });
    expect(r?.questions).toHaveLength(5);
    expect(r?.suggestedTags).toEqual(["cinema"]);
  });
});

describe("privacy", () => {
  it("answers belong to the signed-in account only", () => {
    const s = createLocalAnswerStore(memStorage());
    s.save("alice", [{ questionId: "q", question: "Q?", answer: "A" }]);
    expect(s.load("bob")).toEqual([]);
    expect(s.load("alice")).toHaveLength(1);
  });
  it("hidden interests are never shareable", () => {
    expect(shareableTags([{ tag: "cinema", shareable: true }, { tag: "gaming", shareable: false }])).toEqual(["cinema"]);
  });
});

describe("chat suggestions", () => {
  it("only uses known shareable tags", () => {
    const s = getIcebreakerSuggestions({ eventTitle: "Hackathon", mutuallyShareableTags: ["hackathons", "secret"] }).join(" ");
    expect(s).toContain("hackathons");
    expect(s).not.toContain("secret");
  });
});
