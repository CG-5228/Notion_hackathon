import { supabase } from "./supabase";
import type { DomainCheck, MyProfile } from "@/types";

/** Typed wrappers for Member 1 (0001) RPCs. Feature RPCs live in their owners' modules. */
export async function checkEmailDomain(email: string): Promise<DomainCheck> {
  const { data, error } = await supabase.rpc("check_email_domain", { p_email: email });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as
    | { allowed: boolean; university_name: string | null; is_demo: boolean }
    | undefined;
  return { allowed: !!row?.allowed, universityName: row?.university_name ?? null, isDemo: !!row?.is_demo };
}

export async function getMyProfile(): Promise<MyProfile | null> {
  const { data, error } = await supabase.rpc("get_my_profile");
  if (error) throw error;
  const r = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
  if (!r) return null;
  return {
    userId: r.user_id as string,
    displayName: (r.display_name as string) ?? null,
    avatarUrl: (r.avatar_url as string) ?? null,
    ageConfirmed: !!r.age_confirmed,
    studentVerified: !!r.student_verified,
    universityId: (r.university_id as string) ?? null,
    universityName: (r.university_name as string) ?? null,
    isDemo: !!r.is_demo,
  };
}

export async function updateMyProfile(input: { displayName: string; ageConfirmed: boolean; avatarUrl?: string | null }) {
  const { error } = await supabase.rpc("update_my_profile", {
    p_display_name: input.displayName,
    p_age_confirmed: input.ageConfirmed,
    p_avatar_url: input.avatarUrl ?? null,
  });
  if (error) throw error;
}
