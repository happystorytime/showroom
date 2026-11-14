import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTodayDateStr,
  maskAadhaar,
  maskPAN,
  getDocumentAlertStatus,
  isOverdue,
  generateNextId,
  isDateWithinFilter,
  isDateWithinRange,
  filterByShowroom,
  findDuplicateClient,
  evaluateApplicationChecklist,
  computeShowroomRtoSummary,
  validateUploadFile,
  runGlobalSearch,
  checkShowroomDeletionSafety,
  classifyAuthError,
} from './pureCalculations';
import type { Client, DocumentRecord, RTOApplication, Showroom, Vehicle } from '../types';

test('getTodayDateStr formats YYYY-MM-DD consistently from local date', () => {
  const d = new Date(2026, 10, 14); // Nov 14, 2026
  assert.equal(getTodayDateStr(d), '2026-11-14');
});

test('maskAadhaar and maskPAN mask sensitive identifiers', () => {
  assert.equal(maskAadhaar('123456789012'), 'XXXX-XXXX-9012');
  assert.equal(maskAadhaar(''), '—');
  assert.equal(maskPAN('ABCDE1234F'), 'ABXXXXX34F');
  assert.equal(maskPAN(''), '—');
});

test('getDocumentAlertStatus detects expired, expiring soon, and valid', () => {
  const current = '2026-11-14';
  assert.equal(getDocumentAlertStatus('2026-11-10', current), 'expired');
  assert.equal(getDocumentAlertStatus('2026-11-27', current), 'expiring_soon');
  assert.equal(getDocumentAlertStatus('2027-05-12', current), 'valid');
});

test('isOverdue identifies overdue RTO work and ignores Completed/Rejected', () => {
  const current = '2026-11-14';
  assert.equal(isOverdue('2026-11-05', 'In Process', current), true);
  assert.equal(isOverdue('2026-11-05', 'Completed', current), false);
  assert.equal(isOverdue('2026-11-05', 'Rejected', current), false);
  assert.equal(isOverdue('2026-11-20', 'Submitted', current), false);
});

test('generateNextId increments sequence properly', () => {
  assert.equal(generateNextId('CLI', ['CLI-1001', 'CLI-1005']), 'CLI-1006');
  assert.equal(generateNextId('APP', []), 'APP-1001');
  assert.equal(generateNextId('SHW', ['SHW-101', 'SHW-102'], 101), 'SHW-103');
});

test('isDateWithinFilter & isDateWithinRange filter accurately', () => {
  const ref = '2026-11-14';
  assert.equal(isDateWithinFilter('2026-11-14', 'today', ref), true);
  assert.equal(isDateWithinFilter('2026-11-13', 'today', ref), false);
  assert.equal(isDateWithinFilter('2026-11-10', 'week', ref), true);
  assert.equal(isDateWithinFilter('2026-11-01', 'month', ref), true);
  assert.equal(isDateWithinFilter('2026-10-15', 'month', ref), false);
  assert.equal(isDateWithinRange('2026-11-10', '2026-11-01', '2026-11-15'), true);
  assert.equal(isDateWithinRange('2026-10-29', '2026-11-01', '2026-11-15'), false);
});

