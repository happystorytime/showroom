import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { ShieldCheck, LogIn, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import type {
  ApplicationHistoryEntry,
  ArchivedRecord,
  Client,
  DocumentRecord,
  RTOApplication,
  Showroom,
  SystemSettings,
  Vehicle,
  WorkStatus,
} from './types';
import {
  createEmptyWorkspace,
  getNextApplicationId,
  getNextArchiveId,
  getNextClientId,
  getNextDocumentId,
  getNextHistoryId,
  getNextShowroomId,
  getNextVehicleId,
  loadUiPrefs,
  saveUiPrefs,
  type AppDatabase,
} from './utils/storage';
import { googleSignIn, initAuth, logout } from './utils/auth';
import {
  clearAllTransactionalRecordsInFirestore,
  clearArchiveInFirestore,
  createDocumentRecordInFirestore,
  deleteAndArchiveInFirestore,
  deleteArchiveDocInFirestore,
  deleteShowroomInFirestore,
  ensureUserWorkspaceAndSeed,
  importBackupToFirestore,
  restoreFromArchiveInFirestore,
  saveEntryToFirestore,
  saveSettingsInFirestore,
  subscribeToWorkspace,
  testFirestoreConnection,
  updateApplicationInFirestore,
  updateApplicationStatusWithHistoryInFirestore,
  updateDocumentRecordInFirestore,
  upsertClientInFirestore,
  upsertShowroomInFirestore,
  upsertVehicleInFirestore,
} from './utils/firestoreService';
import {
  evaluateApplicationChecklist,
  getDocumentAlertStatus,
  getTodayDateStr,
  isOverdue,
} from './utils/pureCalculations';
import { downloadBlob, generateKarnatakaRTOWorkbook } from './utils/excelGenerator';

import { Navbar, type AppTab } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { ShowroomManager } from './components/ShowroomManager';
import { DataEntryForm } from './components/DataEntryForm';
import { ClientDatabase } from './components/ClientDatabase';
import { VehicleDatabase } from './components/VehicleDatabase';
import { RTOWorkManager } from './components/RTOWorkManager';
import { DocumentManager, type DocumentUploadPreset } from './components/DocumentManager';
import { RemindersAlerts } from './components/RemindersAlerts';
import { ReportsManager } from './components/ReportsManager';
import { ArchiveManager } from './components/ArchiveManager';
import { SettingsModal } from './components/SettingsModal';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';
import { VbaDownloadModal } from './components/VbaDownloadModal';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [db, setDb] = useState<AppDatabase>(() => createEmptyWorkspace());
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const uiPrefs = useMemo(() => loadUiPrefs(), []);
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [activeShowroomId, setActiveShowroomId] = useState<string>(
    uiPrefs.activeShowroomId || 'ALL'
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    Boolean(uiPrefs.sidebarCollapsed)
  );
  const [searchSeed, setSearchSeed] = useState<{ term: string; nonce: number }>({
    term: '',
    nonce: 0,
  });
  const [docPreset, setDocPreset] = useState<DocumentUploadPreset | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sheetsOpen, setSheetsOpen] = useState(false);
  const [vbaOpen, setVbaOpen] = useState(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  useEffect(() => {
    testFirestoreConnection();
    const unsub = initAuth((authUser) => {
      setUser(authUser);
      setAuthInitialized(true);
      if (!authUser) {
        setDb(createEmptyWorkspace());
        setWorkspaceReady(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    let unsubWorkspace: (() => void) | undefined;

    (async () => {
      try {
        setSyncError(null);
        await ensureUserWorkspaceAndSeed(user, createEmptyWorkspace());
        if (!active) return;
        unsubWorkspace = subscribeToWorkspace(
          user.uid,
          (patch) => {
            setDb((prev) => ({ ...prev, ...patch }));
            setWorkspaceReady(true);
          },
          (err) => {
            setSyncError(err.message);
          }
        );
      } catch (err) {
        if (active) {
          setSyncError(err instanceof Error ? err.message : 'Failed to load cloud workspace.');
          setWorkspaceReady(true);
        }
      }
    })();

    return () => {
      active = false;
      if (unsubWorkspace) unsubWorkspace();
    };
  }, [user]);

  const handleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (!res) {
        setAuthError(
          'Sign-in popup was closed before completing Google authentication. Click "Sign in with Google Workspace" to try again.'
        );
      }
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Google Sign-In failed. Please try again.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
  };

  const handleShowroomChange = (nextId: string) => {
    setActiveShowroomId(nextId);
    saveUiPrefs({ activeShowroomId: nextId });
  };

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      saveUiPrefs({ sidebarCollapsed: next });
      return next;
    });
  };

  const navigateWithSearch = (tab: AppTab, term = '') => {
    setActiveTab(tab);
    if (term) {
      setSearchSeed((prev) => ({ term, nonce: prev.nonce + 1 }));
    } else {
      setSearchSeed({ term: '', nonce: 0 });
    }
  };

  const todayStr = getTodayDateStr();
  const totalAlertCount = useMemo(() => {
    const vehAlerts = db.vehicles.filter((v) => {
      const rc = getDocumentAlertStatus(v.rcValidity, todayStr);
      const ins = getDocumentAlertStatus(v.insuranceExpiry, todayStr);
      return rc === 'expired' || rc === 'expiring_soon' || ins === 'expired' || ins === 'expiring_soon';
    }).length;
    const appAlerts = db.applications.filter((a) => {
      if (a.workStatus === 'Completed' || a.workStatus === 'Rejected') return false;
      if (isOverdue(a.expectedCompletionDate, a.workStatus, todayStr)) return true;
      return evaluateApplicationChecklist(a, db.documents, db.settings).status !== 'Documents Complete';
    }).length;
    return vehAlerts + appAlerts;
  }, [db.vehicles, db.applications, db.documents, db.settings, todayStr]);

  // CRUD Handlers
  const handleExportExcel = async () => {
    try {
      const blob = await generateKarnatakaRTOWorkbook(db);
      downloadBlob(blob, `Karnataka_RTO_MultiShowroom_${getTodayDateStr()}.xlsx`);
      showToast('success', 'Excel workbook exported successfully.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Excel export failed.');
    }
  };

  const handleSaveEntry = async (entry: {
    client: Client;
    clientExists: boolean;
    vehicle: Vehicle;
    vehicleExists: boolean;
    application: RTOApplication;
  }) => {
    if (!user) return;
    const historyEntry: ApplicationHistoryEntry = {
      id: getNextHistoryId(db.applicationHistory),
      applicationId: entry.application.id,
      showroomId: entry.application.showroomId,
      clientId: entry.client.id,
      vehicleId: entry.vehicle.id,
      previousStatus: '',
      newStatus: entry.application.workStatus,
      actionSummary: `Created application (${entry.application.workStatus})`,
      note: entry.application.remarks || 'Initial RTO work registration',
      actorEmail: user.email || 'agent@rto.local',
      changedAt: new Date().toISOString(),
    };
    await saveEntryToFirestore(user.uid, { ...entry, historyEntry });
    showToast('success', `Saved RTO Application ${entry.application.id}`);
  };

  const handleSaveShowroom = async (showroom: Showroom, isUpdate: boolean) => {
    if (!user) return;
    await upsertShowroomInFirestore(user.uid, showroom, isUpdate);
    showToast('success', `${isUpdate ? 'Updated' : 'Added'} showroom ${showroom.name}`);
  };

  const handleDeleteShowroom = async (showroomId: string) => {
    if (!user) return;
    await deleteShowroomInFirestore(user.uid, showroomId);
    if (activeShowroomId === showroomId) handleShowroomChange('ALL');
    showToast('success', 'Showroom deleted.');
  };

  const handleSaveClient = async (client: Client, isUpdate: boolean) => {
    if (!user) return;
    await upsertClientInFirestore(user.uid, client, isUpdate);
    showToast('success', `${isUpdate ? 'Updated' : 'Registered'} client ${client.name}`);
  };

  const handleDeleteClient = async (client: Client) => {
    if (!user) return;
    const arc: ArchivedRecord = {
      archiveId: getNextArchiveId(db.archive),
      showroomId: client.createdShowroomId || 'COMMON',
      entityType: 'Client',
      entityId: client.id,
      summary: `${client.name} (${client.mobile})`,
      data: client as unknown as Record<string, unknown>,
      deletedAt: new Date().toLocaleString(),
      deletedBy: user.email || 'RTO Agent',
    };
    await deleteAndArchiveInFirestore(user.uid, 'clients', client.id, arc);
    showToast('success', `Client ${client.name} moved to Safety Archive.`);
  };

  const handleSaveVehicle = async (vehicle: Vehicle, isUpdate: boolean) => {
    if (!user) return;
    await upsertVehicleInFirestore(user.uid, vehicle, isUpdate);
    showToast('success', `${isUpdate ? 'Updated' : 'Enrolled'} vehicle ${vehicle.vehicleNumber}`);
  };

  const handleDeleteVehicle = async (vehicle: Vehicle) => {
    if (!user) return;
    const arc: ArchivedRecord = {
      archiveId: getNextArchiveId(db.archive),
      showroomId: 'COMMON',
      entityType: 'Vehicle',
      entityId: vehicle.id,
      summary: `${vehicle.vehicleNumber} — ${vehicle.ownerName}`,
      data: vehicle as unknown as Record<string, unknown>,
      deletedAt: new Date().toLocaleString(),
      deletedBy: user.email || 'RTO Agent',
    };
    await deleteAndArchiveInFirestore(user.uid, 'vehicles', vehicle.id, arc);
    showToast('success', `Vehicle ${vehicle.vehicleNumber} moved to Safety Archive.`);
  };

  const handleUpdateApplication = async (app: RTOApplication, note?: string) => {
    if (!user) return;
    const historyEntry: ApplicationHistoryEntry | undefined = note
      ? {
          id: getNextHistoryId(db.applicationHistory),
          applicationId: app.id,
          showroomId: app.showroomId,
          clientId: app.clientId,
          vehicleId: app.vehicleId,
          previousStatus: app.workStatus,
          newStatus: app.workStatus,
          actionSummary: 'Application Details Updated',
          note,
          actorEmail: user.email || 'agent@rto.local',
          changedAt: new Date().toISOString(),
        }
      : undefined;
    await updateApplicationInFirestore(user.uid, app, historyEntry);
    showToast('success', `Updated application ${app.id}`);
  };

  const handleChangeAppStatus = async (
    app: RTOApplication,
    nextStatus: WorkStatus,
    note: string
  ) => {
    if (!user) return;
    const historyEntry: ApplicationHistoryEntry = {
      id: getNextHistoryId(db.applicationHistory),
      applicationId: app.id,
      showroomId: app.showroomId,
      clientId: app.clientId,
      vehicleId: app.vehicleId,
      previousStatus: app.workStatus,
      newStatus: nextStatus,
      actionSummary: `Status: ${app.workStatus} -> ${nextStatus}`,
      note: note || `Moved from ${app.workStatus} to ${nextStatus}`,
      actorEmail: user.email || 'agent@rto.local',
      changedAt: new Date().toISOString(),
    };
    const completionDate = nextStatus === 'Completed' ? getTodayDateStr() : undefined;
    await updateApplicationStatusWithHistoryInFirestore(
      user.uid,
      app.id,
      nextStatus,
      historyEntry,
      completionDate
    );
    showToast('success', `${app.id} status changed to ${nextStatus}`);
  };

  const handleDeleteApplication = async (app: RTOApplication) => {
    if (!user) return;
    const arc: ArchivedRecord = {
      archiveId: getNextArchiveId(db.archive),
      showroomId: app.showroomId,
      entityType: 'Application',
      entityId: app.id,
      summary: `${app.workType} · ${app.vehicleNumber} (${app.clientName})`,
      data: app as unknown as Record<string, unknown>,
      deletedAt: new Date().toLocaleString(),
      deletedBy: user.email || 'RTO Agent',
    };
    await deleteAndArchiveInFirestore(user.uid, 'applications', app.id, arc);
    showToast('success', `Application ${app.id} moved to Safety Archive.`);
  };

  const handleCreateDocument = async (docRec: DocumentRecord) => {
    if (!user) return;
    await createDocumentRecordInFirestore(user.uid, docRec);
    showToast('success', `Uploaded ${docRec.documentType} for ${docRec.vehicleNumber}`);
  };

  const handleUpdateDocument = async (docRec: DocumentRecord) => {
    if (!user) return;
    await updateDocumentRecordInFirestore(user.uid, docRec);
    showToast('success', `Updated document ${docRec.id}`);
  };

  const handleDeleteDocument = async (docRec: DocumentRecord) => {
    if (!user) return;
    const arc: ArchivedRecord = {
      archiveId: getNextArchiveId(db.archive),
      showroomId: docRec.showroomId,
      entityType: 'Document',
      entityId: docRec.id,
      summary: `${docRec.documentType} · ${docRec.vehicleNumber}`,
      data: docRec as unknown as Record<string, unknown>,
      deletedAt: new Date().toLocaleString(),
      deletedBy: user.email || 'RTO Agent',
    };
    await deleteAndArchiveInFirestore(user.uid, 'documents', docRec.id, arc);
    showToast('success', `Document ${docRec.id} deleted and archived.`);
  };

  const handleRestoreArchive = async (rec: ArchivedRecord) => {
    if (!user) return;
    await restoreFromArchiveInFirestore(user.uid, rec);
    showToast('success', `Restored ${rec.entityType} ${rec.entityId}`);
  };

  const handleDeleteArchiveForever = async (archiveId: string) => {
    if (!user) return;
    await deleteArchiveDocInFirestore(user.uid, archiveId);
    showToast('success', 'Archived item permanently deleted.');
  };

  const handleClearArchive = async () => {
    if (!user) return;
    await clearArchiveInFirestore(
      user.uid,
      db.archive.map((a) => a.archiveId)
    );
    showToast('success', 'Safety archive emptied.');
  };

  const handleUpdateSettings = async (settings: SystemSettings) => {
    if (!user) return;
    await saveSettingsInFirestore(user.uid, settings);
    showToast('success', 'Settings updated.');
  };

  const handleImportDatabase = async (newDb: AppDatabase) => {
    if (!user) return;
    await importBackupToFirestore(user.uid, newDb);
    showToast('success', 'JSON backup restored to Firestore.');
  };

  const handleClearAllRecords = async () => {
    if (!user) return;
    await clearAllTransactionalRecordsInFirestore(user.uid);
    showToast('success', 'All transactional records cleared.');
  };

  // Auth Gate: Initialization Loading
  if (!authInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Initializing Karnataka RTO Workspace...</p>
        </div>
      </div>
    );
  }

  // Auth Gate: Sign-In Screen
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-slate-900">
                Karnataka RTO Agent Desk
              </h1>
              <p className="text-xs text-slate-500">
                Multi-Showroom Document & RTO Work System
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Workspace Capabilities</p>
            <ul className="space-y-1.5 list-disc pl-4 leading-relaxed">
              <li>Manage 2–3+ partner showrooms from one console</li>
              <li>One common client & vehicle directory across showrooms</li>
              <li>13 Karnataka RTO work categories & status history logs</li>
              <li>Firebase Storage document uploads, checklists & Excel/PDF exports</li>
            </ul>
          </div>

          {authError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="button"
            disabled={authLoading}
            onClick={handleSignIn}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-60"
          >
            {authLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            <span>{authLoading ? 'Signing in...' : 'Sign in with Google Workspace'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <Navbar
      activeTab={activeTab}
      onTabChange={(t) => {
        setActiveTab(t);
        setSearchSeed({ term: '', nonce: 0 });
      }}
      showrooms={db.showrooms}
      activeShowroomId={activeShowroomId}
      onShowroomChange={handleShowroomChange}
      clients={db.clients}
      vehicles={db.vehicles}
      applications={db.applications}
      onGlobalSelect={({ tab, searchTerm }) => navigateWithSearch(tab, searchTerm)}
      alertCount={totalAlertCount}
      settings={db.settings}
      userEmail={user.email}
      userName={user.displayName}
      onExportExcel={handleExportExcel}
      onOpenVba={() => setVbaOpen(true)}
      onOpenGoogleSheets={() => setSheetsOpen(true)}
      onOpenSettings={() => setSettingsOpen(true)}
      onSignOut={handleSignOut}
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebarCollapse={handleToggleSidebar}
    >
      {/* Inline Toast & Error Banners */}
      {toast && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium print:hidden ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {syncError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 print:hidden">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Cloud sync warning: {syncError}</span>
        </div>
      )}

      {!workspaceReady ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-500 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span>Loading your showrooms & RTO records...</span>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <Dashboard
              showrooms={db.showrooms}
              activeShowroomId={activeShowroomId}
              onShowroomChange={handleShowroomChange}
              clients={db.clients}
              vehicles={db.vehicles}
              applications={db.applications}
              documents={db.documents}
              settings={db.settings}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'showrooms' && (
            <ShowroomManager
              showrooms={db.showrooms}
              applications={db.applications}
              documents={db.documents}
              settings={db.settings}
              onSaveShowroom={handleSaveShowroom}
              onDeleteShowroom={handleDeleteShowroom}
              onSelectShowroomWorkspace={(id) => {
                handleShowroomChange(id);
                setActiveTab('rto-work');
              }}
              getNextShowroomId={() => getNextShowroomId(db.showrooms)}
            />
          )}

          {activeTab === 'data-entry' && (
            <DataEntryForm
              showrooms={db.showrooms}
              activeShowroomId={activeShowroomId}
              clients={db.clients}
              vehicles={db.vehicles}
              settings={db.settings}
              onSaveEntry={handleSaveEntry}
              getNextClientId={() => getNextClientId(db.clients)}
              getNextVehicleId={() => getNextVehicleId(db.vehicles)}
              getNextApplicationId={() => getNextApplicationId(db.applications)}
              onDoneNavigate={() => setActiveTab('rto-work')}
            />
          )}

          {activeTab === 'clients' && (
            <ClientDatabase
              key={`clients-${searchSeed.nonce}`}
              clients={db.clients}
              vehicles={db.vehicles}
              applications={db.applications}
              documents={db.documents}
              showrooms={db.showrooms}
              settings={db.settings}
              activeShowroomId={activeShowroomId}
              initialSearch={searchSeed.term}
              onSaveClient={handleSaveClient}
              onDeleteClient={handleDeleteClient}
              getNextClientId={() => getNextClientId(db.clients)}
            />
          )}

          {activeTab === 'vehicles' && (
            <VehicleDatabase
              key={`vehicles-${searchSeed.nonce}`}
              vehicles={db.vehicles}
              clients={db.clients}
              settings={db.settings}
              initialSearch={searchSeed.term}
              onSaveVehicle={handleSaveVehicle}
              onDeleteVehicle={handleDeleteVehicle}
              getNextVehicleId={() => getNextVehicleId(db.vehicles)}
            />
          )}

          {activeTab === 'rto-work' && (
            <RTOWorkManager
              key={`rto-${searchSeed.nonce}`}
              applications={db.applications}
              applicationHistory={db.applicationHistory}
              clients={db.clients}
              documents={db.documents}
              showrooms={db.showrooms}
              settings={db.settings}
              activeShowroomId={activeShowroomId}
              initialSearch={searchSeed.term}
              onUpdateApplication={handleUpdateApplication}
              onChangeStatus={handleChangeAppStatus}
              onDeleteApplication={handleDeleteApplication}
              onQuickUploadForApp={(app) => {
                setDocPreset({
                  showroomId: app.showroomId,
                  clientId: app.clientId,
                  vehicleId: app.vehicleId,
                  applicationId: app.id,
                });
                setActiveTab('documents');
              }}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentManager
              key={`docs-${docPreset?.applicationId || 'none'}-${docPreset?.documentType || 'none'}`}
              uid={user.uid}
              documents={db.documents}
              applications={db.applications}
              clients={db.clients}
              vehicles={db.vehicles}
              showrooms={db.showrooms}
              settings={db.settings}
              activeShowroomId={activeShowroomId}
              uploadPreset={docPreset}
              onClearPreset={() => setDocPreset(null)}
              onCreateDocument={handleCreateDocument}
              onUpdateDocument={handleUpdateDocument}
              onDeleteDocument={handleDeleteDocument}
              getNextDocumentId={() => getNextDocumentId(db.documents)}
            />
          )}

          {activeTab === 'alerts' && (
            <RemindersAlerts
              vehicles={db.vehicles}
              applications={db.applications}
              documents={db.documents}
              showrooms={db.showrooms}
              settings={db.settings}
              activeShowroomId={activeShowroomId}
              onNavigate={(tab, term) => navigateWithSearch(tab, term)}
              onQuickUpload={(preset) => {
                setDocPreset(preset);
                setActiveTab('documents');
              }}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsManager
              db={db}
              activeShowroomId={activeShowroomId}
              onExportExcel={handleExportExcel}
            />
          )}

          {activeTab === 'archive' && (
            <ArchiveManager
              archive={db.archive}
              showrooms={db.showrooms}
              activeShowroomId={activeShowroomId}
              onRestoreRecord={handleRestoreArchive}
              onDeleteForever={handleDeleteArchiveForever}
              onClearAllArchive={handleClearArchive}
            />
          )}
        </>
      )}

      {/* Global Modals */}
      {settingsOpen && (
        <SettingsModal
          db={db}
          onUpdateSettings={handleUpdateSettings}
          onImportDatabase={handleImportDatabase}
          onClearAllRecords={handleClearAllRecords}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {sheetsOpen && (
        <GoogleSheetsSyncModal db={db} onClose={() => setSheetsOpen(false)} />
      )}

      {vbaOpen && <VbaDownloadModal onClose={() => setVbaOpen(false)} />}
    </Navbar>
  );
}
