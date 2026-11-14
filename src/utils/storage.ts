import {
  Showroom,
  Client,
  Vehicle,
  RTOApplication,
  DocumentRecord,
  ApplicationHistoryEntry,
  ArchivedRecord,
  SystemSettings,
} from '../types';
import {
  SEED_SHOWROOMS,
  SEED_CLIENTS,
  SEED_VEHICLES,
  SEED_RTO_APPLICATIONS,
  SEED_DOCUMENTS,
  INITIAL_SETTINGS,
} from './seedData';
import { generateNextId } from './pureCalculations';

export interface AppDatabase {
  showrooms: Showroom[];
  clients: Client[];
  vehicles: Vehicle[];
  applications: RTOApplication[];
  documents: DocumentRecord[];
  applicationHistory: ApplicationHistoryEntry[];
  archive: ArchivedRecord[];
  settings: SystemSettings;
}

export function createEmptyWorkspace(): AppDatabase {
  return {
    showrooms: [...SEED_SHOWROOMS],
    clients: [...SEED_CLIENTS],
    vehicles: [...SEED_VEHICLES],
    applications: [...SEED_RTO_APPLICATIONS],
    documents: [...SEED_DOCUMENTS],
    applicationHistory: [],
    archive: [],
    settings: { ...INITIAL_SETTINGS },
  };
}

export function exportDatabaseAsJson(db: AppDatabase): string {
  return JSON.stringify(db, null, 2);
}

export function importDatabaseFromJson(jsonStr: string): AppDatabase {
  const parsed = JSON.parse(jsonStr);
  if (!parsed || !Array.isArray(parsed.clients) || !Array.isArray(parsed.vehicles) || !Array.isArray(parsed.applications)) {
    throw new Error('Invalid database backup file format');
  }
  const showrooms: Showroom[] =
    Array.isArray(parsed.showrooms) && parsed.showrooms.length > 0 ? parsed.showrooms : [...SEED_SHOWROOMS];

  return {
    showrooms,
    clients: parsed.clients || [],
    vehicles: parsed.vehicles || [],
    applications: parsed.applications || [],
    documents: parsed.documents || [],
    applicationHistory: parsed.applicationHistory || [],
    archive: parsed.archive || [],
    settings: {
      ...INITIAL_SETTINGS,
      ...(parsed.settings || {}),
      documentChecklistMap: {
        ...INITIAL_SETTINGS.documentChecklistMap,
        ...(parsed.settings?.documentChecklistMap || {}),
      },
    },
  };
}

// Lightweight transient UI preferences only (never primary database)
const UI_PREFS_KEY = 'krto_ui_prefs_v2';

export interface UiPreferences {
  activeShowroomId?: string;
  sidebarCollapsed?: boolean;
}

export function loadUiPrefs(): UiPreferences {
  try {
    const raw = localStorage.getItem(UI_PREFS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as UiPreferences;
  } catch {
    return {};
  }
}

export function saveUiPrefs(prefs: UiPreferences): void {
  try {
    const current = loadUiPrefs();
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
  } catch {
    // Ignore storage quota errors for transient prefs
  }
}

// Next ID helpers
export function getNextShowroomId(showrooms: Showroom[]): string {
  return generateNextId('SHW', showrooms.map((s) => s.id), 101);
}

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

export function getNextHistoryId(history: ApplicationHistoryEntry[]): string {
  return generateNextId('HIS', history.map((h) => h.id));
}

export function getNextArchiveId(archive: ArchivedRecord[]): string {
  return generateNextId('ARC', archive.map((a) => a.archiveId));
}
