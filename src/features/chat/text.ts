export const MAX_MESSAGE_LENGTH = 1000;

/** Server stores chat bodies HTML-escaped. Decode for display; React then escapes again,
 *  so the text is always rendered as text. Never use dangerouslySetInnerHTML for chat. */
export function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

export function validateMessage(body: string): string | null {
  const t = body.trim();
  if (!t) return "Write something first.";
  if (t.length > MAX_MESSAGE_LENGTH) return `Messages can be up to ${MAX_MESSAGE_LENGTH} characters.`;
  return null;
}

/** Friendly copy for server error codes. */
export function explainError(e: unknown): string {
  const err = e as { code?: string; message?: string } | null;
  switch (err?.code) {
    case "40001": return "The group changed while you were deciding. Check who's in it now, then agree again.";
    case "42501": return "You don't have access to this — you may have left or been removed from the match.";
    case "54000": return err.message?.includes("report") ? "You've reached today's report limit." : "Slow down a little — too many messages at once.";
    case "55000": return err.message ?? "That isn't available right now.";
    case "22023": return err.message ?? "Please check what you entered.";
    default: return err?.message ?? "Something went wrong. Please try again.";
  }
}
