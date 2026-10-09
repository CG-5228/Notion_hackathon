-- =============================================================================
-- Migration 0004: Chat, Mutual Consent & Reveal, Safety, Attendance & Reliability
-- Project: Find Your Buddy
-- Owner: Member 5 (feat/chat)
-- Dependencies: 0001_foundation.sql, 0002_events.sql, 0003_matching.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Table: messages
-- Chat messages scoped to a match. Only active match members can read and write.
-- Real identities are never stored in the message; only sender_id (auth.uid).
-- Read queries join with buddy_match_members to return ONLY pseudonyms.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.buddy_matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_messages_match_created 
    ON public.messages (match_id, created_at ASC);

-- -----------------------------------------------------------------------------
-- 2. Table: buddy_agreements
-- Records explicit "Agree to Go" consents per user for a specific membershipVersion.
-- Version freezing ensures consent cannot be reused across group membership changes.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.buddy_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.buddy_matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    membership_version INTEGER NOT NULL DEFAULT 1,
    agreed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_buddy_agreements_match_user_version UNIQUE (match_id, user_id, membership_version)
);

CREATE INDEX IF NOT EXISTS idx_buddy_agreements_lookup 
    ON public.buddy_agreements (match_id, membership_version);

-- -----------------------------------------------------------------------------
-- 3. Table: reports
-- Private, confidential reporting for safety and trust.
-- Supports targeting a pseudonym in a match; backend resolves the internal user_id.
-- Never exposes report details to the reported user or public.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_pseudonym TEXT,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    match_id UUID REFERENCES public.buddy_matches(id) ON DELETE SET NULL,
    reason TEXT NOT NULL CHECK (char_length(reason) > 0 AND char_length(reason) <= 200),
    details TEXT CHECK (details IS NULL OR char_length(details) <= 2000),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.reports (reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status);

-- -----------------------------------------------------------------------------
-- 4. Table: meetup_outcomes
-- Tracks post-event attendance and cancellations.
-- Requires independent corroboration before confirming attendance.
-- A single unverified report never automatically penalizes a student's score.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meetup_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.buddy_matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('attended', 'did_not_meet', 'dispute', 'late_cancel', 'advance_cancel')),
    details TEXT CHECK (details IS NULL OR char_length(details) <= 2000),
    resolution TEXT NOT NULL DEFAULT 'pending' CHECK (resolution IN ('pending', 'resolved', 'disputed', 'excused')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT uq_meetup_outcomes_match_user UNIQUE (match_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_meetup_outcomes_user ON public.meetup_outcomes (user_id);
CREATE INDEX IF NOT EXISTS idx_meetup_outcomes_match ON public.meetup_outcomes (match_id);

-- -----------------------------------------------------------------------------
-- 5. Table: reliability_adjustments (Optional Moderator Audit Log)
-- Records manual score review actions by authorized moderators.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reliability_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    delta NUMERIC NOT NULL,
    reason TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetup_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reliability_adjustments ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- RLS: messages
-- Active match members only. Blocked pairs cannot read each other's messages.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Active match members can read messages" ON public.messages;
CREATE POLICY "Active match members can read messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
    -- Must be an active member of this match
    EXISTS (
        SELECT 1 FROM public.buddy_match_members m
        WHERE m.match_id = messages.match_id
          AND m.user_id = auth.uid()
          AND m.left_at IS NULL
    )
    -- Must not be blocked by sender, and caller hasn't blocked sender
    AND NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_id = auth.uid() AND b.blocked_id = messages.sender_id)
           OR (b.blocker_id = messages.sender_id AND b.blocked_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Active match members can insert messages" ON public.messages;
CREATE POLICY "Active match members can insert messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.buddy_match_members m
        JOIN public.buddy_matches bm ON bm.id = m.match_id
        WHERE m.match_id = messages.match_id
          AND m.user_id = auth.uid()
          AND m.left_at IS NULL
          AND bm.status IN ('chatting', 'locked', 'revealed')
    )
);

-- -----------------------------------------------------------------------------
-- RLS: buddy_agreements
-- Active match members can view agreement counts; only owner can insert own consent.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Active members can view agreements" ON public.buddy_agreements;
CREATE POLICY "Active members can view agreements"
ON public.buddy_agreements
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.buddy_match_members m
        WHERE m.match_id = buddy_agreements.match_id
          AND m.user_id = auth.uid()
          AND m.left_at IS NULL
    )
);

