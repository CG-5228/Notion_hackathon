/**
 * Basic HTML sanitization for message bodies and text inputs.
 */
export function sanitizeText(input: string): string {
  if (!input) return '';
  return input
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function validateMessageLength(body: string, max = 2000): {
  valid: boolean;
  length: number;
  error?: string;
} {
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    return { valid: false, length: 0, error: 'Message cannot be empty.' };
  }
  if (trimmed.length > max) {
    return {
      valid: false,
      length: trimmed.length,
      error: `Message exceeds maximum allowed length of ${max} characters.`,
    };
  }
  return { valid: true, length: trimmed.length };
}
