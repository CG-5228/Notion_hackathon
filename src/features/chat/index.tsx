// Member 5 — anonymous chat, consent, safety, attendance and reliability.
// Reserved screen exports (names/props fixed by docs/CONTRACTS.md):
export { BuddyChat } from "./components/BuddyChat";
export { PlanView } from "./components/PlanView";
export { AttendanceCheckIn } from "./components/AttendanceCheckIn";

// Reusable pieces for other members (e.g. M3 event page "Report event"):
export { ConsentPanel } from "./components/ConsentPanel";
export { SafetyDialog } from "./components/SafetyDialog";
export { ReliabilityBadge } from "./components/ReliabilityBadge";
export { ReliabilityPanel } from "./components/ReliabilityPanel";
export { RevealedProfiles } from "./components/RevealedProfiles";
export { chatApi } from "./api";
export { reliabilityScore, BAND_LABEL, MIN_SAMPLE_FOR_SCORE } from "./reliability";
export type { ChatMatchView, ChatMessage, MyReliability, ReportReason } from "./types";
