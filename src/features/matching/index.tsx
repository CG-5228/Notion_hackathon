// Member 4 — 1-on-1 + group buddy matching. Public surface for Member 1 (routes) and Member 5 (chat).
export { BuddyRequestPanel } from "./components/BuddyRequestPanel";
export { matchingApi, subscribeToMatch, friendlyError } from "./api";
export type { BuddyRequestResult, BuddyStatus } from "./api";
export { useBuddyStatus } from "./useBuddyStatus";
