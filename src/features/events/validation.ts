import { CATEGORIES, type Category } from "./types";

export type ActivityInput = {
  title: string;
  description: string;
  category: Category;
  startsAt: string;
  endsAt: string;
  venuePublic: string;
  visibility: "campus" | "invite_only";
};

// Heuristic only — the server re-checks. Blocks obvious private addresses.
const PRIVATE_HINT = /(apartment|\bapt\.?\b|flat\s*\d|house\s*no|my (place|house|room)|eircode|\b[A-Z]\d{2}\s?[A-Z0-9]{4}\b)/i;

export function validateActivity(a: ActivityInput, now = new Date()): Record<string, string> {
  const e: Record<string, string> = {};
  const t = a.title.trim();
  if (t.length < 3 || t.length > 120) e.title = "Title must be 3–120 characters.";
  if (a.description.length > 2000) e.description = "Keep the description under 2000 characters.";
  if (!CATEGORIES.includes(a.category)) e.category = "Choose a category.";
  const s = new Date(a.startsAt);
  if (!a.startsAt || isNaN(+s)) e.startsAt = "Pick a start date and time.";
  else if (s < now) e.startsAt = "Start time must be in the future.";
  if (a.endsAt) {
    const en = new Date(a.endsAt);
    if (isNaN(+en)) e.endsAt = "Invalid end time.";
    else if (!isNaN(+s) && en <= s) e.endsAt = "End time must be after the start.";
  }
  const v = a.venuePublic.trim();
  if (v.length < 3 || v.length > 200) e.venuePublic = "Add a public or general meeting point.";
  else if (PRIVATE_HINT.test(v)) e.venuePublic = "Use a public place (café, library, station) — not a private address.";
  if (a.visibility !== "campus" && a.visibility !== "invite_only") e.visibility = "Choose who can see it.";
  return e;
}