test('findDuplicateClient detects existing client by mobile, Aadhaar, or PAN across showrooms', () => {
  const clients: Client[] = [
    {
      id: 'CLI-1001',
      name: 'Basavaraj Gowda',
      mobile: '9845011223',
      alternateMobile: '9448099887',
      address: 'Tumakuru',
      aadhaar: '1234-5678-9012',
      panNumber: 'ABCDE1234F',
      registrationDate: '2026-11-01',
      remarks: '',
      createdAt: '',
      updatedAt: '',
    },
  ];

  const byMob = findDuplicateClient(clients, { mobile: '9845011223' });
  assert.equal(byMob?.matchedBy, 'mobile');
  assert.equal(byMob?.client.id, 'CLI-1001');

  const byAlt = findDuplicateClient(clients, { mobile: '9448099887' });
  assert.equal(byAlt?.matchedBy, 'mobile');

  const byAadhaar = findDuplicateClient(clients, { mobile: '9999988888', aadhaar: '123456789012' });
  assert.equal(byAadhaar?.matchedBy, 'aadhaar');

  const byPan = findDuplicateClient(clients, { mobile: '9999988888', panNumber: 'abcde1234f' });
  assert.equal(byPan?.matchedBy, 'pan');

  // Excludes self when editing
  const selfEdit = findDuplicateClient(clients, { mobile: '9845011223', excludeId: 'CLI-1001' });
  assert.equal(selfEdit, null);
});

test('evaluateApplicationChecklist tracks missing, pending verification, and complete documents', () => {
  const app: RTOApplication = {
    id: 'APP-1001',
    showroomId: 'SHW-101',
    clientId: 'CLI-1001',
    vehicleId: 'VEH-1001',
    clientName: 'Test Client',
    vehicleNumber: 'KA-04-AB-1234',
    workType: 'Ownership Transfer',
    applicationNumber: 'ACK-1',
    rtoOffice: 'KA-04',
    applicationDate: '2026-11-14',
    submissionDate: '2026-11-14',
    expectedCompletionDate: '2026-11-24',
    requiredDocuments: ['RC Book', 'Aadhaar Card', 'Insurance', 'Form 29', 'Form 30'],
    workStatus: 'Documents Pending',
    remarks: '',
    createdAt: '',
    updatedAt: '',
  };

  const docsPartial: DocumentRecord[] = [
    {
      id: 'DOC-1001',
      showroomId: 'SHW-101',
      clientId: 'CLI-1001',
      vehicleId: 'VEH-1001',
      vehicleNumber: 'KA-04-AB-1234',
      clientName: 'Test Client',
      documentType: 'RC Book',
      documentNumber: 'RC1',
      issueDate: '2020-01-01',
      expiryDate: '2035-01-01',
      receivedStatus: 'Received',
      verificationStatus: 'Verified',
      filePathOrReference: 'rc.pdf',
      remarks: '',
      createdAt: '',
    },
    {
      id: 'DOC-1002',
      showroomId: 'SHW-101',
      clientId: 'CLI-1001',
      vehicleId: 'VEH-9999',
      vehicleNumber: '',
      clientName: 'Test Client',
      documentType: 'Aadhaar Card',
      documentNumber: 'ADH1',
      issueDate: '',
      expiryDate: '',
      receivedStatus: 'Received',
      verificationStatus: 'Pending',
      filePathOrReference: 'aadhaar.jpg',
      remarks: '',
      createdAt: '',
    },
  ];

  const eval1 = evaluateApplicationChecklist(app, docsPartial);
  assert.equal(eval1.status, 'Documents Incomplete');
  assert.deepEqual(eval1.uploaded, ['RC Book', 'Aadhaar Card']);
  assert.deepEqual(eval1.missing, ['Insurance', 'Form 29', 'Form 30']);

  // Upload remaining docs with Pending verification
  const docsUnderVerif: DocumentRecord[] = [
    ...docsPartial,
    ...(['Insurance', 'Form 29', 'Form 30'] as const).map((t, idx) => ({
      id: `DOC-100${idx + 3}`,
      showroomId: 'SHW-101',
      clientId: 'CLI-1001',
      vehicleId: 'VEH-1001',
      vehicleNumber: 'KA-04-AB-1234',
      clientName: 'Test Client',
      documentType: t,
      documentNumber: '',
      issueDate: '',
      expiryDate: '',
      receivedStatus: 'Received' as const,
      verificationStatus: 'Pending' as const,
      filePathOrReference: `${t}.pdf`,
      remarks: '',
      createdAt: '',
    })),
  ];

  const eval2 = evaluateApplicationChecklist(app, docsUnderVerif);
  assert.equal(eval2.status, 'Documents Under Verification');
  assert.equal(eval2.missing.length, 0);
  assert.equal(eval2.completionPercent, 100);

  // Mark all verified
  const allVerified = docsUnderVerif.map((d) => ({ ...d, verificationStatus: 'Verified' as const }));
  const eval3 = evaluateApplicationChecklist(app, allVerified);
  assert.equal(eval3.status, 'Documents Complete');
});

