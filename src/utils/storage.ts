import {
  Client,
  Vehicle,
  RTOApplication,
  DocumentRecord,
  TractorItem,
  TractorExchange,
  LoanRecord,
  PaymentTransaction,
  ExpenseRecord,
  ArchivedRecord,
  SystemSettings,
} from '../types';
import {
  SEED_CLIENTS,
  SEED_VEHICLES,
  SEED_RTO_APPLICATIONS,
  SEED_DOCUMENTS,
  SEED_TRACTORS,
  SEED_TRACTOR_EXCHANGES,
  SEED_LOANS,
  SEED_PAYMENTS,
  SEED_EXPENSES,
  INITIAL_SETTINGS,
} from './seedData';
import { generateNextId } from './pureCalculations';

const STORAGE_KEYS = {
  CLIENTS: 'krto_clients',
  VEHICLES: 'krto_vehicles',
  APPLICATIONS: 'krto_applications',
  DOCUMENTS: 'krto_documents',
  TRACTORS: 'krto_tractors',
  EXCHANGES: 'krto_exchanges',
  LOANS: 'krto_loans',
  PAYMENTS: 'krto_payments',
  EXPENSES: 'krto_expenses',
  ARCHIVE: 'krto_archive',
  SETTINGS: 'krto_settings',
};

function getStored<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading key from localStorage:', key, e);
    return defaultValue;
  }
}

function saveStored<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving key to localStorage:', key, e);
  }
}

export interface AppDatabase {
  clients: Client[];
  vehicles: Vehicle[];
  applications: RTOApplication[];
  documents: DocumentRecord[];
  tractors: TractorItem[];
  exchanges: TractorExchange[];
  loans: LoanRecord[];
  payments: PaymentTransaction[];
  expenses: ExpenseRecord[];
  archive: ArchivedRecord[];
  settings: SystemSettings;
}

export function loadDatabase(): AppDatabase {
  return {
    clients: getStored<Client[]>(STORAGE_KEYS.CLIENTS, SEED_CLIENTS),
    vehicles: getStored<Vehicle[]>(STORAGE_KEYS.VEHICLES, SEED_VEHICLES),
    applications: getStored<RTOApplication[]>(STORAGE_KEYS.APPLICATIONS, SEED_RTO_APPLICATIONS),
    documents: getStored<DocumentRecord[]>(STORAGE_KEYS.DOCUMENTS, SEED_DOCUMENTS),
    tractors: getStored<TractorItem[]>(STORAGE_KEYS.TRACTORS, SEED_TRACTORS),
    exchanges: getStored<TractorExchange[]>(STORAGE_KEYS.EXCHANGES, SEED_TRACTOR_EXCHANGES),
    loans: getStored<LoanRecord[]>(STORAGE_KEYS.LOANS, SEED_LOANS),
    payments: getStored<PaymentTransaction[]>(STORAGE_KEYS.PAYMENTS, SEED_PAYMENTS),
    expenses: getStored<ExpenseRecord[]>(STORAGE_KEYS.EXPENSES, SEED_EXPENSES),
    archive: getStored<ArchivedRecord[]>(STORAGE_KEYS.ARCHIVE, []),
    settings: getStored<SystemSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS),
  };
}

export function saveDatabase(db: AppDatabase): void {
  saveStored(STORAGE_KEYS.CLIENTS, db.clients);
  saveStored(STORAGE_KEYS.VEHICLES, db.vehicles);
  saveStored(STORAGE_KEYS.APPLICATIONS, db.applications);
  saveStored(STORAGE_KEYS.DOCUMENTS, db.documents);
  saveStored(STORAGE_KEYS.TRACTORS, db.tractors);
  saveStored(STORAGE_KEYS.EXCHANGES, db.exchanges);
  saveStored(STORAGE_KEYS.LOANS, db.loans);
  saveStored(STORAGE_KEYS.PAYMENTS, db.payments);
  saveStored(STORAGE_KEYS.EXPENSES, db.expenses);
  saveStored(STORAGE_KEYS.ARCHIVE, db.archive);
  saveStored(STORAGE_KEYS.SETTINGS, db.settings);
}

export function resetDatabaseToDefault(): AppDatabase {
  const db: AppDatabase = {
    clients: [...SEED_CLIENTS],
    vehicles: [...SEED_VEHICLES],
    applications: [...SEED_RTO_APPLICATIONS],
    documents: [...SEED_DOCUMENTS],
    tractors: [...SEED_TRACTORS],
    exchanges: [...SEED_TRACTOR_EXCHANGES],
    loans: [...SEED_LOANS],
    payments: [...SEED_PAYMENTS],
    expenses: [...SEED_EXPENSES],
    archive: [],
    settings: { ...INITIAL_SETTINGS },
  };
  saveDatabase(db);
  return db;
}

export function exportDatabaseAsJson(db: AppDatabase): string {
  return JSON.stringify(db, null, 2);
}

export function importDatabaseFromJson(jsonStr: string): AppDatabase {
  const parsed = JSON.parse(jsonStr);
  if (!parsed.clients || !parsed.vehicles || !parsed.applications) {
    throw new Error('Invalid database backup file format');
  }
  saveDatabase(parsed);
  return parsed;
}

// Next ID helpers
export function getNextClientId(clients: Client[]): string {
  return generateNextId('CLI', clients.map((c) => c.id));
}

export function getNextVehicleId(vehicles: Vehicle[]): string {
  return generateNextId('VEH', vehicles.map((v) => v.id));
}

export function getNextApplicationId(applications: RTOApplication[]): string {
  return generateNextId('APP', applications.map((a) => a.id));
}

export function getNextDocumentId(documents: DocumentRecord[]): string {
  return generateNextId('DOC', documents.map((d) => d.id));
}

export function getNextTractorId(tractors: TractorItem[]): string {
  return generateNextId('TRC', tractors.map((t) => t.id));
}

export function getNextExchangeId(exchanges: TractorExchange[]): string {
  return generateNextId('EXC', exchanges.map((e) => e.id));
}

export function getNextLoanId(loans: LoanRecord[]): string {
  return generateNextId('LON', loans.map((l) => l.id));
}

export function getNextTransactionId(payments: PaymentTransaction[]): string {
  return generateNextId('TXN', payments.map((p) => p.id));
}

export function getNextExpenseId(expenses: ExpenseRecord[]): string {
  return generateNextId('EXP', expenses.map((e) => e.id));
}

export function getNextArchiveId(archive: ArchivedRecord[]): string {
  return generateNextId('ARC', archive.map((a) => a.archiveId));
}
