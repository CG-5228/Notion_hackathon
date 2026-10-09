import {
  BuddyMatchView,
  ChatMessage,
  ConsentResult,
  ReliabilitySummary,
  RevealedProfile, MeetupOutcomeKind,
} from '../types.js';
import {
  DEMO_MESSAGES,
  DEMO_PAIR_MATCH,
  DEMO_RELIABILITY_HISTORIES,
} from './mockChatData.js';
import { sanitizeText, validateMessageLength } from '../utils/sanitizer.js';

// In an integrated app, supabase is imported from src/lib/supabase
// For standalone and testing resilience, we safely check window / global or use fallback
let supabaseClient: any = null;

export function setSupabaseClient(client: any) {
  supabaseClient = client;
}

export async function getSupabase() {
  if (supabaseClient) return supabaseClient;
  try {
    // Dynamic import to avoid hard failure if Member 1 hasn't pushed src/lib/supabase.ts yet
    const mod = await import('../../lib/supabase.js' as any).catch(() => null);
    if (mod && mod.supabase) {
      supabaseClient = mod.supabase;
      return supabaseClient;
    }
  } catch {
    // Ignore and proceed to mock fallback
  }
  return null;
}

/**
 * Fetch match view by ID. Gated to member access; pseudonym-only pre-reveal.
 */
export async function fetchMatch(matchId: string): Promise<BuddyMatchView> {
  const sb = await getSupabase();
  if (sb) {
    const { data, error } = await sb.rpc('get_my_match', { match_id: matchId });
    if (error) throw new Error(error.message);
    return data as BuddyMatchView;
  }

  // Fallback demo state
  return { ...DEMO_PAIR_MATCH, id: matchId };
}

/**
 * Fetch messages for a match with pseudonyms only.
 */
export async function fetchMessages(matchId: string): Promise<ChatMessage[]> {
  const sb = await getSupabase();
  if (sb) {
    const { data, error } = await sb.rpc('get_match_messages', {
      p_match_id: matchId,
      p_limit: 100,
    });
    if (error) throw new Error(error.message);
    return (data || []).map((row: any) => ({
      id: row.id,
      matchId: row.match_id,
      senderPseudonym: row.sender_pseudonym,
      isOwn: Boolean(row.is_own),
      body: row.body,
      createdAt: row.created_at,
    }));
  }

  return [...DEMO_MESSAGES];
}

/**
 * Send message through the secure RPC.
 */
