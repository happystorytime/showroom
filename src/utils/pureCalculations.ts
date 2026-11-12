/**
 * Pure calculation functions decoupled from React UI.
 * Tested via node:test and tsx.
 */

export function calculateTotalPaid(advance: number, additional: number): number {
  const adv = Number(advance) || 0;
  const add = Number(additional) || 0;
  return Math.round((adv + add) * 100) / 100;
}

export function calculateBalance(totalFees: number, totalPaid: number): number {
  const fees = Number(totalFees) || 0;
  const paid = Number(totalPaid) || 0;
  return Math.max(0, Math.round((fees - paid) * 100) / 100);
}

export function calculateExchangeDifference(newPrice: number, oldValuation: number): number {
  const price = Number(newPrice) || 0;
  const val = Number(oldValuation) || 0;
  return Math.round((price - val) * 100) / 100;
}

export function calculateNetCreditAmount(loanAmount: number, docCharges: number): number {
  const loan = Number(loanAmount) || 0;
  const charges = Number(docCharges) || 0;
  return Math.max(0, Math.round((loan - charges) * 100) / 100);
}

export function calculateNetProfit(totalIncome: number, totalExpenses: number): number {
  const inc = Number(totalIncome) || 0;
  const exp = Number(totalExpenses) || 0;
  return Math.round((inc - exp) * 100) / 100;
}

export function maskAadhaar(aadhaar: string | undefined): string {
  if (!aadhaar) return 'XXXX-XXXX-XXXX';
  const clean = aadhaar.replace(/\D/g, '');
  if (clean.length < 4) return 'XXXX-XXXX-' + clean;
  const last4 = clean.slice(-4);
  return `XXXX-XXXX-${last4}`;
}

export function formatAadhaarInput(val: string): string {
  const clean = val.replace(/\D/g, '').slice(0, 12);
  const parts: string[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    parts.push(clean.substring(i, i + 4));
  }
  return parts.join('-');
}

export function formatVehicleNumber(val: string): string {
  return val.toUpperCase().trim();
}

export function getDocumentAlertStatus(
  expiryDateStr: string | undefined,
  currentDateStr: string,
  warningDaysThreshold: number = 30
): 'expired' | 'expiring_soon' | 'valid' | 'unknown' {
  if (!expiryDateStr) return 'unknown';

  const expiry = new Date(expiryDateStr);
  const current = new Date(currentDateStr);
  
  if (isNaN(expiry.getTime()) || isNaN(current.getTime())) {
    return 'unknown';
  }

  // Set to midnight for clean comparison
  expiry.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);

  const diffMs = expiry.getTime() - current.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'expired';
  }
  if (diffDays <= warningDaysThreshold) {
    return 'expiring_soon';
  }
  return 'valid';
}

export function isOverdue(
  expectedCompletionDateStr: string | undefined,
  status: string,
  currentDateStr: string
): boolean {
  if (!expectedCompletionDateStr) return false;
  if (status === 'Completed' || status === 'Rejected') return false;

  const expected = new Date(expectedCompletionDateStr);
  const current = new Date(currentDateStr);

  if (isNaN(expected.getTime()) || isNaN(current.getTime())) return false;

  expected.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);

  return current.getTime() > expected.getTime();
}

export function generateNextId(prefix: string, existingIds: string[], startNumber: number = 1001): string {
  let highest = startNumber - 1;
  const regex = new RegExp(`^${prefix}-(\\d+)$`);
  
  for (const id of existingIds) {
    const match = id.match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > highest) {
        highest = num;
      }
    }
  }

  const nextNum = highest + 1;
  return `${prefix}-${nextNum}`;
}

export function isDateWithinFilter(
  dateStr: string | undefined,
  filter: 'all' | 'today' | 'week' | 'month' | 'year',
  referenceDateStr: string
): boolean {
  if (filter === 'all' || !dateStr) return true;

  const d = new Date(dateStr);
  const ref = new Date(referenceDateStr);
  if (isNaN(d.getTime()) || isNaN(ref.getTime())) return true;

  d.setHours(0, 0, 0, 0);
  ref.setHours(0, 0, 0, 0);

  if (filter === 'today') {
    return d.getTime() === ref.getTime();
  }

  if (filter === 'week') {
    const diffMs = ref.getTime() - d.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7;
  }

  if (filter === 'month') {
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
  }

  if (filter === 'year') {
    return d.getFullYear() === ref.getFullYear();
  }

  return true;
}

export function formatINR(val: number | undefined): string {
  if (val === undefined || isNaN(val)) return '₹0';
  return '₹' + Math.round(val).toLocaleString('en-IN');
}
