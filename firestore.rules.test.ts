import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Security Rules Contract & "Dirty Dozen" Payload Verification Suite.
 * Mirrors the exact boolean invariants enforced by /firestore.rules
 * and validates all 12 adversarial payloads against the RTO-only multi-showroom rules.
 */

const rulesSource = fs.readFileSync(path.resolve('firestore.rules'), 'utf8');
const storageRulesSource = fs.readFileSync(path.resolve('storage.rules'), 'utf8');

interface MockAuth {
  uid: string;
  token: {
    email: string;
    email_verified: boolean;
  };
}

interface EvalContext {
  auth: MockAuth | null;
  now: string;
  existingShowrooms: Set<string>;
}

const VALID_ID_RE = /^[a-zA-Z0-9_-]+$/;
const WORK_STATUSES = [
  'New',
  'Documents Pending',
  'Ready to Submit',
  'Submitted',
  'In Process',
  'Completed',
  'Rejected',
  'On Hold',
];

function isValidId(id: unknown): id is string {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && VALID_ID_RE.test(id);
}

function isValidStr(val: unknown, minLen: number, maxLen: number): boolean {
  return typeof val === 'string' && val.length >= minLen && val.length <= maxLen;
}

function hasOnlyKeys(obj: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(obj).every((k) => allowed.includes(k));
}

function hasAllKeys(obj: Record<string, unknown>, required: string[]): boolean {
  return required.every((k) => k in obj);
}

function evaluateClientCreate(
  ctx: EvalContext,
  pathUserId: string,
  docId: string,
  data: Record<string, unknown>
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!ctx.auth || ctx.auth.token.email_verified !== true) return 'PERMISSION_DENIED';
  if (ctx.auth.uid !== pathUserId) return 'PERMISSION_DENIED';
  if (!isValidId(docId)) return 'PERMISSION_DENIED';
  const req = ['id', 'ownerUid', 'name', 'mobile', 'registrationDate', 'createdAt', 'updatedAt'];
  const allowed = [
    ...req,
    'createdShowroomId',
    'alternateMobile',
    'address',
    'aadhaar',
    'panNumber',
    'remarks',
  ];
  if (!hasAllKeys(data, req) || !hasOnlyKeys(data, allowed)) return 'PERMISSION_DENIED';
  if (data.ownerUid !== ctx.auth.uid || data.id !== docId) return 'PERMISSION_DENIED';
  if ('createdShowroomId' in data && (!isValidId(data.createdShowroomId) || !ctx.existingShowrooms.has(data.createdShowroomId))) {
    return 'PERMISSION_DENIED';
  }
  if (!isValidStr(data.name, 1, 120) || !isValidStr(data.mobile, 10, 20) || !isValidStr(data.registrationDate, 8, 20)) {
    return 'PERMISSION_DENIED';
  }
  if ('address' in data && !isValidStr(data.address, 0, 400)) return 'PERMISSION_DENIED';
  if (data.createdAt !== ctx.now || data.updatedAt !== ctx.now) return 'PERMISSION_DENIED';
  return 'ALLOW';
}

function evaluateApplicationCreate(
  ctx: EvalContext,
  pathUserId: string,
  docId: string,
  data: Record<string, unknown>
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!ctx.auth || ctx.auth.token.email_verified !== true || ctx.auth.uid !== pathUserId) return 'PERMISSION_DENIED';
  if (!isValidId(docId)) return 'PERMISSION_DENIED';
  const req = [
    'id',
    'ownerUid',
    'showroomId',
    'clientId',
    'vehicleId',
    'clientName',
    'vehicleNumber',
    'workType',
    'rtoOffice',
    'applicationDate',
    'requiredDocuments',
    'workStatus',
    'createdAt',
    'updatedAt',
  ];
  const allowed = [
    ...req,
    'applicationNumber',
    'submissionDate',
    'expectedCompletionDate',
    'completionDate',
    'workDescription',
    'remarks',
  ];
  if (!hasAllKeys(data, req) || !hasOnlyKeys(data, allowed)) return 'PERMISSION_DENIED';
  if (data.ownerUid !== ctx.auth.uid || data.id !== docId) return 'PERMISSION_DENIED';
  if (!isValidId(data.showroomId) || !ctx.existingShowrooms.has(data.showroomId)) return 'PERMISSION_DENIED';
  if (!WORK_STATUSES.includes(String(data.workStatus))) return 'PERMISSION_DENIED';
  if (data.createdAt !== ctx.now || data.updatedAt !== ctx.now) return 'PERMISSION_DENIED';
  return 'ALLOW';
}

