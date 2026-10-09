// =============================================================================
// Member 5 Feature Exports: Anonymous Chat, Consent, Attendance & Reliability
// =============================================================================

// Components
export { BuddyChat } from './components/BuddyChat.js';
export { ConsentBanner } from './components/ConsentBanner.js';
export { RevealedProfilesCard } from './components/RevealedProfilesCard.js';
export { ConfirmedPlanView } from './components/ConfirmedPlanView.js';
export { AttendanceCheckIn } from './components/AttendanceCheckIn.js';
export { ReliabilityBadge } from './components/ReliabilityBadge.js';
export { ReliabilitySummaryModal } from './components/ReliabilitySummaryModal.js';
export { ReportModal } from './components/ReportModal.js';
export { BlockModal } from './components/BlockModal.js';
export { IcebreakerSuggestions } from './components/IcebreakerSuggestions.js';

// Utilities
export { calculateReliability, getBandDisplay } from './utils/reliability.js';
export { sanitizeText, validateMessageLength } from './utils/sanitizer.js';

// Services
export * from './services/chatService.js';

// Types
export * from './types.js';
