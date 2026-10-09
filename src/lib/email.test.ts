import { emailDomain, isObviouslyPersonal } from "./email";

describe("email helpers (UX only)", () => {
  it("extracts exact lowercase domain", () => {
    expect(emailDomain("  Alice@TCD.ie ")).toBe("tcd.ie");
    expect(emailDomain("bad")).toBeNull();
    expect(emailDomain("a@b")).toBeNull();
  });
  it("flags personal providers", () => {
    expect(isObviouslyPersonal("x@gmail.com")).toBe(true);
    expect(isObviouslyPersonal("x@tcd.ie")).toBe(false);
  });
});
