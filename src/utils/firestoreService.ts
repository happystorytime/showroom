import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { auth, firestoreDb } from './auth';
import type { AppDatabase } from './storage';
import { INITIAL_SETTINGS } from './seedData';
import type {
  ApplicationHistoryEntry,
  ArchivedRecord,
  Client,
  DocumentCategory,
  DocumentRecord,
  RTOApplication,
  Showroom,
  SystemSettings,
  Vehicle,
  WorkStatus,
} from '../types';
import { DOCUMENT_CATEGORIES } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

// ---------------------------------------------------------------------------
// Defensive Payload Sanitization & Blueprint Size Clamping
// ---------------------------------------------------------------------------
function clampStr(val: string | undefined | null, maxLen: number): string {
  return String(val ?? '').trim().slice(0, maxLen);
}

function clampOptionalStr(val: string | undefined | null, maxLen: number): string | undefined {
  if (val === undefined || val === null) return undefined;
  const trimmed = String(val).trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLen);
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) {
      out[k] = v;
    }
  }
  return out;
}

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString().replace('T', ' ').substring(0, 19);
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

export function sanitizeShowroomPayload(uid: string, s: Showroom, isUpdate = false): Record<string, unknown> {
  const base = stripUndefined({
    id: clampStr(s.id, 64),
    ownerUid: uid,
    name: clampStr(s.name, 120) || 'Showroom Branch',
    code: clampStr(s.code, 20) || 'BRN',
    city: clampStr(s.city, 80) || 'Bengaluru',
    address: clampOptionalStr(s.address, 300),
    phone: clampOptionalStr(s.phone, 25),
    managerName: clampOptionalStr(s.managerName, 80),
    rtoJurisdiction: clampOptionalStr(s.rtoJurisdiction, 120),
    isActive: Boolean(s.isActive),
    updatedAt: serverTimestamp(),
  });
  if (!isUpdate) {
    base.createdAt = serverTimestamp();
  }
  return base;
}

export function sanitizeClientPayload(uid: string, c: Client, isUpdate = false): Record<string, unknown> {
  const mobileDigits = clampStr(c.mobile, 20);
  const safeMobile = mobileDigits.length >= 10 ? mobileDigits : mobileDigits.padEnd(10, '0');
  const safeRegDate = clampStr(c.registrationDate, 20);
  const base = stripUndefined({
    id: clampStr(c.id, 64),
    ownerUid: uid,
    createdShowroomId: clampOptionalStr(c.createdShowroomId, 64),
    name: clampStr(c.name, 120) || 'Client',
    mobile: safeMobile,
    alternateMobile: clampOptionalStr(c.alternateMobile, 20),
    address: clampOptionalStr(c.address, 400),
    aadhaar: clampOptionalStr(c.aadhaar, 20),
    panNumber: clampOptionalStr(c.panNumber?.toUpperCase(), 20),
    registrationDate: safeRegDate.length >= 8 ? safeRegDate : new Date().toISOString().split('T')[0],
    remarks: clampOptionalStr(c.remarks, 500),
    updatedAt: serverTimestamp(),
  });
  if (!isUpdate) {
    base.createdAt = serverTimestamp();
  }
  return base;
}

export function sanitizeVehiclePayload(uid: string, v: Vehicle, isUpdate = false): Record<string, unknown> {
  const base = stripUndefined({
    id: clampStr(v.id, 64),
    ownerUid: uid,
    clientId: clampStr(v.clientId, 64),
    vehicleNumber: clampStr(v.vehicleNumber, 40) || 'KA-00-0000',
    chassisNumber: clampOptionalStr(v.chassisNumber, 60),
    engineNumber: clampOptionalStr(v.engineNumber, 60),
    vehicleClass: clampStr(v.vehicleClass, 60) || 'Agricultural Tractor',
    model: clampOptionalStr(v.model, 80),
    manufacturer: clampOptionalStr(v.manufacturer, 60),
    manufacturingYear: Number(v.manufacturingYear) || new Date().getFullYear(),
    fuelType: v.fuelType || 'Diesel',
    ownerName: clampStr(v.ownerName, 120) || 'Owner',
    registrationDate: clampOptionalStr(v.registrationDate, 20),
    rcValidity: clampOptionalStr(v.rcValidity, 20),
    insuranceExpiry: clampOptionalStr(v.insuranceExpiry, 20),
    hypothecationStatus: v.hypothecationStatus || 'None',
    hypothecationFinancer: clampOptionalStr(v.hypothecationFinancer, 100),
    rtoOffice: clampStr(v.rtoOffice, 120) || 'KA-04 (Bangalore North - Yeshwanthpur)',
    documentStatus: v.documentStatus || 'Complete',
    updatedAt: serverTimestamp(),
  });
  if (!isUpdate) {
    base.createdAt = serverTimestamp();
  }
  return base;
}

