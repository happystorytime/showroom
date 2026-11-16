import test from 'node:test';
import assert from 'node:assert/strict';
import {
  showroomToRow,
  rowToShowroom,
  clientToRow,
  rowToClient,
  vehicleToRow,
  rowToVehicle,
  applicationToRow,
  rowToApplication,
  documentToRow,
  rowToDocument,
  historyToRow,
  rowToHistory,
  archiveToRow,
  rowToArchive,
  settingsToRow,
  rowToSettings,
} from './supabaseService';
import { INITIAL_SETTINGS } from './seedData';
import type {
  ApplicationHistoryEntry,
  ArchivedRecord,
  Client,
  DocumentRecord,
  RTOApplication,
  Showroom,
  Vehicle,
} from '../types';

const UID = '00000000-0000-0000-0000-000000000001';

test('Supabase showroom and centralized client/vehicle mappers round-trip accurately', () => {
  const showroom: Showroom = {
    id: 'SHW-101',
    name: 'Yeshwanthpur Tractors',
    code: 'BLR-YPR',
    city: 'Bengaluru',
    address: 'Tumkur Road',
    phone: '9845000111',
    managerName: 'Kiran',
    rtoJurisdiction: 'KA-04',
    isActive: true,
  };
  const sRow = showroomToRow(UID, showroom);
  assert.equal(sRow.owner_uid, UID);
  assert.deepEqual(rowToShowroom(sRow), showroom);

  const client: Client = {
    id: 'CLI-1001',
    createdShowroomId: 'SHW-101',
    name: 'Basavaraj Gowda',
    mobile: '9845012345',
    alternateMobile: '9900011223',
    address: 'Mandya',
    aadhaar: '123456789012',
    panNumber: 'ABCDE1234F',
    registrationDate: '2026-11-01',
    remarks: 'Common client',
    createdAt: '2026-11-01 10:00:00',
    updatedAt: '2026-11-01 10:00:00',
  };
  const cRow = clientToRow(UID, client);
  const cOut = rowToClient({ ...cRow, created_at: client.createdAt, updated_at: client.updatedAt });
  assert.equal(cOut.id, client.id);
  assert.equal(cOut.aadhaar, client.aadhaar);
  assert.equal(cOut.createdShowroomId, 'SHW-101');

  const vehicle: Vehicle = {
    id: 'VEH-1001',
    clientId: 'CLI-1001',
    vehicleNumber: 'KA-11-TR-9988',
    chassisNumber: 'CH112233',
    engineNumber: 'EN445566',
    vehicleClass: 'Agricultural Tractor',
    model: '575 DI',
    manufacturer: 'Mahindra',
    manufacturingYear: 2025,
    fuelType: 'Diesel',
    ownerName: 'Basavaraj Gowda',
    registrationDate: '2025-05-01',
    rcValidity: '2040-05-01',
    insuranceExpiry: '2027-05-01',
    hypothecationStatus: 'Hypothecated',
    hypothecationFinancer: 'SBI Agri Finance',
    rtoOffice: 'KA-11',
    documentStatus: 'Complete',
    createdAt: '2026-11-01 10:00:00',
  };
  const vRow = vehicleToRow(UID, vehicle);
  const vOut = rowToVehicle({ ...vRow, created_at: vehicle.createdAt });
  assert.equal(vOut.hypothecationFinancer, 'SBI Agri Finance');
  assert.equal(vOut.documentStatus, 'Complete');
});

test('Supabase application, document, history, archive, and settings mappers round-trip accurately', () => {
  const app: RTOApplication = {
    id: 'APP-1001',
    showroomId: 'SHW-101',
    clientId: 'CLI-1001',
    vehicleId: 'VEH-1001',
    clientName: 'Basavaraj Gowda',
    vehicleNumber: 'KA-11-TR-9988',
    workType: 'Ownership Transfer',
    applicationNumber: 'KA11-2026-001',
    rtoOffice: 'KA-11',
    applicationDate: '2026-11-10',
    submissionDate: '2026-11-11',
    expectedCompletionDate: '2026-11-20',
    requiredDocuments: ['RC Book', 'Form 29', 'Form 30'],
    workStatus: 'In Process',
    workDescription: 'Seller to buyer transfer',
    remarks: 'Priority',
    createdAt: '2026-11-10 09:00:00',
    updatedAt: '2026-11-11 09:00:00',
  };
  const aRow = applicationToRow(UID, app);
  const aOut = rowToApplication({ ...aRow, created_at: app.createdAt, updated_at: app.updatedAt });
  assert.deepEqual(aOut.requiredDocuments, ['RC Book', 'Form 29', 'Form 30']);
  assert.equal(aOut.workDescription, 'Seller to buyer transfer');

  const docRec: DocumentRecord = {
    id: 'DOC-1001',
    showroomId: 'SHW-101',
    clientId: 'CLI-1001',
    vehicleId: 'VEH-1001',
    applicationId: 'APP-1001',
    vehicleNumber: 'KA-11-TR-9988',
    clientName: 'Basavaraj Gowda',
    documentType: 'RC Book',
    documentNumber: 'RC-9988',
    issueDate: '2025-05-01',
    expiryDate: '2040-05-01',
    receivedStatus: 'Received',
    verificationStatus: 'Verified',
    fileName: 'rc.pdf',
    fileSize: 12345,
    mimeType: 'application/pdf',
    storagePath: `users/${UID}/documents/DOC-1001_rc.pdf`,
    downloadUrl: 'https://example.supabase.co/storage/v1/object/sign/rto-documents/rc.pdf',
    filePathOrReference: 'rc.pdf',
    uploadedAt: '2026-11-10T09:00:00.000Z',
    remarks: 'Original scanned',
    createdAt: '2026-11-10 09:00:00',
  };
  const dRow = documentToRow(UID, docRec);
  const dOut = rowToDocument({ ...dRow, created_at: docRec.createdAt });
  assert.equal(dOut.storagePath, docRec.storagePath);
  assert.equal(dOut.verificationStatus, 'Verified');

  const hist: ApplicationHistoryEntry = {
    id: 'HIS-1001',
    applicationId: 'APP-1001',
    showroomId: 'SHW-101',
    clientId: 'CLI-1001',
    vehicleId: 'VEH-1001',
    previousStatus: 'New',
    newStatus: 'In Process',
    actionSummary: 'Status: New -> In Process',
    note: 'Submitted to KA-11',
    actorEmail: 'agent@rto.in',
    changedAt: '2026-11-11T09:00:00.000Z',
  };
  assert.deepEqual(rowToHistory(historyToRow(UID, hist)), hist);

  const arc: ArchivedRecord = {
    archiveId: 'ARC-1001',
    showroomId: 'SHW-101',
    entityType: 'Client',
    entityId: 'CLI-1001',
    summary: 'Basavaraj Gowda',
    data: { id: 'CLI-1001' },
    deletedAt: '2026-11-15 10:00:00',
    deletedBy: 'agent@rto.in',
  };
  assert.deepEqual(rowToArchive(archiveToRow(UID, arc)), arc);

  const sOut = rowToSettings(settingsToRow(UID, INITIAL_SETTINGS));
  assert.equal(sOut.businessName, INITIAL_SETTINGS.businessName);
  assert.deepEqual(sOut.documentChecklistMap, INITIAL_SETTINGS.documentChecklistMap);
});
