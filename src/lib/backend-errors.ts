export const BACKEND_SETUP_ERROR = "The backend setup is incomplete. Please ask the team to apply the latest database migrations, then try again.";

export function backendErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== "object" || error === null) return fallback;
  if ("code" in error && ["PGRST202", "42883", "PGRST205", "42P01"].includes(String(error.code))) {
    return BACKEND_SETUP_ERROR;
  }
  return "message" in error && typeof error.message === "string" && error.message.trim()
    ? error.message
    : fallback;
}
