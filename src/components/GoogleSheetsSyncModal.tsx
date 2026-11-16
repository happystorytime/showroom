import React, { useState } from 'react';
import {
  X,
  CloudUpload,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import type { AppDatabase } from '../utils/storage';
import { getAccessToken, googleSheetsSignIn } from '../utils/auth';
import { createAndSyncGoogleSpreadsheet } from '../utils/googleSheetsSync';

interface GoogleSheetsSyncModalProps {
  db: AppDatabase;
  onClose: () => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({ db, onClose }) => {
  const [syncing, setSyncing] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setErrorMsg(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        await googleSheetsSignIn();
        setErrorMsg(
          'Redirecting to Google OAuth to grant Sheets & Drive access. After returning, click Sync Now again.'
        );
        return;
      }
      const res = await createAndSyncGoogleSpreadsheet(
        token,
        db,
        spreadsheetId.trim() || undefined
      );
      setSpreadsheetId(res.spreadsheetId);
      setResultUrl(res.spreadsheetUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Google Sheets sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <CloudUpload className="h-5 w-5 text-blue-600" />
            <h3 className="font-display text-base font-bold text-slate-900">
              Sync RTO Database to Google Sheets
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600">
            Creates or updates a live Google Spreadsheet with 7 RTO worksheets: DASHBOARD, SHOWROOMS, CLIENTS, VEHICLES, RTO_APPLICATIONS, DOCUMENTS, and APPLICATION_HISTORY.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Existing Spreadsheet ID (Optional — leave blank to create new)
            </label>
            <input
              type="text"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              placeholder="Paste existing Google Sheet ID to update in-place"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {resultUrl && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                <span>Synced {db.applications.length} RTO applications & {db.clients.length} common clients!</span>
              </div>
              <a
                href={resultUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                <span>Open Google Spreadsheet</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              disabled={syncing}
              onClick={handleSync}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