DROP POLICY IF EXISTS "User can insert own agreement" ON public.buddy_agreements;
CREATE POLICY "User can insert own agreement"
ON public.buddy_agreements
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);

-- -----------------------------------------------------------------------------
-- RLS: reports
-- Reporter can only view their own submissions; insertions by authenticated user.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Reporter can view own reports" ON public.reports;
CREATE POLICY "Reporter can view own reports"
ON public.reports
FOR SELECT
TO authenticated
USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can submit reports" ON public.reports;
CREATE POLICY "Authenticated users can submit reports"
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());

-- -----------------------------------------------------------------------------
-- RLS: meetup_outcomes
-- Participants can view and submit their own outcome feedback.
-- Clients cannot arbitrarily update resolution status.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own meetup outcomes" ON public.meetup_outcomes;
CREATE POLICY "Users can view own meetup outcomes"
ON public.meetup_outcomes
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own meetup outcome" ON public.meetup_outcomes;
CREATE POLICY "Users can insert own meetup outcome"
ON public.meetup_outcomes
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- SECURE POSTGRES RPC FUNCTIONS (SECURITY DEFINER)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- RPC: send_message(match_id, body)
-- Validates active membership, escaping, length, match status and blocks.
-- Returns message metadata with sender pseudonym.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_message(
    p_match_id UUID,
    p_body TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_match_status TEXT;
    v_mode TEXT;
    v_sender_pseudonym TEXT;
    v_active_count INT;
    v_clean_body TEXT;
    v_message_id UUID;
    v_created_at TIMESTAMPTZ;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    -- Clean and bound body length
    v_clean_body := trim(p_body);
    IF char_length(v_clean_body) < 1 OR char_length(v_clean_body) > 2000 THEN
        RAISE EXCEPTION 'Message must be between 1 and 2000 characters.' USING ERRCODE = '22000';
    END IF;

    -- Escape basic HTML entities for XSS prevention
    v_clean_body := replace(replace(replace(replace(replace(
        v_clean_body,
        '&', '&amp;'),
        '<', '&lt;'),
        '>', '&gt;'),
        '"', '&quot;'),
        '''', '&#39;');

    -- Verify active membership and extract pseudonym
    SELECT pseudonym INTO v_sender_pseudonym
    FROM public.buddy_match_members
    WHERE match_id = p_match_id
      AND user_id = v_user_id
      AND left_at IS NULL;

    IF v_sender_pseudonym IS NULL THEN
        RAISE EXCEPTION 'You are not an active member of this match.' USING ERRCODE = '42501';
    END IF;

    -- Verify match status
    SELECT status, mode INTO v_match_status, v_mode
    FROM public.buddy_matches
    WHERE id = p_match_id;

    IF v_match_status NOT IN ('chatting', 'locked', 'revealed') THEN
        RAISE EXCEPTION 'Chat is not available while match is in % status.', v_match_status USING ERRCODE = '55000';
    END IF;

    -- Check group member count requirement (>= 3 active members for group mode)
    IF v_mode = 'group' THEN
        SELECT count(*) INTO v_active_count
        FROM public.buddy_match_members
        WHERE match_id = p_match_id
          AND left_at IS NULL;

        IF v_active_count < 3 THEN
            RAISE EXCEPTION 'Group chat unlocks only when at least 3 active members have joined.' USING ERRCODE = '55000';
        END IF;
    END IF;

    -- Insert message
    INSERT INTO public.messages (match_id, sender_id, body)
    VALUES (p_match_id, v_user_id, v_clean_body)
    RETURNING id, created_at INTO v_message_id, v_created_at;

    RETURN jsonb_build_object(
        'id', v_message_id,
        'match_id', p_match_id,
        'sender_pseudonym', v_sender_pseudonym,
        'body', v_clean_body,
        'created_at', v_created_at
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC: get_match_messages(match_id, limit)
-- Returns messages with sender pseudonyms only.
-- NEVER returns raw user_id or real identity.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_match_messages(
    p_match_id UUID,
    p_limit INT DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    match_id UUID,
    sender_pseudonym TEXT,
    is_own BOOLEAN,
    body TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    -- Confirm caller is active member
    IF NOT EXISTS (
        SELECT 1 FROM public.buddy_match_members
        WHERE buddy_match_members.match_id = p_match_id
          AND buddy_match_members.user_id = v_user_id
          AND buddy_match_members.left_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Access denied: not an active member.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT 
        msg.id,
        msg.match_id,
        mem.pseudonym AS sender_pseudonym,
        (msg.sender_id = v_user_id) AS is_own,
        msg.body,
        msg.created_at
    FROM public.messages msg
    JOIN public.buddy_match_members mem 
      ON mem.match_id = msg.match_id 
     AND mem.user_id = msg.sender_id
    WHERE msg.match_id = p_match_id
      -- Exclude messages from any user with a block relation with caller
      AND NOT EXISTS (
          SELECT 1 FROM public.blocks b
          WHERE (b.blocker_id = v_user_id AND b.blocked_id = msg.sender_id)
             OR (b.blocker_id = msg.sender_id AND b.blocked_id = v_user_id)
      )
    ORDER BY msg.created_at ASC
    LIMIT LEAST(p_limit, 200);
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC: agree_to_go(match_id, membership_version)
-- Transaction-locked consent agreement.
-- Freezes membershipVersion on first consent (does not bump version).
-- Unanimous reveal requires N/N current members to consent within the same version.
-- Stale versions return an error with instructions to refresh.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.agree_to_go(
    p_match_id UUID,
    p_membership_version INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_current_version INT;
    v_match_status TEXT;
    v_match_mode TEXT;
    v_total_active INT;
    v_agreed_count INT;
    v_is_revealed BOOLEAN := FALSE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    -- Row lock on match to prevent race conditions during consent
    SELECT status, mode, membership_version 
    INTO v_match_status, v_match_mode, v_current_version
    FROM public.buddy_matches
    WHERE id = p_match_id
    FOR UPDATE;

    IF v_match_status IS NULL THEN
        RAISE EXCEPTION 'Match not found.' USING ERRCODE = 'P0002';
    END IF;

    IF v_match_status = 'closed' THEN
        RAISE EXCEPTION 'This match has been closed.' USING ERRCODE = '55000';
    END IF;

    -- Validate membership version matches
    IF v_current_version != p_membership_version THEN
        RETURN jsonb_build_object(
            'error', 'stale_version',
            'message', 'Group membership changed while agreeing. Please review current members and confirm again.',
            'current_version', v_current_version
        );
    END IF;

    -- Verify caller is an active member
    IF NOT EXISTS (
        SELECT 1 FROM public.buddy_match_members
        WHERE match_id = p_match_id
          AND user_id = v_user_id
          AND left_at IS NULL
    ) THEN
        RAISE EXCEPTION 'You are not an active member of this match.' USING ERRCODE = '42501';
    END IF;

    -- Count active members
    SELECT count(*) INTO v_total_active
    FROM public.buddy_match_members
    WHERE match_id = p_match_id
      AND left_at IS NULL;

    -- Enforce minimum required members
    IF v_match_mode = 'pair' AND v_total_active != 2 THEN
        RAISE EXCEPTION 'Pair matches require exactly 2 active members.' USING ERRCODE = '55000';
    ELSIF v_match_mode = 'group' AND v_total_active < 3 THEN
        RAISE EXCEPTION 'Group consent requires at least 3 active members.' USING ERRCODE = '55000';
    END IF;

    -- If in 'chatting' status, first agreement transitions to 'locked' (membership frozen, version preserved)
    IF v_match_status = 'chatting' THEN
        UPDATE public.buddy_matches
        SET status = 'locked',
            updated_at = timezone('utc'::text, now())
        WHERE id = p_match_id;
        v_match_status := 'locked';
    END IF;

    -- Record this member's consent for this version
    INSERT INTO public.buddy_agreements (match_id, user_id, membership_version)
    VALUES (p_match_id, v_user_id, p_membership_version)
    ON CONFLICT (match_id, user_id, membership_version) DO NOTHING;

    -- Count agreements for this version among CURRENT active members
    SELECT count(DISTINCT ba.user_id) INTO v_agreed_count
    FROM public.buddy_agreements ba
    JOIN public.buddy_match_members bmm 
      ON bmm.match_id = ba.match_id 
     AND bmm.user_id = ba.user_id
    WHERE ba.match_id = p_match_id
      AND ba.membership_version = p_membership_version
      AND bmm.left_at IS NULL;

    -- Unanimous reveal condition: N/N active members agreed
    IF v_agreed_count >= v_total_active THEN
        UPDATE public.buddy_matches
        SET status = 'revealed',
            updated_at = timezone('utc'::text, now())
        WHERE id = p_match_id;
        
        v_is_revealed := TRUE;
        v_match_status := 'revealed';
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'match_id', p_match_id,
        'status', v_match_status,
        'agreed_count', v_agreed_count,
        'total_members', v_total_active,
        'is_revealed', v_is_revealed,
        'membership_version', p_membership_version
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC: get_revealed_profiles(match_id)
-- Strictly gated: only active members of revealed matches can see profiles.
-- Checks that ALL active members consented on the current membership_version.
-- Returns ONLY approved display name, university, optional avatar, shared interests.
-- NEVER reveals email, phone, student number, home address, or exact location.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_revealed_profiles(
    p_match_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_status TEXT;
    v_version INT;
    v_total_active INT;
    v_agreed_count INT;
    v_result JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    -- Verify caller is active member
    IF NOT EXISTS (
        SELECT 1 FROM public.buddy_match_members
        WHERE match_id = p_match_id
          AND user_id = v_user_id
          AND left_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Access denied: not an active member.' USING ERRCODE = '42501';
    END IF;

    -- Verify match status is revealed
    SELECT status, membership_version 
    INTO v_status, v_version
    FROM public.buddy_matches
    WHERE id = p_match_id;

    IF v_status != 'revealed' THEN
        RAISE EXCEPTION 'Profiles remain hidden until unanimous agreement has been verified by the server.' USING ERRCODE = '42501';
    END IF;

    -- Double-check that all current active members consented to this version
    SELECT count(*) INTO v_total_active
    FROM public.buddy_match_members
    WHERE match_id = p_match_id AND left_at IS NULL;

    SELECT count(DISTINCT ba.user_id) INTO v_agreed_count
    FROM public.buddy_agreements ba
    JOIN public.buddy_match_members bmm 
      ON bmm.match_id = ba.match_id 
     AND bmm.user_id = ba.user_id
    WHERE ba.match_id = p_match_id
      AND ba.membership_version = v_version
      AND bmm.left_at IS NULL;

    IF v_agreed_count < v_total_active THEN
        RAISE EXCEPTION 'Consent check failed: membership has changed since agreement.' USING ERRCODE = '42501';
    END IF;

    -- Return only privacy-consented profile data
    SELECT jsonb_agg(
        jsonb_build_object(
            'pseudonym', m.pseudonym,
            'displayName', COALESCE(p.display_name, 'Verified Student'),
            'university', COALESCE(u.name, 'Irish University'),
            'avatarUrl', p.avatar_url,
            'sharedInterests', COALESCE(
                (
                    SELECT jsonb_agg(i.name)
                    FROM public.profile_interests pi
                    JOIN public.interests i ON i.id = pi.interest_id
                    WHERE pi.user_id = m.user_id
                      AND (pi.share_in_chat IS TRUE OR pi.share_in_chat IS NULL)
                ),
                '[]'::jsonb
            )
        )
    ) INTO v_result
    FROM public.buddy_match_members m
    JOIN public.profiles p ON p.user_id = m.user_id
    LEFT JOIN public.universities u ON u.id = p.university_id
    WHERE m.match_id = p_match_id
      AND m.left_at IS NULL;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC: leave_match(match_id)
-- Handles a member voluntarily leaving or declining before reveal.
-- Invalidates old agreements, bumps version, resets status if group drops < 3.
-- Closes pairs safely and never silently pairs with a stranger.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.leave_match(
    p_match_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_mode TEXT;
    v_status TEXT;
    v_remaining_count INT;
    v_new_version INT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    SELECT mode, status INTO v_mode, v_status
    FROM public.buddy_matches
    WHERE id = p_match_id
    FOR UPDATE;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Match not found.' USING ERRCODE = 'P0002';
    END IF;

    -- Mark departure
    UPDATE public.buddy_match_members
    SET left_at = timezone('utc'::text, now())
    WHERE match_id = p_match_id
      AND user_id = v_user_id
      AND left_at IS NULL;

    -- If departing before reveal, invalidate all prior agreements and bump version
    IF v_status IN ('chatting', 'locked', 'forming') THEN
        DELETE FROM public.buddy_agreements
        WHERE match_id = p_match_id;

        UPDATE public.buddy_matches
        SET membership_version = membership_version + 1,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_match_id
        RETURNING membership_version INTO v_new_version;
    ELSE
        SELECT membership_version INTO v_new_version
        FROM public.buddy_matches WHERE id = p_match_id;
    END IF;

    -- Count remaining active members
    SELECT count(*) INTO v_remaining_count
    FROM public.buddy_match_members
    WHERE match_id = p_match_id
      AND left_at IS NULL;

    IF v_mode = 'pair' THEN
        -- Closing pair: remaining member can search again, never silently re-paired
        UPDATE public.buddy_matches
        SET status = 'closed',
            updated_at = timezone('utc'::text, now())
        WHERE id = p_match_id;
        v_status := 'closed';
    ELSIF v_mode = 'group' THEN
        IF v_remaining_count < 3 THEN
            -- Drop below 3 returns to forming state; chat deactivates until re-joined
            UPDATE public.buddy_matches
            SET status = 'forming',
                updated_at = timezone('utc'::text, now())
            WHERE id = p_match_id;
            v_status := 'forming';
        ELSIF v_status = 'locked' THEN
            -- Unlock back to chatting so remaining members can discuss and re-agree
            UPDATE public.buddy_matches
            SET status = 'chatting',
                updated_at = timezone('utc'::text, now())
            WHERE id = p_match_id;
            v_status := 'chatting';
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'match_id', p_match_id,
        'remaining_members', v_remaining_count,
        'new_status', v_status,
        'new_membership_version', v_new_version
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC: cancel_confirmed_plan(match_id, reason)
-- Cancellation controls for confirmed plans.
-- Policy: > 2 hours beforehand is NEUTRAL (advance_cancel).
-- <= 2 hours beforehand is late_cancel with pending review (emergencies excused).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_confirmed_plan(
    p_match_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_event_start TIMESTAMPTZ;
    v_diff_hours NUMERIC;
    v_kind TEXT;
    v_resolution TEXT;
    v_message TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    -- Fetch event starts_at
    SELECT e.starts_at INTO v_event_start
    FROM public.buddy_matches bm
    JOIN public.events e ON e.id = bm.event_id
    WHERE bm.id = p_match_id;

    IF v_event_start IS NULL THEN
        v_event_start := timezone('utc'::text, now()) + interval '4 hours';
    END IF;

    v_diff_hours := EXTRACT(EPOCH FROM (v_event_start - timezone('utc'::text, now()))) / 3600.0;

    -- > 2 hours advance cancellation is neutral and resolved immediately
    IF v_diff_hours > 2.0 THEN
        v_kind := 'advance_cancel';
        v_resolution := 'resolved';
        v_message := 'Your advance cancellation has been recorded neutrally. Thank you for giving advance notice!';
    ELSE
        v_kind := 'late_cancel';
        v_resolution := 'pending';
        v_message := 'Late cancellation recorded for review. If this was an emergency, you will have an opportunity to provide context.';
    END IF;

    INSERT INTO public.meetup_outcomes (match_id, user_id, kind, details, resolution)
    VALUES (p_match_id, v_user_id, v_kind, p_reason, v_resolution)
    ON CONFLICT (match_id, user_id)
    DO UPDATE SET 
        kind = EXCLUDED.kind,
        details = EXCLUDED.details,
        resolution = EXCLUDED.resolution,
        submitted_at = timezone('utc'::text, now());

    RETURN jsonb_build_object(
        'success', TRUE,
        'kind', v_kind,
        'resolution', v_resolution,
        'message', v_message
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC: submit_meetup_outcome(match_id, kind, details)
-- Post-event check-in.
-- Corroboration rule:
--   Pair: Both must submit 'attended' to be confirmed.
--   Group: Requires multiple independent attendees.
-- Disputes/unilateral accusations remain pending, never auto-penalizing.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_meetup_outcome(
    p_match_id UUID,
    p_kind TEXT,
    p_details TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_mode TEXT;
    v_other_user_id UUID;
    v_other_outcome RECORD;
    v_attended_count INT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    IF p_kind NOT IN ('attended', 'did_not_meet', 'dispute') THEN
        RAISE EXCEPTION 'Invalid outcome kind. Must be attended, did_not_meet, or dispute.' USING ERRCODE = '22000';
    END IF;

    SELECT mode INTO v_mode
    FROM public.buddy_matches
    WHERE id = p_match_id;

    -- Insert or update user outcome
    INSERT INTO public.meetup_outcomes (match_id, user_id, kind, details, resolution)
    VALUES (p_match_id, v_user_id, p_kind, p_details, 'pending')
    ON CONFLICT (match_id, user_id)
    DO UPDATE SET 
        kind = EXCLUDED.kind,
        details = EXCLUDED.details,
        resolution = 'pending',
        submitted_at = timezone('utc'::text, now());

    -- Corroboration logic
    IF v_mode = 'pair' THEN
        -- Check peer outcome
        SELECT user_id, kind, resolution INTO v_other_outcome
        FROM public.meetup_outcomes
        WHERE match_id = p_match_id AND user_id != v_user_id;

        IF FOUND AND p_kind = 'attended' AND v_other_outcome.kind = 'attended' THEN
            -- Both corroborated attendance! Mark both resolved.
            UPDATE public.meetup_outcomes
            SET resolution = 'resolved'
            WHERE match_id = p_match_id;
        END IF;
    ELSIF v_mode = 'group' THEN
        -- For groups, if >= 2 members confirm attended, resolve attended rows
        SELECT count(*) INTO v_attended_count
        FROM public.meetup_outcomes
        WHERE match_id = p_match_id AND kind = 'attended';

        IF v_attended_count >= 2 THEN
            UPDATE public.meetup_outcomes
            SET resolution = 'resolved'
            WHERE match_id = p_match_id AND kind = 'attended';
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'kind', p_kind,
        'status', 'recorded',
        'message', 'Your post-event feedback has been recorded. Outcomes require independent corroboration before affecting history.'
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC: get_reliability_summary(target_pseudonym, match_id)
-- Conservative score calculation over RESOLVED outcomes ONLY:
-- score = round(100 * (confirmed_attended + 0.5 * upheld_late_cancel) / (confirmed_attended + upheld_late_cancel + confirmed_no_show))
-- Requires >= 3 resolved qualifying outcomes; otherwise returns band 'new'.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_reliability_summary(
    p_target_pseudonym TEXT,
    p_match_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_target_id UUID;
    v_confirmed_attended INT := 0;
    v_upheld_late_cancel INT := 0;
    v_confirmed_no_show INT := 0;
    v_total_qualifying INT := 0;
    v_score NUMERIC := NULL;
    v_band TEXT := 'new';
    v_label TEXT := 'New / Not enough verified history';
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    -- Resolve target_id from pseudonym within this match
    SELECT user_id INTO v_target_id
    FROM public.buddy_match_members
    WHERE match_id = p_match_id
      AND pseudonym = p_target_pseudonym;

    IF v_target_id IS NULL THEN
        -- Return default new band if unresolvable
        RETURN jsonb_build_object(
            'band', 'new',
            'score', NULL,
            'sample_size', 0,
            'label', 'New / Not enough verified history',
            'disclaimer', 'Attendance is never guaranteed regardless of score or band.'
        );
    END IF;

    -- Calculate verified outcomes:
    -- 1. Confirmed attended
    SELECT count(*) INTO v_confirmed_attended
    FROM public.meetup_outcomes
    WHERE user_id = v_target_id
      AND kind = 'attended'
      AND resolution = 'resolved';

    -- 2. Upheld late cancel (reviewed and not excused)
    SELECT count(*) INTO v_upheld_late_cancel
    FROM public.meetup_outcomes
    WHERE user_id = v_target_id
      AND kind = 'late_cancel'
      AND resolution = 'resolved';

    -- 3. Confirmed no-show (verified through independent corroboration / review)
    SELECT count(*) INTO v_confirmed_no_show
    FROM public.meetup_outcomes
    WHERE user_id = v_target_id
      AND kind = 'did_not_meet'
      AND resolution = 'resolved';

    v_total_qualifying := v_confirmed_attended + v_upheld_late_cancel + v_confirmed_no_show;

    -- Exact score requires >= 3 resolved qualifying outcomes
    IF v_total_qualifying >= 3 THEN
        v_score := round(100.0 * (v_confirmed_attended + 0.5 * v_upheld_late_cancel) / v_total_qualifying);
        
        IF v_score >= 85 THEN
            v_band := 'generally_reliable';
            v_label := 'Generally Reliable';
        ELSIF v_score >= 60 THEN
            v_band := 'mixed';
            v_label := 'Mixed Attendance History';
        ELSE
            v_band := 'repeated_verified_no_shows';
            v_label := 'Repeated Verified No-Shows';
        END IF;
    ELSE
        v_band := 'new';
        v_score := NULL;
        v_label := 'New / Not enough verified history';
    END IF;

    RETURN jsonb_build_object(
        'band', v_band,
        'score', v_score,
        'sample_size', v_total_qualifying,
        'confirmed_attended', v_confirmed_attended,
        'upheld_late_cancel', v_upheld_late_cancel,
        'confirmed_no_show', v_confirmed_no_show,
        'label', v_label,
        'disclaimer', 'Attendance is never guaranteed. This score reflects past corroborated outcomes only, not a personal safety guarantee.'
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC: report_user(match_id, target_pseudonym, reason, details)
-- Securely submits a report without leaking the target's identity to the reporter.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.report_user(
    p_match_id UUID,
    p_target_pseudonym TEXT,
    p_reason TEXT,
    p_details TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_reporter_id UUID;
    v_target_id UUID;
BEGIN
    v_reporter_id := auth.uid();
    IF v_reporter_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    -- Backend resolves target internal UUID securely
    SELECT user_id INTO v_target_id
    FROM public.buddy_match_members
    WHERE match_id = p_match_id
      AND pseudonym = p_target_pseudonym;

    INSERT INTO public.reports (
        reporter_id,
        target_user_id,
        target_pseudonym,
        match_id,
        reason,
        details,
        status
    ) VALUES (
        v_reporter_id,
        v_target_id,
        p_target_pseudonym,
        p_match_id,
        p_reason,
        p_details,
        'pending'
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Report received. Our moderation team reviews reports confidentially. Submission does not imply realtime staffed monitoring.'
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC: report_event(event_id, reason, details)
-- Report an event for inappropriate content or safety concerns.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.report_event(
    p_event_id UUID,
    p_reason TEXT,
    p_details TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_reporter_id UUID;
BEGIN
    v_reporter_id := auth.uid();
    IF v_reporter_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.reports (
        reporter_id,
        event_id,
        reason,
        details,
        status
    ) VALUES (
        v_reporter_id,
        p_event_id,
        p_reason,
        p_details,
        'pending'
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Event report received for administrative review.'
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC: block_user_in_match(match_id, target_pseudonym)
-- Blocks the user and immediately terminates active communication.
-- For a pair: sets match to 'closed'.
-- For a group: removes member, resets agreements, and bumps version.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.block_user_in_match(
    p_match_id UUID,
    p_target_pseudonym TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_blocker_id UUID;
    v_target_id UUID;
    v_mode TEXT;
BEGIN
    v_blocker_id := auth.uid();
    IF v_blocker_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    -- Backend resolves target user
    SELECT user_id INTO v_target_id
    FROM public.buddy_match_members
    WHERE match_id = p_match_id
      AND pseudonym = p_target_pseudonym;

    IF v_target_id IS NULL THEN
        RAISE EXCEPTION 'Target member not found in this match.' USING ERRCODE = 'P0002';
    END IF;

    -- Insert block record
    INSERT INTO public.blocks (blocker_id, blocked_id)
    VALUES (v_blocker_id, v_target_id)
    ON CONFLICT (blocker_id, blocked_id) DO NOTHING;

    -- Terminate shared communication immediately
    SELECT mode INTO v_mode
    FROM public.buddy_matches
    WHERE id = p_match_id;

    IF v_mode = 'pair' THEN
        -- Close pair match completely
        UPDATE public.buddy_matches
        SET status = 'closed',
            updated_at = timezone('utc'::text, now())
        WHERE id = p_match_id;
    ELSE
        -- Remove the blocking user safely from the group
        UPDATE public.buddy_match_members
        SET left_at = timezone('utc'::text, now())
        WHERE match_id = p_match_id
          AND user_id = v_blocker_id;

        -- Invalidate all prior consents
        DELETE FROM public.buddy_agreements
        WHERE match_id = p_match_id;

        -- Bump version
        UPDATE public.buddy_matches
        SET membership_version = membership_version + 1,
            status = 'forming',
            updated_at = timezone('utc'::text, now())
        WHERE id = p_match_id;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'User blocked. Communication in this match has been terminated and future matching with this user is prevented.'
    );
END;
$$;