export async function sendMessage(
  matchId: string,
  body: string
): Promise<ChatMessage> {
  const validation = validateMessageLength(body);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cleanBody = sanitizeText(body);
  const sb = await getSupabase();
  if (sb) {
    const { data, error } = await sb.rpc('send_message', {
      p_match_id: matchId,
      p_body: cleanBody,
    });
    if (error) throw new Error(error.message);
    return {
      id: data.id,
      matchId: data.match_id,
      senderPseudonym: data.sender_pseudonym,
      isOwn: true,
      body: data.body,
      createdAt: data.created_at,
    };
  }

  // Fallback demo return
  return {
    id: 'local-' + Date.now(),
    matchId,
    senderPseudonym: 'SwiftFalcon',
    isOwn: true,
    body: cleanBody,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Transaction-locked consent agreement.
 */
export async function agreeToGo(
  matchId: string,
  membershipVersion: number
): Promise<ConsentResult> {
  const sb = await getSupabase();
  if (sb) {
    const { data, error } = await sb.rpc('agree_to_go', {
      p_match_id: matchId,
      p_membership_version: membershipVersion,
    });
    if (error) throw new Error(error.message);
    if (data.error === 'stale_version') {
      return {
        success: false,
        matchId,
        status: 'chatting',
        agreedCount: 0,
        totalMembers: 0,
        isRevealed: false,
        membershipVersion: data.current_version,
        error: data.error,
        message: data.message,
      };
    }
    return {
      success: true,
      matchId: data.match_id,
      status: data.status,
      agreedCount: data.agreed_count,
      totalMembers: data.total_members,
      isRevealed: data.is_revealed,
      membershipVersion: data.membership_version,
    };
  }

  // Demo fallback: simulate 2/2 agreement reveal
  return {
    success: true,
    matchId,
    status: 'revealed',
    agreedCount: 2,
    totalMembers: 2,
    isRevealed: true,
    membershipVersion,
  };
}

/**
 * Fetch revealed profiles. Gated strictly on server until unanimous consent is achieved.
 */
export async function fetchRevealedProfiles(
  matchId: string
): Promise<RevealedProfile[]> {
  const sb = await getSupabase();
  if (sb) {
    const { data, error } = await sb.rpc('get_revealed_profiles', {
      p_match_id: matchId,
    });
    if (error) throw new Error(error.message);
    return (data || []) as RevealedProfile[];
  }

  // Fallback demo revealed profiles
  return [
    {
      pseudonym: 'SwiftFalcon',
      displayName: 'Alex M.',
      university: 'Trinity College Dublin',
      sharedInterests: ['Hackathons', 'Tech & AI', 'Coffee'],
    },
    {
      pseudonym: 'BriskOtter',
      displayName: 'Sarah K.',
      university: 'University College Dublin',
      sharedInterests: ['Hackathons', 'Web Development'],
    },
  ];
}

/**
 * Voluntary departure or decline before reveal.
 */
export async function leaveMatch(
  matchId: string
): Promise<{ success: boolean; newStatus: string }> {
  const sb = await getSupabase();
  if (sb) {
    const { data, error } = await sb.rpc('leave_match', {
      p_match_id: matchId,
    });
    if (error) throw new Error(error.message);
    return { success: true, newStatus: data.new_status };
  }

  return { success: true, newStatus: 'closed' };
}

/**
 * Cancellation of a confirmed plan.
 */
export async function cancelConfirmedPlan(
  matchId: string,
  reason?: string
): Promise<{ success: boolean; kind: string; message: string }> {
  const sb = await getSupabase();
  if (sb) {
    const { data, error } = await sb.rpc('cancel_confirmed_plan', {
      p_match_id: matchId,
      p_reason: reason || null,
    });
    if (error) throw new Error(error.message);
    return {
      success: true,
      kind: data.kind,
      message: data.message,
    };
  }

  return {
    success: true,
    kind: 'advance_cancel',
    message: 'Advance cancellation recorded neutrally.',
  };
}

/**
 * Post-event check-in feedback.
 */
export async function submitMeetupOutcome(
  matchId: string,
  kind: MeetupOutcomeKind,
  details?: string
): Promise<{ success: boolean; message: string }> {
  const sb = await getSupabase();
  if (sb) {
    const { data, error } = await sb.rpc('submit_meetup_outcome', {
      p_match_id: matchId,
      p_kind: kind,
      p_details: details || null,
    });
    if (error) throw new Error(error.message);
    return { success: true, message: data.message };
  }

  return {
    success: true,
    message: 'Attendance feedback submitted for independent corroboration.',
  };
}

/**
 * Coarse reliability summary lookup for a pseudonym in a match.
 */
export async function fetchReliabilitySummary(
  targetPseudonym: string,
  matchId: string
): Promise<ReliabilitySummary> {
  const sb = await getSupabase();
  if (sb) {
    const { data, error } = await sb.rpc('get_reliability_summary', {
      p_target_pseudonym: targetPseudonym,
      p_match_id: matchId,
    });
    if (error) throw new Error(error.message);
    return data as ReliabilitySummary;
  }

  if (DEMO_RELIABILITY_HISTORIES[targetPseudonym]) {
    return DEMO_RELIABILITY_HISTORIES[targetPseudonym];
  }

  return {
    band: 'new',
    score: null,
    sampleSize: 0,
    label: 'New / Not enough verified history',
    disclaimer: 'Attendance is never guaranteed regardless of score or band.',
  };
}

/**
 * Submit confidential report against a pseudonym.
 */
export async function reportUser(
  matchId: string,
  targetPseudonym: string,
  reason: string,
  details?: string
): Promise<{ success: boolean; message: string }> {
  const sb = await getSupabase();
  if (sb) {
    const { data, error } = await sb.rpc('report_user', {
      p_match_id: matchId,
      p_target_pseudonym: targetPseudonym,
      p_reason: reason,
      p_details: details || null,
    });
    if (error) throw new Error(error.message);
    return { success: true, message: data.message };
  }

  return {
    success: true,
    message: 'Report submitted. Our moderation team reviews reports confidentially.',
  };
}

/**
 * Submit event report.
 */
export async function reportEvent(
  eventId: string,
  reason: string,
  details?: string
): Promise<{ success: boolean; message: string }> {
  const sb = await getSupabase();
  if (sb) {
    const { data, error } = await sb.rpc('report_event', {
      p_event_id: eventId,
      p_reason: reason,
      p_details: details || null,
    });
    if (error) throw new Error(error.message);
    return { success: true, message: data.message };
  }

  return {
    success: true,
    message: 'Event report received for administrative review.',
  };
}

/**
 * Block a user by pseudonym in a match context.
 */
export async function blockUser(
  matchId: string,
  targetPseudonym: string
): Promise<{ success: boolean; message: string }> {
  const sb = await getSupabase();
  if (sb) {
    const { data, error } = await sb.rpc('block_user_in_match', {
      p_match_id: matchId,
      p_target_pseudonym: targetPseudonym,
    });
    if (error) throw new Error(error.message);
    return { success: true, message: data.message };
  }

  return {
    success: true,
    message: 'User blocked. Communication in this match has been terminated.',
  };
}

/**
 * Realtime subscription to messages.
 */
export function subscribeToMessages(
  matchId: string,
  onNewMessage: (msg: ChatMessage) => void
): () => void {
  let unsubscribe = () => {};

  getSupabase().then((sb) => {
    if (!sb) return;

    const channel = sb
      .channel(`match_messages_${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        async (payload: any) => {
          // Re-fetch or transform to attach pseudonym
          const msgs = await fetchMessages(matchId);
          const found = msgs.find((m) => m.id === payload.new.id);
          if (found) {
            onNewMessage(found);
          }
        }
      )
      .subscribe();

    unsubscribe = () => {
      sb.removeChannel(channel);
    };
  });

  return () => {
    unsubscribe();
  };
}
