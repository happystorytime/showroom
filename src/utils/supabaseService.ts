import type { AuthUser } from './auth';
import { requireSupabase } from './supabaseClient';
import type { AppDatabase } from './storage';
import { INITIAL_SETTINGS } from './seedData';
import type {
  ApplicationHistoryEntry,
  ArchivedRecord,
  Client,
  DocumentCategory,
  DocumentCustodyStatus,
  DocumentRecord,
  DocumentVerificationStatus,
  RTOApplication,
  Showroom,
  SystemSettings,
  Vehicle,
  WorkStatus,
} from '../types';
import { DOCUMENT_CATEGORIES } from '../types';

// ---------------------------------------------------------------------------
// Defensive Payload Sanitization & Row Mappers (CamelCase <-> SnakeCase)
// ---------------------------------------------------------------------------
function clampStr(val: string | undefined | null, maxLen: number): string {
  return String(val ?? '').trim().slice(0, maxLen);
}

function clampOptionalStr(val: string | undefined | null, maxLen: number): string | null {
  if (val === undefined || val === null) return null;
  const trimmed = String(val).trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

function toIsoString(val: unknown): string {
  if (typeof val === 'string' && val) {
    return val.replace('T', ' ').substring(0, 19);
  }
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

export function showroomToRow(uid: string, s: Showroom) {
  return {
    owner_uid: uid,
    id: clampStr(s.id, 64),
    name: clampStr(s.name, 120),
    code: clampStr(s.code, 30),
    city: clampStr(s.city, 80),
    address: clampStr(s.address, 300),
    phone: clampStr(s.phone, 20),
    manager_name: clampStr(s.managerName, 80),
    rto_jurisdiction: clampStr(s.rtoJurisdiction, 80),
    is_active: Boolean(s.isActive),
  };
}

export function rowToShowroom(r: Record<string, unknown>): Showroom {
  return {
    id: String(r.id || ''),
    name: String(r.name || ''),
    code: String(r.code || ''),
    city: String(r.city || ''),
    address: String(r.address || ''),
    phone: String(r.phone || ''),
    managerName: String(r.manager_name || ''),
    rtoJurisdiction: String(r.rto_jurisdiction || ''),
    isActive: Boolean(r.is_active ?? true),
  };
}

export function clientToRow(uid: string, c: Client) {
  return {
    owner_uid: uid,
    id: clampStr(c.id, 64),
    created_showroom_id: clampOptionalStr(c.createdShowroomId, 64),
    name: clampStr(c.name, 120),
    mobile: clampStr(c.mobile, 20),
    alternate_mobile: clampStr(c.alternateMobile, 20),
    address: clampStr(c.address, 300),
    aadhaar: clampOptionalStr(c.aadhaar, 20),
    pan_number: clampOptionalStr(c.panNumber, 20),
    registration_date: clampStr(c.registrationDate, 20),
    remarks: clampStr(c.remarks, 500),
  };
}

export function rowToClient(r: Record<string, unknown>): Client {
  return {
    id: String(r.id || ''),
    createdShowroomId: r.created_showroom_id ? String(r.created_showroom_id) : undefined,
    name: String(r.name || ''),
    mobile: String(r.mobile || ''),
    alternateMobile: String(r.alternate_mobile || ''),
    address: String(r.address || ''),
    aadhaar: r.aadhaar ? String(r.aadhaar) : undefined,
    panNumber: r.pan_number ? String(r.pan_number) : undefined,
    registrationDate: String(r.registration_date || ''),
    remarks: String(r.remarks || ''),
    createdAt: toIsoString(r.created_at),
    updatedAt: toIsoString(r.updated_at),
  };
}

export function vehicleToRow(uid: string, v: Vehicle) {
  return {
    owner_uid: uid,
    id: clampStr(v.id, 64),
    client_id: clampStr(v.clientId, 64),
    vehicle_number: clampStr(v.vehicleNumber, 40),
    chassis_number: clampStr(v.chassisNumber, 60),
    engine_number: clampStr(v.engineNumber, 60),
    vehicle_class: clampStr(v.vehicleClass, 60),
    model: clampStr(v.model, 80),
    manufacturer: clampStr(v.manufacturer, 80),
    manufacturing_year: Number(v.manufacturingYear) || 2026,
    fuel_type: clampStr(v.fuelType || 'Diesel', 30),
    owner_name: clampStr(v.ownerName, 120),
    registration_date: clampStr(v.registrationDate, 20),
    rc_validity: clampStr(v.rcValidity, 20),
    insurance_expiry: clampStr(v.insuranceExpiry, 20),
    hypothecation_status: clampStr(v.hypothecationStatus || 'None', 30),
    hypothecation_financer: clampOptionalStr(v.hypothecationFinancer, 120),
    rto_office: clampStr(v.rtoOffice, 80),
    document_status:
      v.documentStatus === 'Complete' || v.documentStatus === 'Expired'
        ? v.documentStatus
        : 'Pending Verification',
  };
}

export function rowToVehicle(r: Record<string, unknown>): Vehicle {
  return {
    id: String(r.id || ''),
    clientId: String(r.client_id || ''),
    vehicleNumber: String(r.vehicle_number || ''),
    chassisNumber: String(r.chassis_number || ''),
    engineNumber: String(r.engine_number || ''),
    vehicleClass: String(r.vehicle_class || '') as Vehicle['vehicleClass'],
    model: String(r.model || ''),
    manufacturer: String(r.manufacturer || ''),
    manufacturingYear: Number(r.manufacturing_year) || 2026,
    fuelType: String(r.fuel_type || 'Diesel') as Vehicle['fuelType'],
    ownerName: String(r.owner_name || ''),
    registrationDate: String(r.registration_date || ''),
    rcValidity: String(r.rc_validity || ''),
    insuranceExpiry: String(r.insurance_expiry || ''),
    hypothecationStatus: String(r.hypothecation_status || 'None') as Vehicle['hypothecationStatus'],
    hypothecationFinancer: r.hypothecation_financer ? String(r.hypothecation_financer) : undefined,
    rtoOffice: String(r.rto_office || ''),
    documentStatus: (r.document_status || 'Pending Verification') as Vehicle['documentStatus'],
    createdAt: toIsoString(r.created_at),
    updatedAt: r.updated_at ? toIsoString(r.updated_at) : undefined,
  };
}

export function applicationToRow(uid: string, a: RTOApplication) {
  const validDocSet = new Set<string>(DOCUMENT_CATEGORIES);
  const reqDocs = Array.isArray(a.requiredDocuments)
    ? a.requiredDocuments.filter((d): d is DocumentCategory => validDocSet.has(d)).slice(0, 20)
    : [];

  return {
    owner_uid: uid,
    id: clampStr(a.id, 64),
    showroom_id: clampStr(a.showroomId, 64),
    client_id: clampStr(a.clientId, 64),
    vehicle_id: clampStr(a.vehicleId, 64),
    client_name: clampStr(a.clientName, 120),
    vehicle_number: clampStr(a.vehicleNumber, 40),
    work_type: clampStr(a.workType, 80),
    application_number: clampStr(a.applicationNumber, 80),
    rto_office: clampStr(a.rtoOffice, 80),
    application_date: clampStr(a.applicationDate, 20),
    submission_date: clampStr(a.submissionDate, 20),
    expected_completion_date: clampStr(a.expectedCompletionDate, 20),
    completion_date: clampOptionalStr(a.completionDate, 20),
    required_documents: reqDocs,
    work_status: clampStr(a.workStatus || 'New', 40),
    work_description: clampOptionalStr(a.workDescription, 500),
    remarks: clampStr(a.remarks, 500),
  };
}

export function rowToApplication(r: Record<string, unknown>): RTOApplication {
  return {
    id: String(r.id || ''),
    showroomId: String(r.showroom_id || ''),
    clientId: String(r.client_id || ''),
    vehicleId: String(r.vehicle_id || ''),
    clientName: String(r.client_name || ''),
    vehicleNumber: String(r.vehicle_number || ''),
    workType: String(r.work_type || '') as RTOApplication['workType'],
    applicationNumber: String(r.application_number || ''),
    rtoOffice: String(r.rto_office || ''),
    applicationDate: String(r.application_date || ''),
    submissionDate: String(r.submission_date || ''),
    expectedCompletionDate: String(r.expected_completion_date || ''),
    completionDate: r.completion_date ? String(r.completion_date) : undefined,
    requiredDocuments: Array.isArray(r.required_documents)
      ? (r.required_documents as DocumentCategory[])
      : [],
    workStatus: String(r.work_status || 'New') as WorkStatus,
    workDescription: r.work_description ? String(r.work_description) : undefined,
    remarks: String(r.remarks || ''),
    createdAt: toIsoString(r.created_at),
    updatedAt: toIsoString(r.updated_at),
  };
}

export function documentToRow(uid: string, d: DocumentRecord) {
  const custodyStatuses: DocumentCustodyStatus[] = [
    'Received',
    'Missing',
    'Submitted to RTO',
    'Returned to Client',
  ];
  const verStatuses: DocumentVerificationStatus[] = ['Verified', 'Pending', 'Rejected'];

  return {
    owner_uid: uid,
    id: clampStr(d.id, 64),
    showroom_id: clampStr(d.showroomId, 64),
    application_id: clampOptionalStr(d.applicationId, 64),
    client_id: clampStr(d.clientId, 64),
    vehicle_id: clampStr(d.vehicleId, 64),
    vehicle_number: clampStr(d.vehicleNumber, 40),
    client_name: clampStr(d.clientName, 120),
    document_type: clampStr(d.documentType, 60),
    document_number: clampStr(d.documentNumber, 80),
    issue_date: clampStr(d.issueDate, 20),
    expiry_date: clampStr(d.expiryDate, 20),
    received_status: custodyStatuses.includes(d.receivedStatus) ? d.receivedStatus : 'Received',
    verification_status: verStatuses.includes(d.verificationStatus)
      ? d.verificationStatus
      : 'Pending',
    file_path_or_reference: clampStr(d.filePathOrReference, 500),
    file_name: clampOptionalStr(d.fileName, 200),
    file_size: typeof d.fileSize === 'number' ? d.fileSize : null,
    mime_type: clampOptionalStr(d.mimeType, 100),
    storage_path: clampOptionalStr(d.storagePath, 500),
    download_url: clampOptionalStr(d.downloadUrl, 2000),
    uploaded_at: clampOptionalStr(d.uploadedAt, 40),
    remarks: clampStr(d.remarks, 500),
  };
}

export function rowToDocument(r: Record<string, unknown>): DocumentRecord {
  return {
    id: String(r.id || ''),
    showroomId: String(r.showroom_id || ''),
    applicationId: r.application_id ? String(r.application_id) : undefined,
    clientId: String(r.client_id || ''),
    vehicleId: String(r.vehicle_id || ''),
    vehicleNumber: String(r.vehicle_number || ''),
    clientName: String(r.client_name || ''),
    documentType: String(r.document_type || '') as DocumentCategory,
    documentNumber: String(r.document_number || ''),
    issueDate: String(r.issue_date || ''),
    expiryDate: String(r.expiry_date || ''),
    receivedStatus: (r.received_status || 'Received') as DocumentCustodyStatus,
    verificationStatus: (r.verification_status || 'Pending') as DocumentVerificationStatus,
    filePathOrReference: String(r.file_path_or_reference || ''),
    fileName: r.file_name ? String(r.file_name) : undefined,
    fileSize: typeof r.file_size === 'number' ? r.file_size : undefined,
    mimeType: r.mime_type ? String(r.mime_type) : undefined,
    storagePath: r.storage_path ? String(r.storage_path) : undefined,
    downloadUrl: r.download_url ? String(r.download_url) : undefined,
    uploadedAt: r.uploaded_at ? String(r.uploaded_at) : undefined,
    remarks: String(r.remarks || ''),
    createdAt: toIsoString(r.created_at),
    updatedAt: r.updated_at ? toIsoString(r.updated_at) : undefined,
  };
}

export function historyToRow(uid: string, h: ApplicationHistoryEntry) {
  return {
    owner_uid: uid,
    id: clampStr(h.id, 64),
    application_id: clampStr(h.applicationId, 64),
    showroom_id: clampStr(h.showroomId, 64),
    client_id: clampStr(h.clientId, 64),
    vehicle_id: clampStr(h.vehicleId, 64),
    previous_status: clampStr(h.previousStatus, 40),
    new_status: clampStr(h.newStatus, 40),
    action_summary: clampStr(h.actionSummary, 200),
    note: clampStr(h.note, 400),
    actor_email: clampStr(h.actorEmail, 120),
    changed_at: clampStr(h.changedAt, 40),
  };
}

export function rowToHistory(r: Record<string, unknown>): ApplicationHistoryEntry {
  return {
    id: String(r.id || ''),
    applicationId: String(r.application_id || ''),
    showroomId: String(r.showroom_id || ''),
    clientId: String(r.client_id || ''),
    vehicleId: String(r.vehicle_id || ''),
    previousStatus: String(r.previous_status || '') as ApplicationHistoryEntry['previousStatus'],
    newStatus: String(r.new_status || 'New') as WorkStatus,
    actionSummary: String(r.action_summary || ''),
    note: String(r.note || ''),
    actorEmail: String(r.actor_email || ''),
    changedAt: String(r.changed_at || ''),
  };
}

export function archiveToRow(uid: string, a: ArchivedRecord) {
  return {
    owner_uid: uid,
    archive_id: clampStr(a.archiveId, 64),
    showroom_id: clampStr(a.showroomId || 'COMMON', 64),
    entity_type: a.entityType,
    entity_id: clampStr(a.entityId, 64),
    summary: clampStr(a.summary, 250),
    deleted_at: clampStr(a.deletedAt, 40),
    deleted_by: clampStr(a.deletedBy, 120),
    data: a.data || {},
  };
}

export function rowToArchive(r: Record<string, unknown>): ArchivedRecord {
  return {
    archiveId: String(r.archive_id || ''),
    showroomId: String(r.showroom_id || 'COMMON'),
    entityType: String(r.entity_type || 'Client') as ArchivedRecord['entityType'],
    entityId: String(r.entity_id || ''),
    summary: String(r.summary || ''),
    deletedAt: String(r.deleted_at || ''),
    deletedBy: String(r.deleted_by || ''),
    data: (r.data && typeof r.data === 'object' ? r.data : {}) as Record<string, unknown>,
  };
}

export function settingsToRow(uid: string, s: SystemSettings) {
  return {
    owner_uid: uid,
    business_name: clampStr(s.businessName, 120),
    tagline: clampStr(s.tagline, 200),
    address: clampStr(s.address, 300),
    mobile: clampStr(s.mobile, 30),
    email: clampStr(s.email, 120),
    rto_license_number: clampOptionalStr(s.rtoLicenseNumber, 60),
    rto_offices: Array.isArray(s.rtoOffices) ? s.rtoOffices : INITIAL_SETTINGS.rtoOffices,
    vehicle_classes: Array.isArray(s.vehicleClasses) ? s.vehicleClasses : INITIAL_SETTINGS.vehicleClasses,
    work_types: Array.isArray(s.workTypes) ? s.workTypes : INITIAL_SETTINGS.workTypes,
    application_statuses: Array.isArray(s.applicationStatuses)
      ? s.applicationStatuses
      : INITIAL_SETTINGS.applicationStatuses,
    document_checklist_map: s.documentChecklistMap || INITIAL_SETTINGS.documentChecklistMap,
  };
}

export function rowToSettings(r: Record<string, unknown>): SystemSettings {
  const mergedChecklist: SystemSettings['documentChecklistMap'] = {
    ...INITIAL_SETTINGS.documentChecklistMap,
  };
  if (r.document_checklist_map && typeof r.document_checklist_map === 'object') {
    for (const [key, val] of Object.entries(r.document_checklist_map as Record<string, unknown>)) {
      if (Array.isArray(val)) {
        mergedChecklist[key] = val as DocumentCategory[];
      }
    }
  }
  return {
    businessName: String(r.business_name || INITIAL_SETTINGS.businessName),
    tagline: String(r.tagline || INITIAL_SETTINGS.tagline),
    address: String(r.address || INITIAL_SETTINGS.address),
    mobile: String(r.mobile || INITIAL_SETTINGS.mobile),
    email: String(r.email || INITIAL_SETTINGS.email),
    rtoLicenseNumber: r.rto_license_number ? String(r.rto_license_number) : INITIAL_SETTINGS.rtoLicenseNumber,
    rtoOffices: Array.isArray(r.rto_offices)
      ? (r.rto_offices as string[])
      : INITIAL_SETTINGS.rtoOffices,
    vehicleClasses: Array.isArray(r.vehicle_classes)
      ? (r.vehicle_classes as string[])
      : INITIAL_SETTINGS.vehicleClasses,
    workTypes: Array.isArray(r.work_types)
      ? (r.work_types as string[])
      : INITIAL_SETTINGS.workTypes,
    applicationStatuses: Array.isArray(r.application_statuses)
      ? (r.application_statuses as string[])
      : INITIAL_SETTINGS.applicationStatuses,
    documentChecklistMap: mergedChecklist,
  };
}

// ---------------------------------------------------------------------------
// Workspace Bootstrap & Seeding
// ---------------------------------------------------------------------------
export async function ensureUserWorkspaceAndSeed(
  user: AuthUser,
  seedDb: AppDatabase
): Promise<void> {
  const client = requireSupabase();
  const uid = user.uid;

  const { data: existingSettings, error: settingsErr } = await client
    .from('rto_settings')
    .select('owner_uid')
    .eq('owner_uid', uid)
    .maybeSingle();

  if (settingsErr) {
    throw new Error(settingsErr.message || 'Failed to verify Supabase workspace tables.');
  }

  if (existingSettings) {
    return;
  }

  if (seedDb.showrooms.length > 0) {
    const { error } = await client
      .from('rto_showrooms')
      .upsert(seedDb.showrooms.map((s) => showroomToRow(uid, s)), { onConflict: 'owner_uid,id' });
    if (error) throw new Error(error.message);
  }

  if (seedDb.clients.length > 0) {
    const { error } = await client
      .from('rto_clients')
      .upsert(seedDb.clients.map((c) => clientToRow(uid, c)), { onConflict: 'owner_uid,id' });
    if (error) throw new Error(error.message);
  }

  if (seedDb.vehicles.length > 0) {
    const { error } = await client
      .from('rto_vehicles')
      .upsert(seedDb.vehicles.map((v) => vehicleToRow(uid, v)), { onConflict: 'owner_uid,id' });
    if (error) throw new Error(error.message);
  }

  if (seedDb.applications.length > 0) {
    const { error } = await client
      .from('rto_applications')
      .upsert(seedDb.applications.map((a) => applicationToRow(uid, a)), {
        onConflict: 'owner_uid,id',
      });
    if (error) throw new Error(error.message);
  }

  if (seedDb.documents.length > 0) {
    const { error } = await client
      .from('rto_documents')
      .upsert(seedDb.documents.map((d) => documentToRow(uid, d)), {
        onConflict: 'owner_uid,id',
      });
    if (error) throw new Error(error.message);
  }

  const initialSettings: SystemSettings = {
    ...seedDb.settings,
    email: user.email || seedDb.settings.email,
  };

  const { error: saveSettingsErr } = await client
    .from('rto_settings')
    .upsert(settingsToRow(uid, initialSettings), { onConflict: 'owner_uid' });
  if (saveSettingsErr) throw new Error(saveSettingsErr.message);
}

// ---------------------------------------------------------------------------
// Workspace Fetch + Realtime Subscription
// ---------------------------------------------------------------------------
export async function fetchWorkspace(uid: string): Promise<AppDatabase> {
  const client = requireSupabase();

  const [
    showroomsRes,
    clientsRes,
    vehiclesRes,
    appsRes,
    docsRes,
    historyRes,
    archiveRes,
    settingsRes,
  ] = await Promise.all([
    client.from('rto_showrooms').select('*').eq('owner_uid', uid),
    client.from('rto_clients').select('*').eq('owner_uid', uid),
    client.from('rto_vehicles').select('*').eq('owner_uid', uid),
    client.from('rto_applications').select('*').eq('owner_uid', uid),
    client.from('rto_documents').select('*').eq('owner_uid', uid),
    client.from('rto_application_history').select('*').eq('owner_uid', uid),
    client.from('rto_archive').select('*').eq('owner_uid', uid),
    client.from('rto_settings').select('*').eq('owner_uid', uid).maybeSingle(),
  ]);

  const errors = [
    showroomsRes.error,
    clientsRes.error,
    vehiclesRes.error,
    appsRes.error,
    docsRes.error,
    historyRes.error,
    archiveRes.error,
    settingsRes.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new Error(errors[0]?.message || 'Failed to load Supabase workspace.');
  }

  return {
    showrooms: (showroomsRes.data || []).map(rowToShowroom),
    clients: (clientsRes.data || []).map(rowToClient),
    vehicles: (vehiclesRes.data || []).map(rowToVehicle),
    applications: (appsRes.data || []).map(rowToApplication),
    documents: (docsRes.data || []).map(rowToDocument),
    applicationHistory: (historyRes.data || []).map(rowToHistory),
    archive: (archiveRes.data || []).map(rowToArchive),
    settings: settingsRes.data ? rowToSettings(settingsRes.data) : { ...INITIAL_SETTINGS },
  };
}

export function subscribeToWorkspace(
  uid: string,
  onPatch: (patch: Partial<AppDatabase>) => void,
  onError?: (err: Error) => void
): () => void {
  const client = requireSupabase();
  let active = true;

  const refreshAll = async () => {
    try {
      const db = await fetchWorkspace(uid);
      if (active) onPatch(db);
    } catch (err) {
      if (active && onError) {
        onError(err instanceof Error ? err : new Error('Supabase sync failed.'));
      }
    }
  };

  void refreshAll();

  const channel = client
    .channel(`rto-workspace-${uid}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', filter: `owner_uid=eq.${uid}` },
      () => {
        void refreshAll();
      }
    )
    .subscribe();

  return () => {
    active = false;
    void client.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// CRUD & Relational Mutations
// ---------------------------------------------------------------------------
export async function saveEntryToSupabase(
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
  const client = requireSupabase();

  const { error: clientErr } = await client
    .from('rto_clients')
    .upsert(clientToRow(uid, entry.client), { onConflict: 'owner_uid,id' });
  if (clientErr) throw new Error(clientErr.message);

  const { error: vehErr } = await client
    .from('rto_vehicles')
    .upsert(vehicleToRow(uid, entry.vehicle), { onConflict: 'owner_uid,id' });
  if (vehErr) throw new Error(vehErr.message);

  const { error: appErr } = await client
    .from('rto_applications')
    .insert(applicationToRow(uid, entry.application));
  if (appErr) throw new Error(appErr.message);

  const { error: hisErr } = await client
    .from('rto_application_history')
    .insert(historyToRow(uid, entry.historyEntry));
  if (hisErr) throw new Error(hisErr.message);
}

export async function upsertShowroomInSupabase(
  uid: string,
  showroom: Showroom
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('rto_showrooms')
    .upsert(showroomToRow(uid, showroom), { onConflict: 'owner_uid,id' });
  if (error) throw new Error(error.message);
}

export async function deleteShowroomInSupabase(uid: string, showroomId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('rto_showrooms')
    .delete()
    .eq('owner_uid', uid)
    .eq('id', showroomId);
  if (error) throw new Error(error.message);
}

export async function upsertClientInSupabase(uid: string, c: Client): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('rto_clients')
    .upsert(clientToRow(uid, c), { onConflict: 'owner_uid,id' });
  if (error) throw new Error(error.message);
}

export async function upsertVehicleInSupabase(uid: string, v: Vehicle): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('rto_vehicles')
    .upsert(vehicleToRow(uid, v), { onConflict: 'owner_uid,id' });
  if (error) throw new Error(error.message);
}

export async function updateApplicationInSupabase(
  uid: string,
  app: RTOApplication,
  historyEntry?: ApplicationHistoryEntry
): Promise<void> {
  const client = requireSupabase();
  const row = applicationToRow(uid, app);
  const { error } = await client
    .from('rto_applications')
    .update({
      showroom_id: row.showroom_id,
      client_name: row.client_name,
      vehicle_number: row.vehicle_number,
      work_type: row.work_type,
      application_number: row.application_number,
      rto_office: row.rto_office,
      application_date: row.application_date,
      submission_date: row.submission_date,
      expected_completion_date: row.expected_completion_date,
      completion_date: row.completion_date,
      required_documents: row.required_documents,
      work_status: row.work_status,
      work_description: row.work_description,
      remarks: row.remarks,
      updated_at: new Date().toISOString(),
    })
    .eq('owner_uid', uid)
    .eq('id', app.id);
  if (error) throw new Error(error.message);

  if (historyEntry) {
    const { error: hisErr } = await client
      .from('rto_application_history')
      .insert(historyToRow(uid, historyEntry));
    if (hisErr) throw new Error(hisErr.message);
  }
}

export async function updateApplicationStatusWithHistoryInSupabase(
  uid: string,
  appId: string,
  workStatus: WorkStatus,
  historyEntry: ApplicationHistoryEntry,
  completionDate?: string
): Promise<void> {
  const client = requireSupabase();
  const patch: Record<string, unknown> = {
    work_status: workStatus,
    updated_at: new Date().toISOString(),
  };
  if (completionDate) {
    patch.completion_date = clampStr(completionDate, 20);
  }

  const { error } = await client
    .from('rto_applications')
    .update(patch)
    .eq('owner_uid', uid)
    .eq('id', appId);
  if (error) throw new Error(error.message);

  const { error: hisErr } = await client
    .from('rto_application_history')
    .insert(historyToRow(uid, historyEntry));
  if (hisErr) throw new Error(hisErr.message);
}

export async function createDocumentRecordInSupabase(
  uid: string,
  docRec: DocumentRecord
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('rto_documents')
    .insert(documentToRow(uid, docRec));
  if (error) throw new Error(error.message);
}

export async function updateDocumentRecordInSupabase(
  uid: string,
  docRec: DocumentRecord
): Promise<void> {
  const client = requireSupabase();
  const row = documentToRow(uid, docRec);
  const { error } = await client
    .from('rto_documents')
    .update({
      showroom_id: row.showroom_id,
      application_id: row.application_id,
      vehicle_number: row.vehicle_number,
      client_name: row.client_name,
      document_type: row.document_type,
      document_number: row.document_number,
      issue_date: row.issue_date,
      expiry_date: row.expiry_date,
      received_status: row.received_status,
      verification_status: row.verification_status,
      file_path_or_reference: row.file_path_or_reference,
      file_name: row.file_name,
      file_size: row.file_size,
      mime_type: row.mime_type,
      storage_path: row.storage_path,
      download_url: row.download_url,
      uploaded_at: row.uploaded_at,
      remarks: row.remarks,
      updated_at: new Date().toISOString(),
    })
    .eq('owner_uid', uid)
    .eq('id', docRec.id);
  if (error) throw new Error(error.message);
}

const ARCHIVE_TABLE_MAP: Record<'clients' | 'vehicles' | 'applications' | 'documents', string> = {
  clients: 'rto_clients',
  vehicles: 'rto_vehicles',
  applications: 'rto_applications',
  documents: 'rto_documents',
};

export async function deleteAndArchiveInSupabase(
  uid: string,
  colName: 'clients' | 'vehicles' | 'applications' | 'documents',
  docId: string,
  archiveRecord: ArchivedRecord
): Promise<void> {
  const client = requireSupabase();
  const tableName = ARCHIVE_TABLE_MAP[colName];

  const { error: arcErr } = await client
    .from('rto_archive')
    .upsert(archiveToRow(uid, archiveRecord), { onConflict: 'owner_uid,archive_id' });
  if (arcErr) throw new Error(arcErr.message);

  const { error: delErr } = await client
    .from(tableName)
    .delete()
    .eq('owner_uid', uid)
    .eq('id', docId);
  if (delErr) throw new Error(delErr.message);
}

export async function restoreFromArchiveInSupabase(
  uid: string,
  rec: ArchivedRecord
): Promise<void> {
  const client = requireSupabase();

  if (rec.entityType === 'Client') {
    const { error } = await client
      .from('rto_clients')
      .upsert(clientToRow(uid, rec.data as unknown as Client), { onConflict: 'owner_uid,id' });
    if (error) throw new Error(error.message);
  } else if (rec.entityType === 'Vehicle') {
    const { error } = await client
      .from('rto_vehicles')
      .upsert(vehicleToRow(uid, rec.data as unknown as Vehicle), { onConflict: 'owner_uid,id' });
    if (error) throw new Error(error.message);
  } else if (rec.entityType === 'Application') {
    const { error } = await client
      .from('rto_applications')
      .upsert(applicationToRow(uid, rec.data as unknown as RTOApplication), {
        onConflict: 'owner_uid,id',
      });
    if (error) throw new Error(error.message);
  } else if (rec.entityType === 'Document') {
    const { error } = await client
      .from('rto_documents')
      .upsert(documentToRow(uid, rec.data as unknown as DocumentRecord), {
        onConflict: 'owner_uid,id',
      });
    if (error) throw new Error(error.message);
  }

  const { error: delErr } = await client
    .from('rto_archive')
    .delete()
    .eq('owner_uid', uid)
    .eq('archive_id', rec.archiveId);
  if (delErr) throw new Error(delErr.message);
}

export async function deleteArchiveRecordInSupabase(
  uid: string,
  archiveId: string
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('rto_archive')
    .delete()
    .eq('owner_uid', uid)
    .eq('archive_id', archiveId);
  if (error) throw new Error(error.message);
}

export async function clearArchiveInSupabase(uid: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('rto_archive').delete().eq('owner_uid', uid);
  if (error) throw new Error(error.message);
}

export async function saveSettingsInSupabase(
  uid: string,
  settings: SystemSettings
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('rto_settings')
    .upsert(settingsToRow(uid, settings), { onConflict: 'owner_uid' });
  if (error) throw new Error(error.message);
}

export async function clearAllTransactionalRecordsInSupabase(uid: string): Promise<void> {
  const client = requireSupabase();
  for (const tbl of [
    'rto_application_history',
    'rto_documents',
    'rto_applications',
    'rto_vehicles',
    'rto_clients',
    'rto_archive',
  ]) {
    const { error } = await client.from(tbl).delete().eq('owner_uid', uid);
    if (error) throw new Error(error.message);
  }
  await saveSettingsInSupabase(uid, INITIAL_SETTINGS);
}

export async function importBackupToSupabase(
  uid: string,
  backup: AppDatabase
): Promise<void> {
  const client = requireSupabase();

  if (backup.showrooms.length > 0) {
    const { error } = await client
      .from('rto_showrooms')
      .upsert(backup.showrooms.map((s) => showroomToRow(uid, s)), { onConflict: 'owner_uid,id' });
    if (error) throw new Error(error.message);
  }

  await saveSettingsInSupabase(uid, backup.settings);

  if (backup.clients.length > 0) {
    const { error } = await client
      .from('rto_clients')
      .upsert(backup.clients.map((c) => clientToRow(uid, c)), { onConflict: 'owner_uid,id' });
    if (error) throw new Error(error.message);
  }

  if (backup.vehicles.length > 0) {
    const { error } = await client
      .from('rto_vehicles')
      .upsert(backup.vehicles.map((v) => vehicleToRow(uid, v)), { onConflict: 'owner_uid,id' });
    if (error) throw new Error(error.message);
  }

  if (backup.applications.length > 0) {
    const { error } = await client
      .from('rto_applications')
      .upsert(backup.applications.map((a) => applicationToRow(uid, a)), {
        onConflict: 'owner_uid,id',
      });
    if (error) throw new Error(error.message);
  }

  if (backup.documents.length > 0) {
    const { error } = await client
      .from('rto_documents')
      .upsert(backup.documents.map((d) => documentToRow(uid, d)), {
        onConflict: 'owner_uid,id',
      });
    if (error) throw new Error(error.message);
  }

  if (backup.applicationHistory.length > 0) {
    const { error } = await client
      .from('rto_application_history')
      .upsert(backup.applicationHistory.map((h) => historyToRow(uid, h)), {
        onConflict: 'owner_uid,id',
      });
    if (error) throw new Error(error.message);
  }

  if (backup.archive.length > 0) {
    const { error } = await client
      .from('rto_archive')
      .upsert(backup.archive.map((arc) => archiveToRow(uid, arc)), {
        onConflict: 'owner_uid,archive_id',
      });
    if (error) throw new Error(error.message);
  }
}
