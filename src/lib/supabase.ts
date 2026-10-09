import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * THE ONE shared Supabase client. Members 2–5 import { supabase } from "@/lib/supabase".
 * Do not create additional clients. Only the public anon key is used in the browser;
 * every privileged operation goes through RLS or SECURITY DEFINER RPCs.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient = createClient(
  url ?? "http://localhost:54321",
  anonKey ?? "missing-anon-key",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);