test('computeShowroomRtoSummary isolates RTO work counts per showroom with zero finance metrics', () => {
  const showrooms: Showroom[] = [
    {
      id: 'SHW-101',
      name: 'Yeshwanthpur',
      code: 'BLR-YPR',
      city: 'Bengaluru',
      address: '',
      phone: '',
      managerName: '',
      rtoJurisdiction: 'KA-04',
      isActive: true,
    },
    {
      id: 'SHW-102',
      name: 'Hubballi',
      code: 'HBL-NTH',
      city: 'Hubballi',
      address: '',
      phone: '',
      managerName: '',
      rtoJurisdiction: 'KA-25',
      isActive: true,
    },
  ];

  const applications: RTOApplication[] = [
    {
      id: 'APP-1001',
      showroomId: 'SHW-101',
      clientId: 'CLI-1001',
      vehicleId: 'VEH-1001',
      clientName: 'Ramesh',
      vehicleNumber: 'KA-04-AA-1111',
      workType: 'RC Renewal',
      applicationNumber: 'A1',
      rtoOffice: 'KA-04',
      applicationDate: '2026-11-14',
      submissionDate: '2026-11-14',
      expectedCompletionDate: '2026-11-20',
      requiredDocuments: ['RC Book'],
      workStatus: 'Completed',
      remarks: '',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'APP-1002',
      showroomId: 'SHW-102',
      clientId: 'CLI-1001', // Same common client served at Showroom 2!
      vehicleId: 'VEH-1002',
      clientName: 'Ramesh',
      vehicleNumber: 'KA-25-BB-2222',
      workType: 'Ownership Transfer',
      applicationNumber: 'A2',
      rtoOffice: 'KA-25',
      applicationDate: '2026-11-14',
      submissionDate: '',
      expectedCompletionDate: '2026-11-22',
      requiredDocuments: ['RC Book', 'Form 29'],
      workStatus: 'Documents Pending',
      remarks: '',
      createdAt: '',
      updatedAt: '',
    },
  ];

  const summary = computeShowroomRtoSummary(showrooms, { applications, documents: [] }, '2026-11-14');
  assert.equal(summary.length, 2);
  assert.equal(summary[0].completedCount, 1);
  assert.equal(summary[0].submittedTodayCount, 1);
  assert.equal(summary[1].uniqueClientsCount, 1);
  assert.equal(summary[1].newAndPendingCount, 1);
  assert.equal(summary[1].missingDocsAppsCount, 1);
});

test('validateUploadFile accepts PDF/JPG/JPEG/PNG under 10MB and rejects others', () => {
  assert.equal(validateUploadFile({ name: 'rc.pdf', size: 1024, type: 'application/pdf' }).valid, true);
  assert.equal(validateUploadFile({ name: 'photo.JPEG', size: 2048, type: 'image/jpeg' }).valid, true);
  assert.equal(validateUploadFile({ name: 'scan.png', size: 500, type: 'image/png' }).valid, true);
  assert.equal(validateUploadFile({ name: 'script.exe', size: 500, type: 'application/octet-stream' }).valid, false);
  assert.equal(validateUploadFile({ name: 'huge.pdf', size: 15 * 1024 * 1024, type: 'application/pdf' }).valid, false);
});

