// Member 2 — optional AI icebreakers. Deploy: `supabase functions deploy onboarding-ai`
// Secret: `supabase secrets set LOVABLE_API_KEY=...` (unset => 503, app uses static questions).
// Receives ONLY interest slugs. Caller must be a verified student. Output re-validated in the browser.
import { createClient } from "npm:@supabase/supabase-js@2";

const TAGS = ["hackathons","coffee","cinema","live-music","gaming","hiking","running","football","board-games","cooking","photography","reading","theatre","societies","grocery-runs"];
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: ok } = await sb.rpc("is_verified_student");
  if (ok !== true) return json({ error: "forbidden" }, 403);

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return json({ error: "ai_not_configured" }, 503);

  const body = await req.json().catch(() => null) as { tags?: unknown } | null;
  const tags = Array.isArray(body?.tags) ? body!.tags.filter((t): t is string => typeof t === "string" && TAGS.includes(t)).slice(0, 15) : [];
  if (!tags.length) return json({ error: "no_tags" }, 400);

  const prompt = `A university student enjoys: ${tags.join(", ")}.
Write 3-5 short, friendly, low-pressure icebreaker questions (max 120 chars) to help match them with event buddies, each with 2-3 short answer options.
Never ask about health, mental health, emotions, personality, dating, religion or politics.
Also suggest up to 3 extra interests ONLY from this list: ${TAGS.join(", ")}.
Reply with JSON only: {"questions":[{"question":"...","options":["..."]}],"suggestedTags":["..."]}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({ model: "openai/gpt-6-astra", stream: true, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok || !res.body) {
    console.error("AI gateway", res.status, await res.text().catch(() => ""));
    return json({ error: "ai_failed", status: res.status }, res.status === 429 || res.status === 402 ? res.status : 502);
  }

  // Consume the SSE stream server-side and return the final text.
  let text = "", buf = "";
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const l of lines) {
      const d = l.replace(/^data:\s*/, "").trim();
      if (!d || d === "[DONE]" || !l.startsWith("data:")) continue;
      try { text += JSON.parse(d).choices?.[0]?.delta?.content ?? ""; } catch { /* ignore keep-alives */ }
    }
  }
  const m = text.match(/\{[\s\S]*\}/);
  try { return json(m ? JSON.parse(m[0]) : null); } catch { return json({ error: "bad_output" }, 502); }
});