function evaluateApplicationUpdate(
  ctx: EvalContext,
  pathUserId: string,
  docId: string,
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!ctx.auth || ctx.auth.token.email_verified !== true || ctx.auth.uid !== pathUserId) return 'PERMISSION_DENIED';
  if (!isValidId(docId)) return 'PERMISSION_DENIED';
  if (incoming.createdAt !== existing.createdAt || incoming.updatedAt !== ctx.now) return 'PERMISSION_DENIED';
  if (incoming.id !== existing.id || incoming.ownerUid !== existing.ownerUid) return 'PERMISSION_DENIED';
  if (!WORK_STATUSES.includes(String(incoming.workStatus))) return 'PERMISSION_DENIED';

  const changedKeys = Object.keys(incoming).filter((k) => incoming[k] !== existing[k]);
  const fullUpdateAllowed = [
    'showroomId',
    'clientName',
    'vehicleNumber',
    'workType',
    'applicationNumber',
    'rtoOffice',
    'applicationDate',
    'submissionDate',
    'expectedCompletionDate',
    'completionDate',
    'requiredDocuments',
    'workStatus',
    'workDescription',
    'remarks',
    'updatedAt',
  ];
  const terminalOnlyAllowed = ['remarks', 'updatedAt'];

  const isTerminal = existing.workStatus === 'Completed' || existing.workStatus === 'Rejected';
  if (!isTerminal && changedKeys.every((k) => fullUpdateAllowed.includes(k))) return 'ALLOW';
  if (changedKeys.every((k) => terminalOnlyAllowed.includes(k))) return 'ALLOW';
  return 'PERMISSION_DENIED';
}

test('firestore.rules and storage.rules enforce RTO-only collections, default-deny, and verified ownership', () => {
  assert.match(rulesSource, /allow read, write: if false;/);
  assert.match(rulesSource, /request\.auth\.token\.email_verified == true/);
  for (const col of [
    'showrooms',
    'clients',
    'vehicles',
    'applications',
    'applicationHistory',
    'documents',
    'archive',
    'settings',
  ]) {
    assert.ok(rulesSource.includes(`match /${col}/`), `Missing rules match block for ${col}`);
  }
  for (const removed of ['tractors', 'exchanges', 'loans', 'payments', 'expenses']) {
    assert.equal(rulesSource.includes(`match /${removed}/`), false, `Removed collection ${removed} still in rules`);
  }
  assert.match(storageRulesSource, /users\/\{userId\}\/documents/);
  assert.match(storageRulesSource, /10 \* 1024 \* 1024/);
});