test('runGlobalSearch matches clients by vehicle registration number across databases', () => {
  const clients: Client[] = [
    {
      id: 'CLI-1001',
      name: 'Mahesh Patil',
      mobile: '9845011223',
      alternateMobile: '',
      address: 'Hubballi',
      registrationDate: '2026-11-01',
      remarks: '',
      createdAt: '',
      updatedAt: '',
    },
  ];
  const vehicles: Vehicle[] = [
    {
      id: 'VEH-1001',
      clientId: 'CLI-1001',
      vehicleNumber: 'KA-25-TR-4455',
      chassisNumber: 'CH998877',
      engineNumber: 'ENG1122',
      vehicleClass: 'Agricultural Tractor',
      model: '575 DI',
      manufacturer: 'Mahindra',
      manufacturingYear: 2024,
      fuelType: 'Diesel',
      ownerName: 'Mahesh Patil',
      registrationDate: '2024-05-01',
      rcValidity: '2039-05-01',
      insuranceExpiry: '2027-05-01',
      hypothecationStatus: 'None',
      rtoOffice: 'KA-25',
      documentStatus: 'Complete',
      createdAt: '',
    },
  ];
  const res = runGlobalSearch('KA-25-TR-4455', { clients, vehicles, applications: [] });
  assert.equal(res.vehicles.length, 1);
  assert.equal(res.clients.length, 1);
  assert.equal(res.clients[0].id, 'CLI-1001');
});

test('checkShowroomDeletionSafety protects showrooms with linked applications or last remaining showroom', () => {
  const showrooms: Showroom[] = [
    { id: 'SHW-101', name: 'S1', code: 'S1', city: 'BLR', address: '', phone: '', managerName: '', rtoJurisdiction: '', isActive: true },
    { id: 'SHW-102', name: 'S2', code: 'S2', city: 'MYS', address: '', phone: '', managerName: '', rtoJurisdiction: '', isActive: true },
  ];
  const apps = [{ id: 'APP-1', showroomId: 'SHW-102' } as RTOApplication];

  assert.equal(checkShowroomDeletionSafety('SHW-102', { showrooms, applications: apps, documents: [] }).allowed, false);
  assert.equal(checkShowroomDeletionSafety('SHW-101', { showrooms, applications: apps, documents: [] }).allowed, true);
  assert.equal(checkShowroomDeletionSafety('SHW-101', { showrooms: [showrooms[0]], applications: [], documents: [] }).allowed, false);
});

test('filterByShowroom returns all items for ALL and filters by showroomId otherwise', () => {
  const items = [
    { id: '1', showroomId: 'SHW-101' },
    { id: '2', showroomId: 'SHW-102' },
  ];
  assert.equal(filterByShowroom(items, 'ALL').length, 2);
  assert.deepEqual(filterByShowroom(items, 'SHW-102').map((x) => x.id), ['2']);
});

test('classifyAuthError suppresses console.error on user-cancelled popups and formats domain/blocked errors', () => {
  const closed = classifyAuthError({ code: 'auth/popup-closed-by-user', message: 'Firebase: Error (auth/popup-closed-by-user).' });
  assert.equal(closed.isUserCancelled, true);
  assert.equal(closed.shouldLogConsoleError, false);
  assert.match(closed.message, /popup was closed/i);

  const cancelled = classifyAuthError({ code: 'auth/cancelled-popup-request' });
  assert.equal(cancelled.isUserCancelled, true);
  assert.equal(cancelled.shouldLogConsoleError, false);

  const blocked = classifyAuthError({ code: 'auth/popup-blocked' });
  assert.equal(blocked.isUserCancelled, false);
  assert.equal(blocked.shouldLogConsoleError, false);
  assert.match(blocked.message, /allow popups/i);

  const domain = classifyAuthError({ code: 'auth/unauthorized-domain' }, 'example.run.app');
  assert.equal(domain.isUserCancelled, false);
  assert.equal(domain.shouldLogConsoleError, true);
  assert.match(domain.message, /example\.run\.app/);
});

