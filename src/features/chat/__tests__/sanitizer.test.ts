import assert from 'node:assert';
import { sanitizeText, validateMessageLength } from '../utils/sanitizer';

export function runSanitizerTests() {
  console.log('--- Running Chat Sanitizer & Validation Tests ---');

  // XSS/HTML escaping
  assert.strictEqual(
    sanitizeText('<script>alert("XSS")</script>'),
    '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
  );
  console.log('✓ Escapes HTML tags and quotes to reduce XSS risk.');

  // Empty message validation
  assert.strictEqual(validateMessageLength('    ').valid, false);
  console.log('✓ Rejects empty messages.');

  // Valid message within length limit
  assert.strictEqual(validateMessageLength('Hello, buddy!').valid, true);
  console.log('✓ Accepts valid messages within the limit.');

  // Overlength validation
  const long = 'x'.repeat(2001);
  assert.strictEqual(validateMessageLength(long).valid, false);
  console.log('✓ Rejects messages above 2000-character limit.');
}
