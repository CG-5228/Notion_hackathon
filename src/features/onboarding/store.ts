import { supabase } from "@/lib/supabase";
import { isInterestTag, type InterestTag } from "./interests";

/**
 * Interests persist to 0001 `profile_interests` (owner CRUD under RLS; only share_on_reveal rows
 * are ever revealed). Icebreaker answers are private to this device and never sent to other users.
 */
export type SavedInterest = { tag: InterestTag; shareable: boolean };
export type SavedAnswer = { questionId: string; question: string; answer: string };

/** Only shareable tags may ever be used as match-visible / chat context. */
export function shareableTags(interests: readonly SavedInterest[] | null | undefined): InterestTag[] {
  return (interests ?? []).filter((i) => i.shareable === true).map((i) => i.tag);
}

export async function loadMyInterests(userId: string): Promise<SavedInterest[]> {
  const { data, error } = await supabase
    .from("profile_interests")
    .select("share_on_reveal, interests(slug)")
    .eq("user_id", userId);
  if (error) throw error;
  const out: SavedInterest[] = [];
  for (const row of (data ?? []) as unknown as { share_on_reveal: boolean; interests: { slug: string } | null }[]) {
    const slug = row.interests?.slug;
    if (isInterestTag(slug)) out.push({ tag: slug, shareable: row.share_on_reveal === true });
  }
  return out;
}

/** Replaces the caller's interests. RLS restricts every row to user_id = auth.uid(). */
export async function saveMyInterests(userId: string, interests: readonly SavedInterest[]): Promise<void> {
  const slugs = interests.map((i) => i.tag);
  const { data: rows, error: e1 } = await supabase.from("interests").select("id, slug").in("slug", slugs.length ? slugs : ["-"]);
  if (e1) throw e1;
  const idBySlug = new Map((rows ?? []).map((r: { id: string; slug: string }) => [r.slug, r.id]));
  const { error: e2 } = await supabase.from("profile_interests").delete().eq("user_id", userId);
  if (e2) throw e2;
  const insert = interests
    .filter((i) => idBySlug.has(i.tag))
    .map((i) => ({ user_id: userId, interest_id: idBySlug.get(i.tag)!, share_on_reveal: i.shareable }));
  if (insert.length) {
    const { error: e3 } = await supabase.from("profile_interests").insert(insert);
    if (e3) throw e3;
  }
}

const answersKey = (userId: string) => `fyb.onboarding.answers.${userId}`;

export function createLocalAnswerStore(storage: Pick<Storage, "getItem" | "setItem">) {
  return {
    load(userId: string): SavedAnswer[] {
      try {
        const d = JSON.parse(storage.getItem(answersKey(userId)) ?? "null") as { userId: string; answers: SavedAnswer[] } | null;
        return d && d.userId === userId ? d.answers : []; // never return another account's data
      } catch {
        return [];
      }
    },
    save(userId: string, answers: SavedAnswer[]) {
      storage.setItem(answersKey(userId), JSON.stringify({ userId, answers }));
    },
  };
}
