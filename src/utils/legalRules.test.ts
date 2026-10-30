import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCPCADeadline,
  calculateNotaryDecret08243,
  calculateArticle317Stamp,
  validateAndBalanceSCFEntry,
  canReleaseEscrow,
} from './legalRules';

test('Legal: CPCA Deadline Engine calculates standard 30-day appeal with Art. 405 weekend carryover', () => {
  // Thursday April 9, 2026 + 30 days = Saturday May 9, 2026 -> rolls over to Sunday May 10, 2026 at 16:30
  const result = calculateCPCADeadline('2026-04-09', 'appel_civil', 'local');
  assert.equal(result.baseDays, 30);
  assert.equal(result.distanceExtensionDays, 0);
  assert.equal(result.isRolledOver, true);
  assert.match(result.terminalExpiryDate, /2026-05-10T16:30:00/);
});

test('Legal: CPCA Deadline Engine adds 15 days distance extension for Grand Sud wilayas', () => {
  const result = calculateCPCADeadline('2026-04-09', 'appel_civil', 'grand_sud');
  assert.equal(result.baseDays, 30);
  assert.equal(result.distanceExtensionDays, 15);
  // May 9 + 15 days = May 24 (Sunday)
  assert.match(result.terminalExpiryDate, /2026-05-24T16:30:00/);
});

test('Legal: Notary Décret 08-243 5-Tranche progressive tariff calculates exact statutory fees', () => {
  // Case 1: 500,000 DZD (Tranche 1 only @ 3.0%)
  const res1 = calculateNotaryDecret08243('vente_immobiliere', 500000);
  assert.equal(res1.honorairesHtDzd, 15000);
  assert.equal(res1.tvaAmountDzd, 2850); // 19%
  assert.equal(res1.totalHonorairesTtcDzd, 17850);

  // Case 2: 12,000,000 DZD (All 5 tranches)
  // T1: 500k * 3% = 15k
  // T2: 500k * 2% = 10k
  // T3: 4M * 1% = 40k
  // T4: 5M * 0.75% = 37.5k
  // T5: 2M * 0.5% = 10k
  // Total HT: 112,500 DZD
  const res2 = calculateNotaryDecret08243('vente_immobiliere', 12000000);
  assert.equal(res2.honorairesHtDzd, 112500);
  assert.equal(res2.tvaAmountDzd, 21375); // 19%
  assert.equal(res2.droitsEnregistrementDzd, 300000); // 2.5%
  assert.equal(res2.droitsPubliciteDzd, 120000); // 1.0%
  assert.equal(res2.totalProvisionClientDzd, 112500 + 21375 + 300000 + 120000);
});

test('Legal: Article 317 Stamp Duty applies progressive cash taxes with statutory ceiling', () => {
  // Exempt under 500 DA
  assert.equal(calculateArticle317Stamp(400, 'especes'), 0);
  // 1,000 DA cash -> 20 DA
  assert.equal(calculateArticle317Stamp(1000, 'especes'), 20);
  // 5,000 DA cash -> 50 DA
  assert.equal(calculateArticle317Stamp(5000, 'especes'), 50);
  // 150,000 DA cash -> 1% = 1,500 DA
  assert.equal(calculateArticle317Stamp(150000, 'especes'), 1500);
  // 400,000 DA cash -> 1% = 4,000 DA capped at 2,500 DA
  assert.equal(calculateArticle317Stamp(400000, 'especes'), 2500);
  // Non-cash (cheque, virement, baridimob) is strictly 0 DA
  assert.equal(calculateArticle317Stamp(500000, 'cheque'), 0);
  assert.equal(calculateArticle317Stamp(500000, 'virement'), 0);
  assert.equal(calculateArticle317Stamp(500000, 'baridimob'), 0);
});

test('Legal: SCF General Ledger validates strict double-entry balance', () => {
  const balancedLines = [
    { accountNumber: '411000', debitDzd: 238000, creditDzd: 0 },
    { accountNumber: '706000', debitDzd: 0, creditDzd: 200000 },
    { accountNumber: '445700', debitDzd: 0, creditDzd: 38000 },
  ];
  const resValid = validateAndBalanceSCFEntry(balancedLines);
  assert.equal(resValid.isBalanced, true);
  assert.equal(resValid.deltaDzd, 0);

  const unbalancedLines = [
    { accountNumber: '411000', debitDzd: 238000, creditDzd: 0 },
    { accountNumber: '706000', debitDzd: 0, creditDzd: 200000 },
  ];
  const resInvalid = validateAndBalanceSCFEntry(unbalancedLines);
  assert.equal(resInvalid.isBalanced, false);
  assert.equal(resInvalid.deltaDzd, 238000 - 200000);
});

test('Legal: Escrow Vault double-lock enforces cadastral clearance and master PIN', () => {
  // Payout blocked without cadastral volume/number
  const blockNoCadastre = canReleaseEscrow(5000000, 2000000, false, '2026', '2026');
  assert.equal(blockNoCadastre.allowed, false);
  assert.match(blockNoCadastre.reason || '', /Conservation Foncière/);

  // Payout blocked on incorrect PIN
  const blockBadPin = canReleaseEscrow(5000000, 2000000, true, '9999', '2026');
  assert.equal(blockBadPin.allowed, false);
  assert.match(blockBadPin.reason || '', /Code PIN/);

  // Payout succeeds with both locks cleared
  const success = canReleaseEscrow(5000000, 2000000, true, '2026', '2026');
  assert.equal(success.allowed, true);
});
