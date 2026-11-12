import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTotalPaid,
  calculateBalance,
  calculateExchangeDifference,
  calculateNetCreditAmount,
  calculateNetProfit,
  maskAadhaar,
  getDocumentAlertStatus,
  isOverdue,
  generateNextId,
  isDateWithinFilter,
  formatINR,
} from './pureCalculations';

test('calculateTotalPaid sums advance and additional correctly', () => {
  assert.equal(calculateTotalPaid(2500, 1500), 4000);
  assert.equal(calculateTotalPaid(0, 500), 500);
  assert.equal(calculateTotalPaid(3000.5, 999.5), 4000);
});

test('calculateBalance correctly calculates remaining fee and prevents negative balance', () => {
  assert.equal(calculateBalance(5000, 3000), 2000);
  assert.equal(calculateBalance(4000, 4000), 0);
  assert.equal(calculateBalance(3000, 5000), 0);
});

test('calculateExchangeDifference subtracts valuation from new tractor price', () => {
  // New Tractor ₹8,50,000, Old Tractor Valuation ₹3,20,000 => Difference ₹5,30,000
  assert.equal(calculateExchangeDifference(850000, 320000), 530000);
});

test('calculateNetCreditAmount deducts doc charges from loan amount', () => {
  assert.equal(calculateNetCreditAmount(500000, 15000), 485000);
});

test('calculateNetProfit calculates income minus expense', () => {
  assert.equal(calculateNetProfit(125000, 45000), 80000);
});

test('maskAadhaar masks all except last 4 digits', () => {
  assert.equal(maskAadhaar('123456789012'), 'XXXX-XXXX-9012');
  assert.equal(maskAadhaar('1234-5678-9012'), 'XXXX-XXXX-9012');
  assert.equal(maskAadhaar(''), 'XXXX-XXXX-XXXX');
});

test('getDocumentAlertStatus detects expired, expiring soon, and valid', () => {
  const current = '2026-11-12';
  // Expired 2 days ago
  assert.equal(getDocumentAlertStatus('2026-11-10', current), 'expired');
  // Expiring in 15 days (<= 30 days)
  assert.equal(getDocumentAlertStatus('2026-11-27', current), 'expiring_soon');
  // Valid for 6 months
  assert.equal(getDocumentAlertStatus('2027-05-12', current), 'valid');
});

test('isOverdue identifies overdue RTO work when expected date has passed', () => {
  const current = '2026-11-12';
  // Expected completion was 2026-11-05 and status is Pending -> Overdue
  assert.equal(isOverdue('2026-11-05', 'Pending', current), true);
  // Expected completion was 2026-11-05 but status is Completed -> Not Overdue
  assert.equal(isOverdue('2026-11-05', 'Completed', current), false);
  // Expected completion is in future 2026-11-20 -> Not Overdue
  assert.equal(isOverdue('2026-11-20', 'Processing', current), false);
});

test('generateNextId increments sequence properly', () => {
  const existing = ['CLI-1001', 'CLI-1002', 'CLI-1005'];
  assert.equal(generateNextId('CLI', existing), 'CLI-1006');
  assert.equal(generateNextId('APP', []), 'APP-1001');
});

test('isDateWithinFilter filters today, week, month accurately', () => {
  const ref = '2026-11-12';
  assert.equal(isDateWithinFilter('2026-11-12', 'today', ref), true);
  assert.equal(isDateWithinFilter('2026-11-11', 'today', ref), false);
  assert.equal(isDateWithinFilter('2026-11-10', 'week', ref), true);
  assert.equal(isDateWithinFilter('2026-11-01', 'month', ref), true);
  assert.equal(isDateWithinFilter('2026-10-15', 'month', ref), false);
});

test('formatINR formats currency in Indian numbering format', () => {
  assert.equal(formatINR(500000), '₹5,00,000');
  assert.equal(formatINR(0), '₹0');
});
