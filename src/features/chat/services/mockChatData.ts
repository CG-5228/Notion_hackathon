import { BuddyMatchView, ChatMessage, ReliabilitySummary } from '../types.js';

/**
 * SYNTHETIC DEMO DATA
 * Clearly labeled for offline tests, previews, and demonstrating the scoring formula.
 */

export const DEMO_EVENT_SUMMARY = {
  id: 'demo-evt-001',
  title: 'Dublin Student Hackathon 2026',
  category: 'hackathon',
  startsAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
  venuePublic: 'The Digital Hub, Thomas Street, Dublin 8',
  kind: 'curated_public' as const,
  goingCount: 42,
  universitiesRepresented: 4,
  reviewStatus: 'curated' as const,
};

export const DEMO_PAIR_MATCH: BuddyMatchView = {
  id: 'demo-match-pair-01',
  eventId: 'demo-evt-001',
  mode: 'pair',
  status: 'chatting',
  memberCount: 2,
  maxSize: 2,
  membershipVersion: 1,
  myPseudonym: 'SwiftFalcon',
  participants: [
    { pseudonym: 'SwiftFalcon', agreed: false, reliabilityBand: 'new' },
    { pseudonym: 'BriskOtter', agreed: false, reliabilityBand: 'generally_reliable' },
  ],
  eventSummary: DEMO_EVENT_SUMMARY,
};

export const DEMO_GROUP_MATCH: BuddyMatchView = {
  id: 'demo-match-group-01',
  eventId: 'demo-evt-001',
  mode: 'group',
  status: 'chatting',
  memberCount: 3,
  maxSize: 5,
  membershipVersion: 1,
  myPseudonym: 'CosmicBadger',
  participants: [
    { pseudonym: 'CosmicBadger', agreed: false, reliabilityBand: 'new' },
    { pseudonym: 'AmberRobin', agreed: true, reliabilityBand: 'generally_reliable' },
    { pseudonym: 'SilverFox', agreed: false, reliabilityBand: 'mixed' },
  ],
  eventSummary: DEMO_EVENT_SUMMARY,
};

export const DEMO_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-01',
    matchId: 'demo-match-pair-01',
    senderPseudonym: 'BriskOtter',
    isOwn: false,
    body: 'Hey there! Are you planning to participate in the AI track at the hackathon?',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-02',
    matchId: 'demo-match-pair-01',
    senderPseudonym: 'SwiftFalcon',
    isOwn: true,
    body: 'Hi! Yes, I want to build something with LLMs and web apps. Shall we meet at the entrance desk?',
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
];

export const DEMO_RELIABILITY_HISTORIES: Record<string, ReliabilitySummary> = {
  // Demo User A: 5 attended, 1 upheld late cancel, 0 no shows -> 5.5 / 6 = 92% (generally_reliable)
  BriskOtter: {
    band: 'generally_reliable',
    score: 92,
    sampleSize: 6,
    confirmedAttended: 5,
    upheldLateCancel: 1,
    confirmedNoShow: 0,
    label: 'Generally Reliable',
    disclaimer: 'Attendance is never guaranteed. This reflects corroborated past meetups only.',
  },
  // Demo User B: 2 attended, 1 late cancel, 1 no-show -> 2.5 / 4 = 63% (mixed)
  SilverFox: {
    band: 'mixed',
    score: 63,
    sampleSize: 4,
    confirmedAttended: 2,
    upheldLateCancel: 1,
    confirmedNoShow: 1,
    label: 'Mixed Attendance History',
    disclaimer: 'Attendance is never guaranteed. This reflects corroborated past meetups only.',
  },
  // Demo User C: New user with < 3 outcomes -> score is null, band is new
  SwiftFalcon: {
    band: 'new',
    score: null,
    sampleSize: 1,
    confirmedAttended: 1,
    upheldLateCancel: 0,
    confirmedNoShow: 0,
    label: 'New / Not enough verified history',
    disclaimer: 'Attendance is never guaranteed. Fewer than 3 verified meetups on record.',
  },
};