export function sanitizeApplicationPayload(
  uid: string,
  a: RTOApplication,
  isUpdate = false
): Record<string, unknown> {
  const safeAppDate = clampStr(a.applicationDate, 20);
  const cleanRequiredDocs = (a.requiredDocuments || [])
    .filter((d): d is DocumentCategory => (DOCUMENT_CATEGORIES as readonly string[]).includes(d))
    .slice(0, 15);

  const base = stripUndefined({
    id: clampStr(a.id, 64),
    ownerUid: uid,
    showroomId: clampStr(a.showroomId, 64) || 'SHW-101',
    clientId: clampStr(a.clientId, 64),
    vehicleId: clampStr(a.vehicleId, 64),
    clientName: clampStr(a.clientName, 120) || 'Client',
    vehicleNumber: clampStr(a.vehicleNumber, 40) || 'KA-00-0000',
    workType: clampStr(a.workType, 80) || 'Other RTO Work',
    applicationNumber: clampOptionalStr(a.applicationNumber, 80),
    rtoOffice: clampStr(a.rtoOffice, 120) || 'KA-04 (Bangalore North - Yeshwanthpur)',
    applicationDate: safeAppDate.length >= 8 ? safeAppDate : new Date().toISOString().split('T')[0],
    submissionDate: clampOptionalStr(a.submissionDate, 20),
    expectedCompletionDate: clampOptionalStr(a.expectedCompletionDate, 20),
    completionDate: clampOptionalStr(a.completionDate, 20),
    requiredDocuments: cleanRequiredDocs,
    workStatus: a.workStatus || 'New',
    workDescription: clampOptionalStr(a.workDescription, 500),
    remarks: clampOptionalStr(a.remarks, 500),
    updatedAt: serverTimestamp(),
  });
  if (!isUpdate) {
    base.createdAt = serverTimestamp();
  }
  return base;
}

