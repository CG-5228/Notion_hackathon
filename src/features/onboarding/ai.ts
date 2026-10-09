import { supabase } from "@/lib/supabase";
import { sanitizeAiResult, type AiIcebreakerResult } from "./validate";
import type { InterestTag } from "./interests";

/**
 * Calls the optional `onboarding-ai` Edge Function. Only chosen interest slugs are sent.
 * Returns null on ANY failure (not deployed, no AI key, bad output) so the caller uses the static fallback.
 */
export async function fetchAiIcebreakers(tags: readonly InterestTag[]): Promise<AiIcebreakerResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke("onboarding-ai", { body: { tags } });
    if (error) return null;
    return sanitizeAiResult(data); // re-validate in the browser too
  } catch {
    return null;
  }
}
