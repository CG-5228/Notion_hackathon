import { runReliabilityTests } from './reliability.test';
import { runSanitizerTests } from './sanitizer.test';
import { runConsentTests } from './consent.test';

console.log('========================================================');
console.log('MEMBER 5 TEST SUITE: CHAT, CONSENT, SAFETY & RELIABILITY');
console.log('========================================================\n');

try {
  runReliabilityTests();
  console.log('\n');
  runSanitizerTests();
  console.log('\n');
  runConsentTests();

  console.log('\n========================================================');
  console.log('🎉 ALL MEMBER 5 TESTS PASSED SUCCESSFULLY!');
  console.log('========================================================');
} catch (err) {
  console.error('\n❌ Test suite failure:', err);
  process.exit(1);
}
