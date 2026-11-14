/**
 * Pure calculation, validation, duplicate detection, checklist evaluation,
 * and multi-showroom aggregation functions decoupled from React UI.
 * Tested via node:test and tsx.
 */

import type {
  Showroom,
  Client,
  Vehicle,
  RTOApplication,
  DocumentRecord,
  DocumentCategory,
  ChecklistStatus,
  SystemSettings,
} from '../types';
import { DEFAULT_DOCUMENT_CHECKLIST } from './seedData';

export function getTodayDateStr(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function maskAadhaar(aadhaar: string | undefined): string {
  if (!aadhaar) return '—';
  const clean = aadhaar.replace(/\D/g, '');
  if (clean.length === 0) return '—';
  if (clean.length < 4) return 'XXXX-XXXX-' + clean;
  const last4 = clean.slice(-4);
  return `XXXX-XXXX-${last4}`;
}

export function maskPAN(pan: string | undefined): string {
  if (!pan) return '—';
  const clean = pan.trim().toUpperCase();
  if (clean.length < 4) return clean;
  return `${clean.slice(0, 2)}XXXXX${clean.slice(-3)}`;
}

export function formatAadhaarInput(val: string): string {
  const clean = val.replace(/\D/g, '').slice(0, 12);
  const parts: string[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    parts.push(clean.substring(i, i + 4));
  }
  return parts.join('-');
}

export function formatPanInput(val: string): string {
  return val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
}

export function formatVehicleNumber(val: string): string {
  return val.toUpperCase().replace(/\s+/g, '').trim();
}

export function normalizePhone(val: string | undefined): string {
  return (val || '').replace(/\D/g, '');
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

  expiry.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);

  const diffMs = expiry.getTime() - current.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'expired';
  if (diffDays <= warningDaysThreshold) return 'expiring_soon';
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

export function generateNextId(
  prefix: string,
  existingIds: string[],
  startNumber: number = 1001
): string {
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

  return `${prefix}-${highest + 1}`;
}

export function isDateWithinRange(
  dateStr: string | undefined,
  startDate?: string,
  endDate?: string
): boolean {
  if (!startDate && !endDate) return true;
  if (!dateStr) return false;
  if (startDate && dateStr < startDate) return false;
  if (endDate && dateStr > endDate) return false;
  return true;
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

  if (filter === 'today') return d.getTime() === ref.getTime();

  if (filter === 'week') {
    const diffDays = (ref.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
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

export function filterByShowroom<T extends { showroomId?: string }>(
  items: T[],
  activeShowroomId: string,
  fallbackShowroomId: string = 'SHW-101'
): T[] {
  if (!activeShowroomId || activeShowroomId === 'ALL') {
    return items;
  }
  return items.filter((item) => (item.showroomId || fallbackShowroomId) === activeShowroomId);
}

export function getShowroomLabel(showrooms: Showroom[], showroomId: string | undefined): string {
  if (!showroomId) return 'Unassigned';
  const found = showrooms.find((s) => s.id === showroomId);
  return found ? `${found.code} (${found.city})` : showroomId;
}

/**
 * Duplicate client detection across the centralized common client database.
 * Checks normalized mobile/alternateMobile, Aadhaar digits, and PAN number.
 */
export interface DuplicateClientMatch {
  client: Client;
  matchedBy: 'mobile' | 'aadhaar' | 'pan';
}

export function findDuplicateClient(
  clients: Client[],
  candidate: { mobile?: string; aadhaar?: string; panNumber?: string; excludeId?: string }
): DuplicateClientMatch | null {
  const targetMobile = normalizePhone(candidate.mobile);
  const targetAadhaar = normalizePhone(candidate.aadhaar);
  const targetPan = (candidate.panNumber || '').trim().toUpperCase();

  for (const client of clients) {
    if (candidate.excludeId && client.id === candidate.excludeId) continue;

    if (targetMobile.length >= 10) {
      const cMobile = normalizePhone(client.mobile);
      const cAlt = normalizePhone(client.alternateMobile);
      if (cMobile === targetMobile || (cAlt.length >= 10 && cAlt === targetMobile)) {
        return { client, matchedBy: 'mobile' };
      }
    }

    if (targetAadhaar.length === 12) {
      const cAadhaar = normalizePhone(client.aadhaar);
      if (cAadhaar === targetAadhaar) {
        return { client, matchedBy: 'aadhaar' };
      }
    }

    if (targetPan.length >= 10) {
      const cPan = (client.panNumber || '').trim().toUpperCase();
      if (cPan === targetPan) {
        return { client, matchedBy: 'pan' };
      }
    }
  }

  return null;
}

/**
 * Evaluates document compliance checklist for an RTO Application.
 * Links uploaded DocumentRecord rows matching either `applicationId === app.id`
 * or (`vehicleId === app.vehicleId` / `clientId === app.clientId` when general KYC).
 */
export interface ChecklistEvaluation {
  required: DocumentCategory[];
  uploaded: DocumentCategory[];
  missing: DocumentCategory[];
  pendingVerification: DocumentCategory[];
  rejected: DocumentCategory[];
  status: ChecklistStatus;
  completionPercent: number;
}

export function getRequiredDocsForWorkType(
  workType: string,
  settings?: SystemSettings
): DocumentCategory[] {
  const custom = settings?.documentChecklistMap?.[workType];
  if (custom && custom.length > 0) return custom;
  const fallback = DEFAULT_DOCUMENT_CHECKLIST[workType];
  if (fallback && fallback.length > 0) return fallback;
  return ['RC Book', 'Aadhaar Card', 'Insurance'];
}

export function evaluateApplicationChecklist(
  app: RTOApplication,
  documents: DocumentRecord[],
  settings?: SystemSettings
): ChecklistEvaluation {
  const required: DocumentCategory[] =
    app.requiredDocuments && app.requiredDocuments.length > 0
      ? app.requiredDocuments
      : getRequiredDocsForWorkType(app.workType, settings);

  // Relevant documents: attached directly to this app OR same vehicle OR KYC (Aadhaar/PAN/DL) on same client
  const kycTypes: DocumentCategory[] = ['Aadhaar Card', 'PAN Card', 'Driving Licence', 'Address Proof'];
  const relevantDocs = documents.filter((d) => {
    if (d.applicationId && d.applicationId === app.id) return true;
    if (d.vehicleId && app.vehicleId && d.vehicleId === app.vehicleId) return true;
    if (d.clientId && app.clientId && d.clientId === app.clientId && kycTypes.includes(d.documentType)) {
      return true;
    }
    return false;
  });

  const uploaded: DocumentCategory[] = [];
  const missing: DocumentCategory[] = [];
  const pendingVerification: DocumentCategory[] = [];
  const rejected: DocumentCategory[] = [];

  for (const reqType of required) {
    const matching = relevantDocs.filter(
      (d) => d.documentType === reqType && d.receivedStatus !== 'Missing'
    );
    if (matching.length === 0) {
      missing.push(reqType);
    } else {
      uploaded.push(reqType);
      const hasVerified = matching.some((m) => m.verificationStatus === 'Verified');
      const hasPending = matching.some((m) => m.verificationStatus === 'Pending');
      if (!hasVerified) {
        if (hasPending) {
          pendingVerification.push(reqType);
        } else {
          rejected.push(reqType);
        }
      }
    }
  }

  let status: ChecklistStatus = 'Documents Complete';
  if (missing.length > 0 || rejected.length > 0) {
    status = 'Documents Incomplete';
  } else if (pendingVerification.length > 0) {
    status = 'Documents Under Verification';
  }

  const completionPercent =
    required.length === 0 ? 100 : Math.round((uploaded.length / required.length) * 100);

  return {
    required,
    uploaded,
    missing,
    pendingVerification,
    rejected,
    status,
    completionPercent,
  };
}

/**
 * Computes strictly RTO & document metrics per Showroom.
 * Note: Clients & Vehicles belong to the centralized database;
 * `uniqueClientsCount` / `uniqueVehiclesCount` reflect clients/vehicles served in that showroom's RTO applications.
 */
export interface ShowroomRtoSummary {
  showroom: Showroom;
  uniqueClientsCount: number;
  uniqueVehiclesCount: number;
  applicationsCount: number;
  newAndPendingCount: number;
  inProcessCount: number;
  completedCount: number;
  rejectedCount: number;
  submittedTodayCount: number;
  missingDocsAppsCount: number;
  documentsCount: number;
}

export function computeShowroomRtoSummary(
  showrooms: Showroom[],
  data: {
    applications: RTOApplication[];
    documents: DocumentRecord[];
    settings?: SystemSettings;
  },
  todayStr: string
): ShowroomRtoSummary[] {
  return showrooms.map((showroom) => {
    const apps = data.applications.filter((a) => a.showroomId === showroom.id);
    const docs = data.documents.filter((d) => d.showroomId === showroom.id);

    const uniqueClients = new Set(apps.map((a) => a.clientId).filter(Boolean));
    const uniqueVehicles = new Set(apps.map((a) => a.vehicleId).filter(Boolean));

    const completedCount = apps.filter((a) => a.workStatus === 'Completed').length;
    const rejectedCount = apps.filter((a) => a.workStatus === 'Rejected').length;
    const inProcessCount = apps.filter(
      (a) => a.workStatus === 'In Process' || a.workStatus === 'Submitted'
    ).length;
    const newAndPendingCount = apps.filter(
      (a) =>
        a.workStatus === 'New' ||
        a.workStatus === 'Documents Pending' ||
        a.workStatus === 'Ready to Submit' ||
        a.workStatus === 'On Hold'
    ).length;

    const submittedTodayCount = apps.filter(
      (a) => a.submissionDate === todayStr || a.applicationDate === todayStr
    ).length;

    const missingDocsAppsCount = apps.filter((a) => {
      if (a.workStatus === 'Completed' || a.workStatus === 'Rejected') return false;
      const evalRes = evaluateApplicationChecklist(a, data.documents, data.settings);
      return evalRes.status === 'Documents Incomplete';
    }).length;

    return {
      showroom,
      uniqueClientsCount: uniqueClients.size,
      uniqueVehiclesCount: uniqueVehicles.size,
      applicationsCount: apps.length,
      newAndPendingCount,
      inProcessCount,
      completedCount,
      rejectedCount,
      submittedTodayCount,
      missingDocsAppsCount,
      documentsCount: docs.length,
    };
  });
}

/**
 * Validates file uploads for Document Management (PDF, JPG, JPEG, PNG up to 10 MB).
 */
export const ALLOWED_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
] as const;

export const ALLOWED_UPLOAD_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'] as const;
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateUploadFile(file: {
  name: string;
  size: number;
  type?: string;
}): { valid: boolean; error?: string } {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const mime = (file.type || '').toLowerCase();

  const hasValidExt = (ALLOWED_UPLOAD_EXTENSIONS as readonly string[]).includes(ext);
  const hasValidMime =
    !mime || (ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(mime);

  if (!hasValidExt || !hasValidMime) {
    return {
      valid: false,
      error: 'Only PDF, JPG, JPEG, and PNG files are allowed.',
    };
  }

  if (file.size <= 0) {
    return { valid: false, error: 'Selected file is empty.' };
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return {
      valid: false,
      error: 'File exceeds the 10 MB upload limit.',
    };
  }

  return { valid: true };
}

/**
 * Global search across Clients, Vehicles, and RTO Applications.
 */
export interface GlobalSearchResults {
  clients: Client[];
  vehicles: Vehicle[];
  applications: RTOApplication[];
}

export function runGlobalSearch(
  rawQuery: string,
  data: {
    clients: Client[];
    vehicles: Vehicle[];
    applications: RTOApplication[];
  }
): GlobalSearchResults {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return { clients: [], vehicles: [], applications: [] };

  const qUpper = q.toUpperCase();

  // Vehicles matching registration number or chassis number
  const matchedVehicles = data.vehicles.filter(
    (v) =>
      v.vehicleNumber.toLowerCase().includes(q) ||
      v.chassisNumber.toLowerCase().includes(q) ||
      v.engineNumber.toLowerCase().includes(q) ||
      v.ownerName.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q)
  );

  const clientIdsFromVehicles = new Set(matchedVehicles.map((v) => v.clientId));

  // Clients matching name, mobile, alternate mobile, Aadhaar/PAN, ID, OR linked vehicle reg number
  const matchedClients = data.clients.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.mobile.includes(q) ||
      (c.alternateMobile && c.alternateMobile.includes(q)) ||
      c.id.toLowerCase().includes(q) ||
      (c.panNumber && c.panNumber.toUpperCase().includes(qUpper)) ||
      clientIdsFromVehicles.has(c.id)
  );

  // Applications matching ID, reference number, vehicle number, client name, chassis via linked vehicle
  const matchedVehIds = new Set(matchedVehicles.map((v) => v.id));
  const matchedApplications = data.applications.filter(
    (a) =>
      a.id.toLowerCase().includes(q) ||
      a.applicationNumber.toLowerCase().includes(q) ||
      a.vehicleNumber.toLowerCase().includes(q) ||
      a.clientName.toLowerCase().includes(q) ||
      a.workType.toLowerCase().includes(q) ||
      matchedVehIds.has(a.vehicleId)
  );

  return {
    clients: matchedClients.slice(0, 8),
    vehicles: matchedVehicles.slice(0, 8),
    applications: matchedApplications.slice(0, 8),
  };
}

/**
 * Guard check before deleting a Showroom.
 */
export function checkShowroomDeletionSafety(
  showroomId: string,
  data: {
    showrooms: Showroom[];
    applications: RTOApplication[];
    documents: DocumentRecord[];
  }
): { allowed: boolean; reason?: string } {
  if (data.showrooms.length <= 1) {
    return { allowed: false, reason: 'At least one showroom must remain configured.' };
  }
  const linkedApps = data.applications.filter((a) => a.showroomId === showroomId).length;
  const linkedDocs = data.documents.filter((d) => d.showroomId === showroomId).length;
  if (linkedApps > 0 || linkedDocs > 0) {
    return {
      allowed: false,
      reason: `Cannot delete showroom: ${linkedApps} RTO application(s) and ${linkedDocs} document(s) are linked to it. Mark it Inactive instead.`,
    };
  }
  return { allowed: true };
}

/**
 * Classifies Firebase Auth popup/OAuth errors into clean, user-friendly guidance
 * and marks user-initiated cancellations so they are not logged as uncaught errors.
 */
export function classifyAuthError(
  error: unknown,
  hostname = ''
): { code: string; isUserCancelled: boolean; shouldLogConsoleError: boolean; message: string } {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';
  const rawMessage = error instanceof Error ? error.message : String(error || '');

  if (code === 'auth/popup-closed-by-user' || rawMessage.includes('auth/popup-closed-by-user')) {
    return {
      code: 'auth/popup-closed-by-user',
      isUserCancelled: true,
      shouldLogConsoleError: false,
      message:
        'Sign-in popup was closed before completing Google authentication. Please click "Sign in with Google Workspace" again and finish signing in.',
    };
  }

  if (
    code === 'auth/cancelled-popup-request' ||
    rawMessage.includes('auth/cancelled-popup-request')
  ) {
    return {
      code: 'auth/cancelled-popup-request',
      isUserCancelled: true,
      shouldLogConsoleError: false,
      message: 'Previous sign-in popup was replaced. Please complete sign-in in the active popup window.',
    };
  }

  if (code === 'auth/popup-blocked' || rawMessage.includes('auth/popup-blocked')) {
    return {
      code: 'auth/popup-blocked',
      isUserCancelled: false,
      shouldLogConsoleError: false,
      message:
        'Your browser blocked the Google Sign-In popup. Please allow popups for this site in your browser bar and click Sign in again.',
    };
  }

  if (code === 'auth/unauthorized-domain' || rawMessage.includes('auth/unauthorized-domain')) {
    const domainHint = hostname ? ` (${hostname})` : '';
    return {
      code: 'auth/unauthorized-domain',
      isUserCancelled: false,
      shouldLogConsoleError: true,
      message: `This app domain${domainHint} is not yet authorized in Firebase Authentication. Add it under Firebase Console → Authentication → Settings → Authorized domains.`,
    };
  }

  if (code === 'auth/network-request-failed' || rawMessage.includes('auth/network-request-failed')) {
    return {
      code: 'auth/network-request-failed',
      isUserCancelled: false,
      shouldLogConsoleError: true,
      message: 'Network error while contacting Google Sign-In. Check your internet connection and retry.',
    };
  }

  return {
    code: code || 'auth/unknown',
    isUserCancelled: false,
    shouldLogConsoleError: true,
    message: rawMessage || 'Google Sign-In failed. Please try again.',
  };
}