export function sanitizeApplicationHistoryPayload(
  uid: string,
  h: ApplicationHistoryEntry
): Record<string, unknown> {
  return stripUndefined({
    id: clampStr(h.id, 64),
    ownerUid: uid,
    applicationId: clampStr(h.applicationId, 64),
    showroomId: clampStr(h.showroomId, 64) || 'SHW-101',
    clientId: clampStr(h.clientId, 64),
    vehicleId: clampStr(h.vehicleId, 64),
    previousStatus: clampOptionalStr(h.previousStatus, 40),
    newStatus: clampStr(h.newStatus, 40),
    actionSummary: clampStr(h.actionSummary, 200) || 'Status Updated',
    note: clampOptionalStr(h.note, 500),
    actorEmail: clampStr(h.actorEmail, 150) || 'agent@rto.local',
    changedAt: clampStr(h.changedAt, 40) || new Date().toISOString(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function sanitizeDocumentPayload(uid: string, d: DocumentRecord, isUpdate = false): Record<string, unknown> {
  const base = stripUndefined({
    id: clampStr(d.id, 64),
    ownerUid: uid,
    showroomId: clampStr(d.showroomId, 64) || 'SHW-101',
    clientId: clampStr(d.clientId, 64),
    vehicleId: clampStr(d.vehicleId, 64),
    applicationId: clampOptionalStr(d.applicationId, 64),
    vehicleNumber: clampStr(d.vehicleNumber, 40) || 'KA-00-0000',
    clientName: clampStr(d.clientName, 120) || 'Client',
    documentType: clampStr(d.documentType, 60) || 'RC Book',
    documentNumber: clampOptionalStr(d.documentNumber, 80),
    issueDate: clampOptionalStr(d.issueDate, 20),
    expiryDate: clampOptionalStr(d.expiryDate, 20),
    receivedStatus: d.receivedStatus || 'Received',
    verificationStatus: d.verificationStatus || 'Pending',
    fileName: clampOptionalStr(d.fileName, 180),
    fileSize: typeof d.fileSize === 'number' && d.fileSize >= 0 ? d.fileSize : undefined,
    mimeType: clampOptionalStr(d.mimeType, 100),
    storagePath: clampOptionalStr(d.storagePath, 400),
    downloadUrl: clampOptionalStr(d.downloadUrl, 1200),
    filePathOrReference: clampOptionalStr(d.filePathOrReference, 250) || 'Digital Vault',
    uploadedAt: clampOptionalStr(d.uploadedAt, 40),
    remarks: clampOptionalStr(d.remarks, 500),
    updatedAt: serverTimestamp(),
  });
  if (!isUpdate) {
    base.createdAt = serverTimestamp();
  }
  return base;
}

export function sanitizeArchivePayload(uid: string, rec: ArchivedRecord): Record<string, unknown> {
  const cleanSnapshot: Record<string, unknown> = {};
  if (rec.data && typeof rec.data === 'object') {
    for (const [k, v] of Object.entries(rec.data)) {
      if (v !== undefined && v !== null && Object.keys(cleanSnapshot).length < 40) {
        cleanSnapshot[k] = v instanceof Timestamp ? v.toDate().toISOString() : v;
      }
    }
  }
  if (Object.keys(cleanSnapshot).length === 0) {
    cleanSnapshot.id = rec.entityId;
  }

  return stripUndefined({
    archiveId: clampStr(rec.archiveId, 64),
    ownerUid: uid,
    showroomId: clampStr(rec.showroomId, 64) || 'SHW-101',
    entityType: clampStr(rec.entityType, 40) || 'Client',
    entityId: clampStr(rec.entityId, 64),
    summary: clampStr(rec.summary, 400) || `Archived ${rec.entityType}`,
    data: cleanSnapshot,
    deletedAt: clampStr(rec.deletedAt, 60) || new Date().toLocaleString(),
    deletedBy: clampStr(rec.deletedBy, 120) || 'Admin User',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function sanitizeSettingsPayload(
  uid: string,
  s: SystemSettings,
  isUpdate = false
): Record<string, unknown> {
  const cleanChecklistMap: Record<string, DocumentCategory[]> = {};
  if (s.documentChecklistMap && typeof s.documentChecklistMap === 'object') {
    for (const [k, v] of Object.entries(s.documentChecklistMap).slice(0, 30)) {
      if (Array.isArray(v)) {
        cleanChecklistMap[clampStr(k, 80)] = v
          .filter((d): d is DocumentCategory => (DOCUMENT_CATEGORIES as readonly string[]).includes(d))
          .slice(0, 15);
      }
    }
  }

  const base = stripUndefined({
    id: 'default',
    ownerUid: uid,
    businessName: clampStr(s.businessName, 150) || INITIAL_SETTINGS.businessName,
    tagline: clampOptionalStr(s.tagline, 200),
    address: clampOptionalStr(s.address, 300),
    mobile: clampOptionalStr(s.mobile, 30),
    email: clampOptionalStr(s.email, 120),
    rtoLicenseNumber: clampOptionalStr(s.rtoLicenseNumber, 60),
    rtoOffices: (s.rtoOffices || []).slice(0, 60),
    vehicleClasses: (s.vehicleClasses || []).slice(0, 30),
    workTypes: (s.workTypes || []).slice(0, 30),
    applicationStatuses: (s.applicationStatuses || []).slice(0, 20),
    documentChecklistMap: cleanChecklistMap,
    updatedAt: serverTimestamp(),
  });
  if (!isUpdate) {
    base.createdAt = serverTimestamp();
  }
  return base;
}

// ---------------------------------------------------------------------------
// Workspace Bootstrapping & Initial Seeding
// ---------------------------------------------------------------------------
export async function ensureUserWorkspaceAndSeed(user: User, seedSource: AppDatabase): Promise<void> {
  const uid = user.uid;
  const userDocRef = doc(firestoreDb, 'users', uid);
  const userPath = `users/${uid}`;

  try {
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) {
      await setDoc(
        userDocRef,
        stripUndefined({
          uid,
          email: clampStr(user.email, 254) || 'owner@rto-erp.local',
          displayName: clampOptionalStr(user.displayName, 120),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userPath);
  }

  const showroomsColPath = `users/${uid}/showrooms`;
  try {
    const showroomsQuery = query(collection(firestoreDb, 'users', uid, 'showrooms'), where('ownerUid', '==', uid));
    const existingShowrooms = await getDocs(showroomsQuery);
    if (!existingShowrooms.empty) {
      return;
    }

    const batch = writeBatch(firestoreDb);
    seedSource.showrooms.forEach((shw) => {
      batch.set(doc(firestoreDb, 'users', uid, 'showrooms', shw.id), sanitizeShowroomPayload(uid, shw, false));
    });
    batch.set(
      doc(firestoreDb, 'users', uid, 'settings', 'default'),
      sanitizeSettingsPayload(uid, seedSource.settings, false)
    );
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, showroomsColPath);
  }
}

// ---------------------------------------------------------------------------
// Real-time Subscriptions
// ---------------------------------------------------------------------------
function mapDocDates<T extends Record<string, unknown>>(raw: Record<string, unknown>): T {
  const copy: Record<string, unknown> = { ...raw };
  delete copy.ownerUid;
  if ('createdAt' in copy) copy.createdAt = toIsoString(copy.createdAt);
  if ('updatedAt' in copy) copy.updatedAt = toIsoString(copy.updatedAt);
  return copy as T;
}

export function subscribeToWorkspace(
  uid: string,
  onPatch: (patch: Partial<AppDatabase>) => void,
  onError?: (err: Error) => void
): () => void {
  const unsubs: (() => void)[] = [];

  const attach = <K extends keyof AppDatabase>(
    subcollection: string,
    key: K,
    mapper?: (docs: Record<string, unknown>[]) => AppDatabase[K]
  ) => {
    const path = `users/${uid}/${subcollection}`;
    const q = query(collection(firestoreDb, 'users', uid, subcollection), where('ownerUid', '==', uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rawDocs = snap.docs.map((d) => ({ ...d.data() }));
        if (mapper) {
          onPatch({ [key]: mapper(rawDocs) } as Partial<AppDatabase>);
        } else {
          onPatch({ [key]: rawDocs.map((r) => mapDocDates(r)) } as Partial<AppDatabase>);
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, path);
        } catch (wrapped) {
          if (onError && wrapped instanceof Error) onError(wrapped);
        }
      }
    );
    unsubs.push(unsub);
  };

  attach('showrooms', 'showrooms', (docs) =>
    docs.map((d) => {
      const m = mapDocDates<Showroom & Record<string, unknown>>(d);
      delete m.createdAt;
      delete m.updatedAt;
      return m as Showroom;
    })
  );
  attach('clients', 'clients');
  attach('vehicles', 'vehicles');
  attach('applications', 'applications');
  attach('documents', 'documents');
  attach('applicationHistory', 'applicationHistory', (docs) =>
    docs.map((d) => {
      const m = mapDocDates<ApplicationHistoryEntry & Record<string, unknown>>(d);
      delete m.createdAt;
      delete m.updatedAt;
      return m as ApplicationHistoryEntry;
    })
  );
  attach('archive', 'archive', (docs) =>
    docs.map((d) => {
      const m = mapDocDates<ArchivedRecord & Record<string, unknown>>(d);
      delete m.createdAt;
      delete m.updatedAt;
      return m as ArchivedRecord;
    })
  );

  const settingsPath = `users/${uid}/settings/default`;
  const settingsUnsub = onSnapshot(
    doc(firestoreDb, 'users', uid, 'settings', 'default'),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Record<string, unknown>;
        const { ownerUid: _o, id: _id, createdAt: _c, updatedAt: _u, ...rest } = data;
        onPatch({
          settings: {
            ...INITIAL_SETTINGS,
            ...(rest as unknown as Partial<SystemSettings>),
            documentChecklistMap: {
              ...INITIAL_SETTINGS.documentChecklistMap,
              ...((rest as unknown as Partial<SystemSettings>)?.documentChecklistMap || {}),
            },
          },
        });
      }
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, settingsPath);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
  unsubs.push(settingsUnsub);

  return () => {
    unsubs.forEach((u) => u());
  };
}

// ---------------------------------------------------------------------------
// CRUD & Transactional Mutations
// ---------------------------------------------------------------------------
export async function saveEntryToFirestore(
  uid: string,
  entry: {
    client: Client;
    clientExists: boolean;
    vehicle: Vehicle;
    vehicleExists: boolean;
    application: RTOApplication;
    historyEntry: ApplicationHistoryEntry;
  }
): Promise<void> {
  const path = `users/${uid}/applications/${entry.application.id}`;
  try {
    const batch = writeBatch(firestoreDb);

    const clientRef = doc(firestoreDb, 'users', uid, 'clients', entry.client.id);
    if (entry.clientExists) {
      const full = sanitizeClientPayload(uid, entry.client, true);
      delete full.id;
      delete full.ownerUid;
      batch.update(clientRef, full);
    } else {
      batch.set(clientRef, sanitizeClientPayload(uid, entry.client, false));
    }

    const vehicleRef = doc(firestoreDb, 'users', uid, 'vehicles', entry.vehicle.id);
    if (entry.vehicleExists) {
      const full = sanitizeVehiclePayload(uid, entry.vehicle, true);
      delete full.id;
      delete full.ownerUid;
      batch.update(vehicleRef, full);
    } else {
      batch.set(vehicleRef, sanitizeVehiclePayload(uid, entry.vehicle, false));
    }

    const appRef = doc(firestoreDb, 'users', uid, 'applications', entry.application.id);
    batch.set(appRef, sanitizeApplicationPayload(uid, entry.application, false));

    const hisRef = doc(firestoreDb, 'users', uid, 'applicationHistory', entry.historyEntry.id);
    batch.set(hisRef, sanitizeApplicationHistoryPayload(uid, entry.historyEntry));

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function upsertClientInFirestore(uid: string, client: Client, isUpdate: boolean): Promise<void> {
  const path = `users/${uid}/clients/${client.id}`;
  try {
    if (isUpdate) {
      const payload = sanitizeClientPayload(uid, client, true);
      delete payload.id;
      delete payload.ownerUid;
      await updateDoc(doc(firestoreDb, 'users', uid, 'clients', client.id), payload);
    } else {
      await setDoc(doc(firestoreDb, 'users', uid, 'clients', client.id), sanitizeClientPayload(uid, client, false));
    }
  } catch (err) {
    handleFirestoreError(err, isUpdate ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function upsertVehicleInFirestore(uid: string, vehicle: Vehicle, isUpdate: boolean): Promise<void> {
  const path = `users/${uid}/vehicles/${vehicle.id}`;
  try {
    if (isUpdate) {
      const payload = sanitizeVehiclePayload(uid, vehicle, true);
      delete payload.id;
      delete payload.ownerUid;
      await updateDoc(doc(firestoreDb, 'users', uid, 'vehicles', vehicle.id), payload);
    } else {
      await setDoc(doc(firestoreDb, 'users', uid, 'vehicles', vehicle.id), sanitizeVehiclePayload(uid, vehicle, false));
    }
  } catch (err) {
    handleFirestoreError(err, isUpdate ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function updateApplicationInFirestore(
  uid: string,
  app: RTOApplication,
  historyEntry?: ApplicationHistoryEntry
): Promise<void> {
  const path = `users/${uid}/applications/${app.id}`;
  try {
    const payload = sanitizeApplicationPayload(uid, app, true);
    delete payload.id;
    delete payload.ownerUid;
    delete payload.clientId;
    delete payload.vehicleId;

    const batch = writeBatch(firestoreDb);
    batch.update(doc(firestoreDb, 'users', uid, 'applications', app.id), payload);
    if (historyEntry) {
      batch.set(
        doc(firestoreDb, 'users', uid, 'applicationHistory', historyEntry.id),
        sanitizeApplicationHistoryPayload(uid, historyEntry)
      );
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateApplicationStatusWithHistoryInFirestore(
  uid: string,
  appId: string,
  workStatus: WorkStatus,
  historyEntry: ApplicationHistoryEntry,
  completionDate?: string
): Promise<void> {
  const path = `users/${uid}/applications/${appId}`;
  try {
    const batch = writeBatch(firestoreDb);
    const updatePayload = stripUndefined({
      workStatus,
      completionDate: completionDate ? clampStr(completionDate, 20) : undefined,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(firestoreDb, 'users', uid, 'applications', appId), updatePayload);
    batch.set(
      doc(firestoreDb, 'users', uid, 'applicationHistory', historyEntry.id),
      sanitizeApplicationHistoryPayload(uid, historyEntry)
    );
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function createDocumentRecordInFirestore(uid: string, docRec: DocumentRecord): Promise<void> {
  const path = `users/${uid}/documents/${docRec.id}`;
  try {
    await setDoc(doc(firestoreDb, 'users', uid, 'documents', docRec.id), sanitizeDocumentPayload(uid, docRec, false));
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateDocumentRecordInFirestore(uid: string, docRec: DocumentRecord): Promise<void> {
  const path = `users/${uid}/documents/${docRec.id}`;
  try {
    const payload = sanitizeDocumentPayload(uid, docRec, true);
    delete payload.id;
    delete payload.ownerUid;
    delete payload.clientId;
    delete payload.vehicleId;
    await updateDoc(doc(firestoreDb, 'users', uid, 'documents', docRec.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteAndArchiveInFirestore(
  uid: string,
  colName: string,
  docId: string,
  archiveRecord: ArchivedRecord
): Promise<void> {
  const path = `users/${uid}/${colName}/${docId}`;
  try {
    const batch = writeBatch(firestoreDb);
    batch.delete(doc(firestoreDb, 'users', uid, colName, docId));
    batch.set(
      doc(firestoreDb, 'users', uid, 'archive', archiveRecord.archiveId),
      sanitizeArchivePayload(uid, archiveRecord)
    );
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function restoreFromArchiveInFirestore(uid: string, rec: ArchivedRecord): Promise<void> {
  const colMap: Record<ArchivedRecord['entityType'], string> = {
    Client: 'clients',
    Vehicle: 'vehicles',
    Application: 'applications',
    Document: 'documents',
  };
  const colName = colMap[rec.entityType];
  const path = `users/${uid}/${colName}/${rec.entityId}`;
  try {
    const batch = writeBatch(firestoreDb);
    const targetRef = doc(firestoreDb, 'users', uid, colName, rec.entityId);
    let payload: Record<string, unknown> = {};
    if (rec.entityType === 'Client') payload = sanitizeClientPayload(uid, rec.data as unknown as Client, false);
    else if (rec.entityType === 'Vehicle') payload = sanitizeVehiclePayload(uid, rec.data as unknown as Vehicle, false);
    else if (rec.entityType === 'Application')
      payload = sanitizeApplicationPayload(uid, rec.data as unknown as RTOApplication, false);
    else if (rec.entityType === 'Document')
      payload = sanitizeDocumentPayload(uid, rec.data as unknown as DocumentRecord, false);

    batch.set(targetRef, payload);
    batch.delete(doc(firestoreDb, 'users', uid, 'archive', rec.archiveId));
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteArchiveDocInFirestore(uid: string, archiveId: string): Promise<void> {
  const path = `users/${uid}/archive/${archiveId}`;
  try {
    await deleteDoc(doc(firestoreDb, 'users', uid, 'archive', archiveId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function clearArchiveInFirestore(uid: string, archiveIds: string[]): Promise<void> {
  const path = `users/${uid}/archive`;
  try {
    for (let i = 0; i < archiveIds.length; i += 400) {
      const chunk = archiveIds.slice(i, i + 400);
      const batch = writeBatch(firestoreDb);
      chunk.forEach((id) => batch.delete(doc(firestoreDb, 'users', uid, 'archive', id)));
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function upsertShowroomInFirestore(
  uid: string,
  showroom: Showroom,
  isUpdate: boolean
): Promise<void> {
  const path = `users/${uid}/showrooms/${showroom.id}`;
  try {
    if (isUpdate) {
      const payload = sanitizeShowroomPayload(uid, showroom, true);
      delete payload.id;
      delete payload.ownerUid;
      await updateDoc(doc(firestoreDb, 'users', uid, 'showrooms', showroom.id), payload);
    } else {
      await setDoc(doc(firestoreDb, 'users', uid, 'showrooms', showroom.id), sanitizeShowroomPayload(uid, showroom, false));
    }
  } catch (err) {
    handleFirestoreError(err, isUpdate ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteShowroomInFirestore(uid: string, showroomId: string): Promise<void> {
  const path = `users/${uid}/showrooms/${showroomId}`;
  try {
    await deleteDoc(doc(firestoreDb, 'users', uid, 'showrooms', showroomId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveSettingsInFirestore(uid: string, settings: SystemSettings): Promise<void> {
  const path = `users/${uid}/settings/default`;
  try {
    const docRef = doc(firestoreDb, 'users', uid, 'settings', 'default');
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      const payload = sanitizeSettingsPayload(uid, settings, true);
      delete payload.id;
      delete payload.ownerUid;
      await updateDoc(docRef, payload);
    } else {
      await setDoc(docRef, sanitizeSettingsPayload(uid, settings, false));
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function clearAllTransactionalRecordsInFirestore(uid: string): Promise<void> {
  const collectionsToClear = ['clients', 'vehicles', 'applications', 'documents', 'applicationHistory', 'archive'];

  const refsToDelete: ReturnType<typeof doc>[] = [];
  for (const subcollection of collectionsToClear) {
    const path = `users/${uid}/${subcollection}`;
    try {
      const q = query(collection(firestoreDb, 'users', uid, subcollection), where('ownerUid', '==', uid));
      const snap = await getDocs(q);
      snap.forEach((docSnap) => {
        refsToDelete.push(docSnap.ref);
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  }

  try {
    for (let i = 0; i < refsToDelete.length; i += 400) {
      const chunk = refsToDelete.slice(i, i + 400);
      const batch = writeBatch(firestoreDb);
      chunk.forEach((ref) => batch.delete(ref));
      await batch.commit();
    }
    await saveSettingsInFirestore(uid, INITIAL_SETTINGS);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${uid}`);
  }
}

export async function importBackupToFirestore(uid: string, backup: AppDatabase): Promise<void> {
  const path = `users/${uid}`;
  try {
    const ops: { ref: ReturnType<typeof doc>; payload: Record<string, unknown> }[] = [];
    backup.showrooms.forEach((s) =>
      ops.push({ ref: doc(firestoreDb, 'users', uid, 'showrooms', s.id), payload: sanitizeShowroomPayload(uid, s, false) })
    );
    ops.push({
      ref: doc(firestoreDb, 'users', uid, 'settings', 'default'),
      payload: sanitizeSettingsPayload(uid, backup.settings, false),
    });
    backup.clients.forEach((c) =>
      ops.push({ ref: doc(firestoreDb, 'users', uid, 'clients', c.id), payload: sanitizeClientPayload(uid, c, false) })
    );
    backup.vehicles.forEach((v) =>
      ops.push({ ref: doc(firestoreDb, 'users', uid, 'vehicles', v.id), payload: sanitizeVehiclePayload(uid, v, false) })
    );
    backup.applications.forEach((a) =>
      ops.push({
        ref: doc(firestoreDb, 'users', uid, 'applications', a.id),
        payload: sanitizeApplicationPayload(uid, a, false),
      })
    );
    backup.documents.forEach((d) =>
      ops.push({ ref: doc(firestoreDb, 'users', uid, 'documents', d.id), payload: sanitizeDocumentPayload(uid, d, false) })
    );
    backup.applicationHistory.forEach((h) =>
      ops.push({
        ref: doc(firestoreDb, 'users', uid, 'applicationHistory', h.id),
        payload: sanitizeApplicationHistoryPayload(uid, h),
      })
    );
    backup.archive.forEach((arc) =>
      ops.push({
        ref: doc(firestoreDb, 'users', uid, 'archive', arc.archiveId),
        payload: sanitizeArchivePayload(uid, arc),
      })
    );

    for (let i = 0; i < ops.length; i += 400) {
      const chunk = ops.slice(i, i + 400);
      const batch = writeBatch(firestoreDb);
      chunk.forEach((op) => batch.set(op.ref, op.payload));
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}
