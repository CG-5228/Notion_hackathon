// Interest catalogue (mirrors the 15 slugs seeded in 0001 `public.interests`) + curated fallback questions.
// Browser-safe: no secrets, no network.

export const INTERESTS = [
  { tag: "hackathons", label: "Hackathons" },
  { tag: "coffee", label: "Coffee" },
  { tag: "cinema", label: "Cinema" },
  { tag: "live-music", label: "Live music" },
  { tag: "gaming", label: "Gaming" },
  { tag: "hiking", label: "Hiking" },
  { tag: "running", label: "Running" },
  { tag: "football", label: "Football" },
  { tag: "board-games", label: "Board games" },
  { tag: "cooking", label: "Cooking" },
  { tag: "photography", label: "Photography" },
  { tag: "reading", label: "Reading" },
  { tag: "theatre", label: "Theatre" },
  { tag: "societies", label: "Societies" },
  { tag: "grocery-runs", label: "Grocery runs" },
] as const;

export type InterestTag = (typeof INTERESTS)[number]["tag"];
export const INTEREST_TAGS = INTERESTS.map((i) => i.tag) as readonly InterestTag[];

export function isInterestTag(v: unknown): v is InterestTag {
  return typeof v === "string" && (INTEREST_TAGS as readonly string[]).includes(v);
}

export function interestLabel(tag: InterestTag): string {
  return INTERESTS.find((i) => i.tag === tag)?.label ?? tag;
}

export type IcebreakerQuestion = { id: string; question: string; options?: string[] };

export const MIN_QUESTIONS = 3;
export const MAX_QUESTIONS = 5;

const CURATED: Record<InterestTag, IcebreakerQuestion> = {
  hackathons: { id: "hackathons", question: "Are you more into building projects or attending tech talks?", options: ["Building projects", "Tech talks", "Both!"] },
  coffee: { id: "coffee", question: "Quick coffee between lectures or a long café chat?", options: ["Quick coffee", "Long chat"] },
  cinema: { id: "cinema", question: "Cinema night: blockbuster or indie film?", options: ["Blockbuster", "Indie", "Whatever's on"] },
  "live-music": { id: "live-music", question: "Small local gigs or big concerts?", options: ["Small gigs", "Big concerts", "Both"] },
  gaming: { id: "gaming", question: "Co-op with friends or a solo story game?", options: ["Co-op", "Solo story", "Competitive"] },
  hiking: { id: "hiking", question: "Easy coastal walk or a proper mountain day?", options: ["Easy walk", "Mountain day"] },
  running: { id: "running", question: "Chatty jog or a parkrun personal best?", options: ["Chatty jog", "Chasing a PB"] },
  football: { id: "football", question: "Would you rather play a match or watch one?", options: ["Play", "Watch", "Both"] },
  "board-games": { id: "board-games", question: "Quick party games or a long strategy game?", options: ["Party games", "Long strategy"] },
  cooking: { id: "cooking", question: "Cook something new or perfect an old favourite?", options: ["Something new", "Old favourite"] },
  photography: { id: "photography", question: "Phone snaps or a proper camera?", options: ["Phone", "Camera"] },
  reading: { id: "reading", question: "Book club chat or a quiet reading café?", options: ["Book club", "Quiet café"] },
  theatre: { id: "theatre", question: "Big musical or a small student play?", options: ["Big musical", "Student play"] },
  societies: { id: "societies", question: "Already in a society, or looking for one to try?", options: ["Already in one", "Looking to try one"] },
  "grocery-runs": { id: "grocery-runs", question: "Big weekly shop or quick top-up trips?", options: ["Big weekly shop", "Quick top-ups"] },
};

const GENERIC: IcebreakerQuestion[] = [
  { id: "g-weekend", question: "What's your ideal low-key weekend plan?", options: ["Out and about", "Chilled at home", "A bit of both"] },
  { id: "g-meet", question: "Do you prefer meeting one person or a small group?", options: ["One person", "Small group", "No preference"] },
  { id: "g-new", question: "Is there something on campus you've wanted to try but haven't yet?" },
];

/** Deterministic: same tags in -> same questions out. Always returns 3–5. */
export function getFallbackQuestions(tags: readonly InterestTag[]): IcebreakerQuestion[] {
  const out = INTEREST_TAGS.filter((t) => tags.includes(t)).map((t) => CURATED[t]).slice(0, MAX_QUESTIONS);
  for (const g of GENERIC) {
    if (out.length >= MIN_QUESTIONS) break;
    out.push(g);
  }
  return out;
}

/** P1: text-only suggestions for chat (Member 5). Never sends anything. */
export function getIcebreakerSuggestions(input: { eventTitle: string; mutuallyShareableTags: readonly string[] }): string[] {
  const title = input.eventTitle.trim().slice(0, 80) || "this event";
  const tags = input.mutuallyShareableTags.filter(isInterestTag).slice(0, 3);
  const s = [`Hey! Looking forward to ${title} — have you been to something like it before?`];
  for (const t of tags) {
    const q = CURATED[t].question;
    s.push(`I saw we both like ${interestLabel(t).toLowerCase()} — ${q.charAt(0).toLowerCase()}${q.slice(1)}`);
  }
  s.push("Want to meet at the entrance a few minutes before it starts?");
  return s.slice(0, 4);
}
