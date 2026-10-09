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

/** Replaces the signed-in caller's interests in one database transaction. */
export async function saveMyInterests(userId: string, interests: readonly SavedInterest[]): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user || user.id !== userId) throw new Error("Your signed-in account changed. Please reload and try again.");

  const { error } = await supabase.rpc("set_my_interests", {
    p_interests: interests.map(({ tag, shareable }) => ({ slug: tag, share_on_reveal: shareable })),
  });
  if (error) throw error;
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
