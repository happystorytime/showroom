import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { DataEntryForm } from './components/DataEntryForm';
import { ClientDatabase } from './components/ClientDatabase';
import { VehicleDatabase } from './components/VehicleDatabase';
import { RTOWorkManager } from './components/RTOWorkManager';
import { DocumentManager } from './components/DocumentManager';
import { TractorShowroom } from './components/TractorShowroom';
import { TractorExchangeManager } from './components/TractorExchange';
import { LoanManager } from './components/LoanManager';
import { PaymentManager } from './components/PaymentManager';
import { ExpenseManager } from './components/ExpenseManager';
import { RemindersAlerts } from './components/RemindersAlerts';
import { ReportsManager } from './components/ReportsManager';
import { ArchiveManager } from './components/ArchiveManager';
import { SettingsModal } from './components/SettingsModal';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';
import { VbaDownloadModal } from './components/VbaDownloadModal';

import {
  AppDatabase,
  loadDatabase,
  saveDatabase,
  resetDatabaseToDefault,
  getNextArchiveId,
} from './utils/storage';
import {
  Client,
  Vehicle,
  RTOApplication,
  PaymentTransaction,
  DocumentRecord,
  TractorItem,
  TractorExchange,
  LoanRecord,
  ExpenseRecord,
  ArchivedRecord,
  SystemSettings,
  WorkStatus,
  TractorStockStatus,
  LoanStatus,
} from './types';
import { generateKarnatakaRTOWorkbook, downloadBlob } from './utils/excelGenerator';
import { initAuth, googleSignIn, logout, getAccessToken } from './utils/auth';
import { User } from 'firebase/auth';
import { getDocumentAlertStatus, isOverdue } from './utils/pureCalculations';