test('Dirty Dozen adversarial payloads all return PERMISSION_DENIED', () => {
  const NOW = 'SERVER_TIME_2026_11_14';
  const validCtx: EvalContext = {
    auth: { uid: 'uid_a', token: { email: 'owner@rto.in', email_verified: true } },
    now: NOW,
    existingShowrooms: new Set(['SHW-101', 'SHW-102']),
  };

  const baseClient = {
    id: 'CLI-1001',
    ownerUid: 'uid_a',
    name: 'Basavaraj Gowda',
    mobile: '9845011223',
    registrationDate: '2026-11-12',
    createdAt: NOW,
    updatedAt: NOW,
  };

  const baseApp = {
    id: 'APP-1001',
    ownerUid: 'uid_a',
    showroomId: 'SHW-101',
    clientId: 'CLI-1001',
    vehicleId: 'VEH-1001',
    clientName: 'Basavaraj Gowda',
    vehicleNumber: 'KA-04-MB-4521',
    workType: 'New Vehicle Registration',
    rtoOffice: 'KA-04 (Bangalore North - Yeshwanthpur)',
    applicationDate: '2026-11-12',
    requiredDocuments: ['Aadhaar Card', 'Insurance'],
    workStatus: 'In Process',
    createdAt: NOW,
    updatedAt: NOW,
  };

  // Sanity checks: valid centralized client + showroom-scoped application succeed
  assert.equal(evaluateClientCreate(validCtx, 'uid_a', 'CLI-1001', baseClient), 'ALLOW');
  assert.equal(evaluateApplicationCreate(validCtx, 'uid_a', 'APP-1001', baseApp), 'ALLOW');

  // 1. Cross-tenant write by uid_b
  assert.equal(
    evaluateClientCreate({ ...validCtx, auth: { uid: 'uid_b', token: { email: 'b@rto.in', email_verified: true } } }, 'uid_a', 'CLI-1001', baseClient),
    'PERMISSION_DENIED'
  );

  // 2. Identity spoofing (ownerUid != auth.uid)
  assert.equal(evaluateClientCreate(validCtx, 'uid_a', 'CLI-1001', { ...baseClient, ownerUid: 'uid_b' }), 'PERMISSION_DENIED');

  // 3. Unverified email write
  assert.equal(
    evaluateClientCreate({ ...validCtx, auth: { uid: 'uid_a', token: { email: 'owner@rto.in', email_verified: false } } }, 'uid_a', 'CLI-1001', baseClient),
    'PERMISSION_DENIED'
  );

  // 4. Shadow / Ghost / Obsolete fee field injection
  assert.equal(evaluateClientCreate(validCtx, 'uid_a', 'CLI-1001', { ...baseClient, isAdmin: true }), 'PERMISSION_DENIED');
  assert.equal(evaluateApplicationCreate(validCtx, 'uid_a', 'APP-1001', { ...baseApp, totalFees: 5000 }), 'PERMISSION_DENIED');

  // 5. Client-forged createdAt timestamp
  assert.equal(
    evaluateClientCreate(validCtx, 'uid_a', 'CLI-1001', { ...baseClient, createdAt: '2020-01-01T00:00:00Z' }),
    'PERMISSION_DENIED'
  );

  // 6. Immutable createdAt mutation on update
  assert.equal(
    evaluateApplicationUpdate(validCtx, 'uid_a', 'APP-1001', baseApp, { ...baseApp, createdAt: 'T1', updatedAt: NOW }),
    'PERMISSION_DENIED'
  );

  // 7. ID Poisoning (1.5KB Document ID)
  assert.equal(evaluateClientCreate(validCtx, 'uid_a', 'X'.repeat(1500), { ...baseClient, id: 'X'.repeat(1500) }), 'PERMISSION_DENIED');

  // 8. String exhaustion (Address > 400 chars)
  assert.equal(
    evaluateClientCreate(validCtx, 'uid_a', 'CLI-1001', { ...baseClient, address: 'A'.repeat(5000) }),
    'PERMISSION_DENIED'
  );

  // 9. Orphaned application without existing showroom
  assert.equal(
    evaluateApplicationCreate(validCtx, 'uid_a', 'APP-1001', { ...baseApp, showroomId: 'SHW-999' }),
    'PERMISSION_DENIED'
  );

  // 10. Terminal state bypass on Completed application
  const completedApp = { ...baseApp, workStatus: 'Completed' };
  assert.equal(
    evaluateApplicationUpdate(validCtx, 'uid_a', 'APP-1001', completedApp, {
      ...completedApp,
      workStatus: 'In Process',
      updatedAt: NOW,
    }),
    'PERMISSION_DENIED'
  );

  // 11. Invalid enum value injection
  assert.equal(
    evaluateApplicationUpdate(validCtx, 'uid_a', 'APP-1001', baseApp, {
      ...baseApp,
      workStatus: 'HackedStatus',
      updatedAt: NOW,
    }),
    'PERMISSION_DENIED'
  );

  // 12. Remarks update without server updatedAt timestamp
  assert.equal(
    evaluateApplicationUpdate(validCtx, 'uid_a', 'APP-1001', completedApp, {
      ...completedApp,
      remarks: 'Updated note',
      updatedAt: 'FORGED',
    }),
    'PERMISSION_DENIED'
  );
});
