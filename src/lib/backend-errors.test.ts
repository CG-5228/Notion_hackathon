import { describe, expect, it } from "vitest";
import { BACKEND_SETUP_ERROR, backendErrorMessage } from "./backend-errors";

describe("backendErrorMessage", () => {
  it.each(["PGRST202", "42883", "PGRST205", "42P01"])("explains missing database setup (%s)", (code) => {
    expect(backendErrorMessage({ code, message: "Missing database object" }, "Try again")).toBe(BACKEND_SETUP_ERROR);
  });

  it("preserves useful messages from Supabase error objects", () => {
    expect(backendErrorMessage({ message: "Use a public meeting point" }, "Try again")).toBe("Use a public meeting point");
    expect(backendErrorMessage(new Error("Connection lost"), "Try again")).toBe("Connection lost");
  });

  it.each([null, undefined, "failure", {}])("uses a fallback for unstructured errors", (error) => {
    expect(backendErrorMessage(error, "Try again")).toBe("Try again");
  });
});
