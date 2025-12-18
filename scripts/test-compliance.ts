import { validateContent } from '../lib/ads/compliance';

const bannedClaims = [
    "We are open 24/7",
    "95% satisfaction rate",
    "Join our 10,000 users",
    "Free prescriptions"
];

const safeClaims = [
    "We are open extended hours",
    "High satisfaction rate",
    "Growing community",
    "Direct access to your doctor"
];

console.log("Testing Banned Claims (Should FAIL):");
bannedClaims.forEach(claim => {
    const result = validateContent(claim);
    console.log(`"${claim}": ${result.status} ${result.status === 'FAIL' ? '(Correct)' : '(ERROR)'}`);
    if (result.status === 'FAIL') console.log(result.reasons);
});

console.log("\nTesting Safe Claims (Should PASS):");
safeClaims.forEach(claim => {
    const result = validateContent(claim);
    console.log(`"${claim}": ${result.status} ${result.status === 'PASS' ? '(Correct)' : '(ERROR)'}`);
    if (result.status === 'FAIL') console.log(result.reasons);
});