export default function App() {
  const [db, setDb] = useState<AppDatabase>(() => loadDatabase());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGoogleSheetsOpen, setIsGoogleSheetsOpen] = useState(false);
  const [isVbaModalOpen, setIsVbaModalOpen] = useState(false);

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Current date
  const currentDateStr = '2026-11-12';

  // Listen to Firebase Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
      }
    } catch (err) {
      console.error('Google Sign In failed:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
  };

  // Save changes to localStorage & state
  const updateDatabase = (newDb: AppDatabase) => {
    setDb(newDb);
    saveDatabase(newDb);
  };

  // 1. Save New Data Entry (Multi-table transaction)
  const handleSaveNewEntry = (entry: {
    client: Client;
    vehicle: Vehicle;
    application: RTOApplication;
    payment?: PaymentTransaction;
  }) => {
    const clients = [...db.clients];
    const existingClientIdx = clients.findIndex((c) => c.id === entry.client.id);
    if (existingClientIdx >= 0) {
      clients[existingClientIdx] = entry.client;
    } else {
      clients.push(entry.client);
    }

    const vehicles = [...db.vehicles];
    const existingVehIdx = vehicles.findIndex((v) => v.vehicleNumber === entry.vehicle.vehicleNumber);
    if (existingVehIdx >= 0) {
      vehicles[existingVehIdx] = entry.vehicle;
    } else {
      vehicles.push(entry.vehicle);
    }

    const applications = [entry.application, ...db.applications];
    const payments = entry.payment ? [entry.payment, ...db.payments] : db.payments;

    updateDatabase({
      ...db,
      clients,
      vehicles,
      applications,
      payments,
    });
  };

  // 2. Update Application
  const handleUpdateApplication = (updatedApp: RTOApplication) => {
    const applications = db.applications.map((a) => (a.id === updatedApp.id ? updatedApp : a));
    updateDatabase({ ...db, applications });
  };

  // 3. Update RTO Application Status
  const handleUpdateAppStatus = (appId: string, status: WorkStatus) => {
    const applications = db.applications.map((a) => {
      if (a.id === appId) {
        return {
          ...a,
          workStatus: status,
          completionDate: status === 'Completed' ? currentDateStr : a.completionDate,
          updatedAt: new Date().toISOString(),
        };
      }
      return a;
    });
    updateDatabase({ ...db, applications });
  };

  // 4. Record New Payment
  const handleAddPayment = (payment: PaymentTransaction) => {
    const payments = [payment, ...db.payments];

    // Update the corresponding application balance
    const applications = db.applications.map((a) => {
      if (a.id === payment.applicationId) {
        const newPaid = a.advancePaid + payment.additionalPayment;
        const newBal = Math.max(0, a.totalFees - newPaid);
        return {
          ...a,
          advancePaid: newPaid,
          balanceAmount: newBal,
          updatedAt: new Date().toISOString(),
        };
      }
      return a;
    });

    updateDatabase({ ...db, payments, applications });
  };

  // 5. Delete and Archive
  const handleDeleteRecord = (
    type: 'Client' | 'Vehicle' | 'Application' | 'Tractor' | 'Exchange' | 'Loan' | 'Payment' | 'Expense' | 'Document',
    id: string
  ) => {
    let summary = `Deleted ${type} with ID ${id}`;
    let itemData: any = null;

    let clients = [...db.clients];
    let vehicles = [...db.vehicles];
    let applications = [...db.applications];
    let tractors = [...db.tractors];
    let exchanges = [...db.exchanges];
    let loans = [...db.loans];
    let payments = [...db.payments];
    let expenses = [...db.expenses];
    let documents = [...db.documents];

    if (type === 'Client') {
      const found = clients.find((c) => c.id === id);
      if (found) {
        summary = `Client: ${found.name} (${found.mobile})`;
        itemData = found;
        clients = clients.filter((c) => c.id !== id);
      }
    } else if (type === 'Vehicle') {
      const found = vehicles.find((v) => v.id === id);
      if (found) {
        summary = `Vehicle: ${found.vehicleNumber} (${found.brand} ${found.model})`;
        itemData = found;
        vehicles = vehicles.filter((v) => v.id !== id);
      }
    } else if (type === 'Application') {
      const found = applications.find((a) => a.id === id);
      if (found) {
        summary = `Application: ${found.id} - ${found.workType} (${found.vehicleNumber})`;
        itemData = found;
        applications = applications.filter((a) => a.id !== id);
      }
    } else if (type === 'Tractor') {
      const found = tractors.find((t) => t.id === id);
      if (found) {
        summary = `Tractor: ${found.brand} ${found.model} (${found.registrationNumber})`;
        itemData = found;
        tractors = tractors.filter((t) => t.id !== id);
      }
    } else if (type === 'Exchange') {
      const found = exchanges.find((e) => e.id === id);
      if (found) {
        summary = `Exchange: ${found.oldTractorNumber} -> ${found.newTractorModel}`;
        itemData = found;
        exchanges = exchanges.filter((e) => e.id !== id);
      }
    } else if (type === 'Loan') {
      const found = loans.find((l) => l.id === id);
      if (found) {
        summary = `Loan: ${found.financeCompany} - ${found.customerName} (${found.tractorNumber})`;
        itemData = found;
        loans = loans.filter((l) => l.id !== id);
      }
    } else if (type === 'Payment') {
      const found = payments.find((p) => p.id === id);
      if (found) {
        summary = `Payment: ${found.id} - ${found.paymentType} (${found.clientName})`;
        itemData = found;
        payments = payments.filter((p) => p.id !== id);
      }
    } else if (type === 'Expense') {
      const found = expenses.find((e) => e.id === id);
      if (found) {
        summary = `Expense: ${found.category} - ${found.description}`;
        itemData = found;
        expenses = expenses.filter((e) => e.id !== id);
      }
    } else if (type === 'Document') {
      const found = documents.find((d) => d.id === id);
      if (found) {
        summary = `Document: ${found.documentType} (${found.vehicleNumber})`;
        itemData = found;
        documents = documents.filter((d) => d.id !== id);
      }
    }

    const archiveRecord: ArchivedRecord = {
      archiveId: getNextArchiveId(db.archive),
      entityType: type,
      entityId: id,
      summary,
      data: itemData,
      deletedAt: new Date().toLocaleString(),
      deletedBy: user?.email || 'Admin User',
    };

    updateDatabase({
      ...db,
      clients,
      vehicles,
      applications,
      tractors,
      exchanges,
      loans,
      payments,
      expenses,
      documents,
      archive: [archiveRecord, ...db.archive],
    });
  };

  // 6. Restore from Archive
  const handleRestoreRecord = (rec: ArchivedRecord) => {
    const archive = db.archive.filter((a) => a.archiveId !== rec.archiveId);
    let clients = [...db.clients];
    let vehicles = [...db.vehicles];
    let applications = [...db.applications];
    let tractors = [...db.tractors];
    let exchanges = [...db.exchanges];
    let loans = [...db.loans];
    let payments = [...db.payments];
    let expenses = [...db.expenses];
    let documents = [...db.documents];

    if (rec.entityType === 'Client' && rec.data) clients.push(rec.data);
    else if (rec.entityType === 'Vehicle' && rec.data) vehicles.push(rec.data);
    else if (rec.entityType === 'Application' && rec.data) applications.push(rec.data);
    else if (rec.entityType === 'Tractor' && rec.data) tractors.push(rec.data);
    else if (rec.entityType === 'Exchange' && rec.data) exchanges.push(rec.data);
    else if (rec.entityType === 'Loan' && rec.data) loans.push(rec.data);
    else if (rec.entityType === 'Payment' && rec.data) payments.push(rec.data);
    else if (rec.entityType === 'Expense' && rec.data) expenses.push(rec.data);
    else if (rec.entityType === 'Document' && rec.data) documents.push(rec.data);

    updateDatabase({
      ...db,
      clients,
      vehicles,
      applications,
      tractors,
      exchanges,
      loans,
      payments,
      expenses,
      documents,
      archive,
    });
  };

  // 7. Download XLSX File
  const handleDownloadExcel = async () => {
    try {
      const blob = await generateKarnatakaRTOWorkbook(db);
      downloadBlob(blob, 'Karnataka_RTO_Business_Management.xlsx');
    } catch (e) {
      console.error('Failed to generate Excel workbook:', e);
      alert('Error generating Excel file. Please try again.');
    }
  };

  // Total Alert Count for Badge
  const alertCount =
    db.vehicles.filter((v) => getDocumentAlertStatus(v.insuranceExpiry, currentDateStr) === 'expired').length +
    db.vehicles.filter((v) => getDocumentAlertStatus(v.rcValidity, currentDateStr) === 'expired').length +
    db.applications.filter((a) => isOverdue(a.expectedCompletionDate, a.workStatus, currentDateStr)).length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col">
      {/* Top Professional Header & Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        alertCount={alertCount}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onDownloadExcel={handleDownloadExcel}
        onDownloadXLSM={() => setIsVbaModalOpen(true)}
        onOpenGoogleSheets={() => setIsGoogleSheetsOpen(true)}
        user={user}
        onGoogleSignIn={handleGoogleSignIn}
        onLogout={handleLogout}
        businessName={db.settings.businessName}
      />

      {/* Main ERP Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            db={db}
            onNavigate={setActiveTab}
            onRefresh={() => setDb(loadDatabase())}
            currentDateStr={currentDateStr}
          />
        )}

        {activeTab === 'data-entry' && (
          <DataEntryForm
            db={db}
            onSaveNewEntry={handleSaveNewEntry}
            onUpdateApplication={handleUpdateApplication}
            onDeleteRecord={(type, id) => handleDeleteRecord(type, id)}
            onNavigate={setActiveTab}
            currentDateStr={currentDateStr}
          />
        )}

        {activeTab === 'clients' && (
          <ClientDatabase
            db={db}
            onEditClient={(c) => {
              setActiveTab('data-entry');
            }}
            onDeleteClient={(id) => handleDeleteRecord('Client', id)}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'vehicles' && (
          <VehicleDatabase
            db={db}
            onDeleteVehicle={(id) => handleDeleteRecord('Vehicle', id)}
            onNavigate={setActiveTab}
            currentDateStr={currentDateStr}
          />
        )}

        {activeTab === 'rto-work' && (
          <RTOWorkManager
            db={db}
            onUpdateStatus={handleUpdateAppStatus}
            onAddPayment={handleAddPayment}
            onEditApp={(app) => {
              setActiveTab('data-entry');
            }}
            onDeleteApp={(id) => handleDeleteRecord('Application', id)}
            onNavigate={setActiveTab}
            currentDateStr={currentDateStr}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentManager
            db={db}
            onAddDocument={(doc) => updateDatabase({ ...db, documents: [doc, ...db.documents] })}
            onDeleteDocument={(id) => handleDeleteRecord('Document', id)}
            onNavigate={setActiveTab}
            currentDateStr={currentDateStr}
          />
        )}

        {activeTab === 'tractor-showroom' && (
          <TractorShowroom
            db={db}
            onAddTractor={(trc) => updateDatabase({ ...db, tractors: [trc, ...db.tractors] })}
            onUpdateStockStatus={(id, status) => {
              const tractors = db.tractors.map((t) => (t.id === id ? { ...t, stockStatus: status } : t));
              updateDatabase({ ...db, tractors });
            }}
            onDeleteTractor={(id) => handleDeleteRecord('Tractor', id)}
            onNavigate={setActiveTab}
            currentDateStr={currentDateStr}
          />
        )}

        {activeTab === 'exchange' && (
          <TractorExchangeManager
            db={db}
            onAddExchange={(ex) => updateDatabase({ ...db, exchanges: [ex, ...db.exchanges] })}
            onDeleteExchange={(id) => handleDeleteRecord('Exchange', id)}
            onNavigate={setActiveTab}
            currentDateStr={currentDateStr}
          />
        )}

        {activeTab === 'loans' && (
          <LoanManager
            db={db}
            onAddLoan={(loan) => updateDatabase({ ...db, loans: [loan, ...db.loans] })}
            onUpdateLoanStatus={(id, status) => {
              const loans = db.loans.map((l) => (l.id === id ? { ...l, loanStatus: status } : l));
              updateDatabase({ ...db, loans });
            }}
            onDeleteLoan={(id) => handleDeleteRecord('Loan', id)}
            onNavigate={setActiveTab}
            currentDateStr={currentDateStr}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentManager
            db={db}
            onAddPayment={(payment) => updateDatabase({ ...db, payments: [payment, ...db.payments] })}
            onDeletePayment={(id) => handleDeleteRecord('Payment', id)}
            onNavigate={setActiveTab}
            currentDateStr={currentDateStr}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpenseManager
            db={db}
            onAddExpense={(exp) => updateDatabase({ ...db, expenses: [exp, ...db.expenses] })}
            onDeleteExpense={(id) => handleDeleteRecord('Expense', id)}
            onNavigate={setActiveTab}
            currentDateStr={currentDateStr}
          />
        )}

        {activeTab === 'alerts' && (
          <RemindersAlerts db={db} onNavigate={setActiveTab} currentDateStr={currentDateStr} />
        )}

        {activeTab === 'reports' && (
          <ReportsManager db={db} onNavigate={setActiveTab} currentDateStr={currentDateStr} />
        )}

        {activeTab === 'archive' && (
          <ArchiveManager
            db={db}
            onRestoreRecord={handleRestoreRecord}
            onPurgeRecord={(arcId) =>
              updateDatabase({ ...db, archive: db.archive.filter((a) => a.archiveId !== arcId) })
            }
            onClearArchive={() => updateDatabase({ ...db, archive: [] })}
            onNavigate={setActiveTab}
          />
        )}
      </main>

      {/* Global Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={db.settings}
        onSaveSettings={(newSettings) => updateDatabase({ ...db, settings: newSettings })}
        db={db}
        onRestoreDatabase={(newDb) => updateDatabase(newDb)}
        onResetToDefault={() => setDb(resetDatabaseToDefault())}
      />

      <GoogleSheetsSyncModal
        isOpen={isGoogleSheetsOpen}
        onClose={() => setIsGoogleSheetsOpen(false)}
        db={db}
        accessToken={accessToken}
        user={user}
        onGoogleSignIn={handleGoogleSignIn}
      />

      <VbaDownloadModal
        isOpen={isVbaModalOpen}
        onClose={() => setIsVbaModalOpen(false)}
        db={db}
      />
    </div>
  );
}
