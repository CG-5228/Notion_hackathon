import assert from 'node:assert';
import { calculateReliability, getBandDisplay } from '../utils/reliability';

export function runReliabilityTests() {
  console.log('--- Running Reliability & Scoring Policy Tests ---');

  // Test 1: New user with 0 outcomes -> band is 'new', score is null
  {
    const result = calculateReliability({
      confirmedAttended: 0,
      upheldLateCancel: 0,
      confirmedNoShow: 0,
    });
    assert.strictEqual(result.band, 'new', 'Band must be new for 0 outcomes');
    assert.strictEqual(result.score, null, 'Score must be null when sample size < 3');
    assert.strictEqual(result.sampleSize, 0);
    assert.ok(result.label.includes('Not enough verified history'));
    assert.ok(result.disclaimer.includes('never guaranteed'));
    console.log('✓ Test 1 Passed: 0 outcomes produces band NEW and null score.');
  }

  // Test 2: User with 2 outcomes (under threshold of 3) -> score must remain null
  {
    const result = calculateReliability({
      confirmedAttended: 2,
      upheldLateCancel: 0,
      confirmedNoShow: 0,
    });
    assert.strictEqual(result.band, 'new');
    assert.strictEqual(result.score, null, 'Score must not unlock at 2 outcomes');
    assert.strictEqual(result.sampleSize, 2);
    console.log('✓ Test 2 Passed: 2 outcomes remains in NEW band without fabricated percentage.');
  }

  // Test 3: Exactly 3 outcomes with perfect attendance -> 100% and 'generally_reliable'
  {
    const result = calculateReliability({
      confirmedAttended: 3,
      upheldLateCancel: 0,
      confirmedNoShow: 0,
    });
    assert.strictEqual(result.score, 100);
    assert.strictEqual(result.band, 'generally_reliable');
    assert.strictEqual(result.sampleSize, 3);
    console.log('✓ Test 3 Passed: 3 attended meetups produces 100% Generally Reliable.');
  }

  // Test 4: Weighted late cancellation (0.5 weight)
  // 2 attended, 1 upheld late cancel -> (2 + 0.5) / 3 = 2.5 / 3 = 83.333% -> 83% ('mixed')
  {
    const result = calculateReliability({
      confirmedAttended: 2,
      upheldLateCancel: 1,
      confirmedNoShow: 0,
    });
    assert.strictEqual(result.score, 83);
    assert.strictEqual(result.band, 'mixed');
    assert.strictEqual(result.sampleSize, 3);
    console.log('✓ Test 4 Passed: Upheld late cancel receives 0.5 weight (83% Mixed).');
  }

  // Test 5: Multiple verified no-shows
  // 1 attended, 0 late cancel, 3 no-shows -> 1 / 4 = 25% ('repeated_verified_no_shows')
  {
    const result = calculateReliability({
      confirmedAttended: 1,
      upheldLateCancel: 0,
      confirmedNoShow: 3,
    });
    assert.strictEqual(result.score, 25);
    assert.strictEqual(result.band, 'repeated_verified_no_shows');
    assert.strictEqual(result.sampleSize, 4);
    console.log('✓ Test 5 Passed: Low verified attendance drops into repeated_verified_no_shows band.');
  }

  // Test 6: Display metadata helper
  {
    const display = getBandDisplay('generally_reliable');
    assert.strictEqual(display.label, 'Generally Reliable');
    assert.ok(display.colorClass.includes('emerald'));

    const newDisplay = getBandDisplay('new');
    assert.strictEqual(newDisplay.label, 'New Buddy');
    console.log('✓ Test 6 Passed: Band display badges match accessible styling guidelines.');
  }
}
