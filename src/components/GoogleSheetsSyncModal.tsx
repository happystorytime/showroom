import React, { useState } from 'react';
import {
  CloudUpload,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  X,
  FileSpreadsheet,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { AppDatabase } from '../utils/storage';
import { createAndSyncGoogleSpreadsheet, GoogleSheetsSyncResult } from '../utils/googleSheetsSync';
import { User } from 'firebase/auth';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: AppDatabase;
  accessToken: string | null;
  user: User | null;
  onGoogleSignIn: () => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  db,
  accessToken,
  user,
  onGoogleSignIn,
}) => {
  const [existingId, setExistingId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GoogleSheetsSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSync = async () => {
    if (!accessToken) {
      setError('Please sign in with Google first to authorize Google Sheets synchronization.');
      return;
    }

    // Explicit confirmation dialog before writing/mutating spreadsheet data (mandatory for workspace integration)
    const confirmed = window.confirm(
      `Do you confirm syncing the Karnataka RTO & Tractor Showroom database (${db.clients.length} clients, ${db.vehicles.length} vehicles, ${db.applications.length} RTO files, ${db.tractors.length} tractors) to Google Sheets?`
    );
    if (!confirmed) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await createAndSyncGoogleSpreadsheet(accessToken, db, existingId.trim() || undefined);
      setResult(res);
    } catch (err: any) {
      console.error('Google Sheets Sync Failed:', err);
      setError(err.message || 'Failed to sync with Google Sheets. Please ensure popup was allowed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Google Sheets Live Cloud Sync</h3>
              <p className="text-xs text-slate-500">Sync all ERP tables directly into Google Sheets spreadsheet</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth status indicator */}
        {!user || !accessToken ? (
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center space-y-3">
            <div className="text-xs text-slate-600 font-medium">
              Google Account authorization required to create and update spreadsheets in your Google Drive.
            </div>
            <button
              onClick={onGoogleSignIn}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs shadow-xs transition cursor-pointer"
            >
              Sign in with Google to Connect Sheets
            </button>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>
                Connected as: <strong>{user.email}</strong>
              </span>
            </div>
            <span className="text-[10px] font-bold bg-emerald-200 px-2 py-0.5 rounded">OAuth Ready</span>
          </div>
        )}

        {/* Existing Spreadsheet ID option */}
        <div className="space-y-1.5 text-xs">
          <label className="block font-semibold text-slate-700">
            Existing Google Spreadsheet ID (Optional)
          </label>
          <input
            type="text"
            value={existingId}
            onChange={(e) => setExistingId(e.target.value)}
            placeholder="Leave blank to create a new spreadsheet automatically"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
          />
          <p className="text-[11px] text-slate-400">
            If left empty, a new spreadsheet named &quot;{db.settings.businessName} - Live Cloud Database&quot; will be created.
          </p>
        </div>

        {/* What will be synced */}
        <div className="bg-slate-50 rounded-xl p-3 text-[11px] text-slate-600 space-y-1">
          <div className="font-bold text-slate-800">Sheets will be created/updated:</div>
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            <div>• DASHBOARD (KPI Formulas)</div>
            <div>• CLIENTS (Client Master)</div>
            <div>• VEHICLES (Vehicle Master)</div>
            <div>• RTO_APPLICATIONS (Work Register)</div>
            <div>• DOCUMENTS (Compliance)</div>
            <div>• TRACTOR_STOCK (Showroom)</div>
            <div>• OLD_TRACTOR_EXCHANGE</div>
            <div>• LOANS (Finance Portfolio)</div>
            <div>• PAYMENTS (Cash Ledger)</div>
            <div>• EXPENSES (Office Costs)</div>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3 rounded-lg text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-800">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Synchronization Complete!</span>
            </div>
            <p className="text-[11px] text-emerald-700">
              Updated {result.updatedSheets.length} worksheets with current database records.
            </p>
            <a
              href={result.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs shadow-xs"
            >
              <span>Open in Google Sheets</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
          >
            Close
          </button>
          <button
            onClick={handleSync}
            disabled={isLoading || !accessToken}
            className="flex items-center gap-1.5 px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-300 text-white rounded-lg font-bold shadow-xs transition cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Syncing Database...</span>
              </>
            ) : (
              <>
                <CloudUpload className="w-4 h-4" />
                <span>Start Google Sheets Sync</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
