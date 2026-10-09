import assert from 'node:assert';

interface MockConsentState {
  matchId: string;
  mode: 'pair' | 'group';
  status: 'forming' | 'chatting' | 'locked' | 'revealed' | 'closed';
  membershipVersion: number;
  members: string[]; // pseudonyms
  agreements: Record<string, number>; // pseudonym -> version agreed
}

function processAgreement(
  state: MockConsentState,
  member: string,
  version: number
): { success: boolean; isRevealed: boolean; error?: string } {
  if (state.membershipVersion !== version) {
    return { success: false, isRevealed: false, error: 'stale_version' };
  }
  if (!state.members.includes(member)) {
    return { success: false, isRevealed: false, error: 'not_a_member' };
  }

  // Freeze status to locked on first agreement if chatting
  if (state.status === 'chatting') {
    state.status = 'locked';
  }

  state.agreements[member] = version;

  // Count agreements for current version
  const agreedCount = state.members.filter(
    (m) => state.agreements[m] === state.membershipVersion
  ).length;

  const total = state.members.length;
  const isRevealed = agreedCount === total;
  if (isRevealed) {
    state.status = 'revealed';
  }

  return { success: true, isRevealed };
}

function processMemberDeparture(
  state: MockConsentState,
  member: string
): void {
  state.members = state.members.filter((m) => m !== member);
  state.membershipVersion += 1;
  state.agreements = {}; // invalidate all prior agreements

  if (state.mode === 'pair') {
    state.status = 'closed';
  } else {
    if (state.members.length < 3) {
      state.status = 'forming';
    } else {
      state.status = 'chatting';
    }
  }
}

export function runConsentTests() {
  console.log('--- Running Unanimous Consent & Reveal State Machine Tests ---');

  // Test 1: Pair matching: 1 of 2 agreed -> still anonymous
  {
    const state: MockConsentState = {
      matchId: 'match-pair-01',
      mode: 'pair',
      status: 'chatting',
      membershipVersion: 1,
      members: ['UserA', 'UserB'],
      agreements: {},
    };

    const res1 = processAgreement(state, 'UserA', 1);
    assert.strictEqual(res1.success, true);
    assert.strictEqual(res1.isRevealed, false, 'Pair must NOT reveal with only 1 agreement');
    assert.strictEqual(state.status, 'locked', 'Match transitions to locked upon first consent');
    console.log('✓ Test 1 Passed: 1 of 2 in pair does not reveal identity.');

    // User B agrees -> unanimous 2/2 -> reveal!
    const res2 = processAgreement(state, 'UserB', 1);
    assert.strictEqual(res2.success, true);
    assert.strictEqual(res2.isRevealed, true, 'Pair MUST reveal at 2/2 unanimous agreement');
    assert.strictEqual(state.status, 'revealed');
    console.log('✓ Test 2 Passed: 2 of 2 in pair triggers unanimous profile reveal.');
  }

  // Test 3: Group matching: 2 of 3 agreed -> still anonymous!
  {
    const state: MockConsentState = {
      matchId: 'match-group-01',
      mode: 'group',
      status: 'chatting',
      membershipVersion: 1,
      members: ['MemberA', 'MemberB', 'MemberC'],
      agreements: {},
    };

    const rA = processAgreement(state, 'MemberA', 1);
    const rB = processAgreement(state, 'MemberB', 1);
    assert.strictEqual(rA.isRevealed, false);
    assert.strictEqual(rB.isRevealed, false, '2 of 3 group members agreed must still be anonymous');
    console.log('✓ Test 3 Passed: 2 of 3 in group remains completely anonymous.');

    // Member C agrees -> 3 of 3 -> reveal!
    const rC = processAgreement(state, 'MemberC', 1);
    assert.strictEqual(rC.isRevealed, true, '3 of 3 in group triggers unanimous profile reveal');
    assert.strictEqual(state.status, 'revealed');
    console.log('✓ Test 4 Passed: 3 of 3 in group triggers unanimous reveal.');
  }

  // Test 5: Member departs before reveal -> version bumps, prior agreements invalidated
  {
    const state: MockConsentState = {
      matchId: 'match-group-02',
      mode: 'group',
      status: 'locked',
      membershipVersion: 1,
      members: ['A', 'B', 'C', 'D'],
      agreements: { A: 1, B: 1 },
    };

    // D leaves before unanimous agreement
    processMemberDeparture(state, 'D');
    assert.strictEqual(state.membershipVersion, 2, 'Membership version must bump on member departure');
    assert.deepStrictEqual(state.agreements, {}, 'Old agreements must be completely invalidated');
    assert.strictEqual(state.status, 'chatting', 'Returns to chatting with 3 remaining members');

    // Attempting to agree with stale version 1 must fail
    const staleResult = processAgreement(state, 'A', 1);
    assert.strictEqual(staleResult.success, false);
    assert.strictEqual(staleResult.error, 'stale_version', 'Stale version agreements are rejected');
    console.log('✓ Test 5 Passed: Member departure invalidates prior agreements and rejects stale version.');
  }

  // Test 6: Group drops below 3 -> returns to forming
  {
    const state: MockConsentState = {
      matchId: 'match-group-03',
      mode: 'group',
      status: 'chatting',
      membershipVersion: 1,
      members: ['A', 'B', 'C'],
      agreements: {},
    };

    processMemberDeparture(state, 'C');
    assert.strictEqual(state.members.length, 2);
    assert.strictEqual(state.status, 'forming', 'Group with <3 members must drop back to forming status');
    console.log('✓ Test 6 Passed: Group dropping below 3 members returns to forming and halts chat.');
  }
}
