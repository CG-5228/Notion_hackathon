import { describe, expect, it } from "vitest";
import { decodeEntities, explainError, validateMessage } from "../text";

describe("chat text helpers", () => {
  it("decodes the server's escaping exactly once", () => {
    expect(decodeEntities("&lt;script&gt;x&lt;/script&gt; &amp;amp; &quot;&#39;")).toBe("<script>x</script> &amp; \"'");
  });
  it("bounds message length", () => {
    expect(validateMessage("   ")).not.toBeNull();
    expect(validateMessage("x".repeat(1001))).not.toBeNull();
    expect(validateMessage("hi")).toBeNull();
  });
  it("explains a stale membership version", () => {
    expect(explainError({ code: "40001" })).toMatch(/group changed/i);
  });
});
