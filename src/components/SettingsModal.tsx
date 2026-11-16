import React, { useRef, useState } from 'react';
import {
  X,
  Save,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  Building,
  Database,
} from 'lucide-react';
import type { DocumentCategory, SystemSettings } from '../types';
import { DOCUMENT_CATEGORIES, RTO_WORK_CATEGORIES } from '../types';
import type { AppDatabase } from '../utils/storage';
import { exportDatabaseAsJson, importDatabaseFromJson } from '../utils/storage';
import { downloadBlob } from '../utils/excelGenerator';

interface SettingsModalProps {
  db: AppDatabase;
  onUpdateSettings: (settings: SystemSettings) => Promise<void>;
  onImportDatabase: (newDb: AppDatabase) => Promise<void>;
  onClearAllRecords: () => Promise<void>;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  db,
  onUpdateSettings,
  onImportDatabase,
  onClearAllRecords,
  onClose,
}) => {
  const [tab, setTab] = useState<'agency' | 'checklists' | 'backup'>('agency');
  const [form, setForm] = useState<SystemSettings>({
    ...db.settings,
    documentChecklistMap: { ...db.settings.documentChecklistMap },
  });
  const [selectedCategory, setSelectedCategory] = useState<string>(RTO_WORK_CATEGORIES[0]);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      await onUpdateSettings(form);
      setStatusMsg({ type: 'success', text: 'Agency settings & document checklists saved.' });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleChecklistItem = (category: string, docType: DocumentCategory) => {
    const current = form.documentChecklistMap[category] || [];
    const next = current.includes(docType)
      ? current.filter((d) => d !== docType)
      : [...current, docType];
    setForm((prev) => ({
      ...prev,
      documentChecklistMap: {
        ...prev.documentChecklistMap,
        [category]: next,
      },
    }));
  };

  const handleExportJson = () => {
    const json = exportDatabaseAsJson(db);
    downloadBlob(
      new Blob([json], { type: 'application/json' }),
      `Karnataka_RTO_Backup_${new Date().toISOString().slice(0, 10)}.json`
    );
    setStatusMsg({ type: 'success', text: 'JSON backup exported.' });
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = importDatabaseFromJson(String(ev.target?.result || ''));
        await onImportDatabase(parsed);
        setStatusMsg({ type: 'success', text: 'Backup restored successfully to workspace.' });
      } catch (err) {
        setStatusMsg({
          type: 'error',
          text: err instanceof Error ? err.message : 'Invalid JSON backup file.',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmReset = async () => {
    setSaving(true);
    try {
      await onClearAllRecords();
      setConfirmResetOpen(false);
      setStatusMsg({ type: 'success', text: 'All transactional records cleared.' });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to reset records.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-slate-900">
            RTO System Configuration & Checklists
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sub-navigation */}
        <div className="flex gap-1 border-b border-slate-200 bg-slate-50 px-6 py-2">
          <button
            type="button"
            onClick={() => setTab('agency')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              tab === 'agency' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <Building className="h-3.5 w-3.5" />
            <span>Agency Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('checklists')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              tab === 'checklists' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            <span>Document Checklists</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('backup')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              tab === 'backup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            <span>Backup & Reset</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {statusMsg && (
            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                statusMsg.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {tab === 'agency' && (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    RTO Consultancy Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tagline</label>
                  <input
                    type="text"
                    value={form.tagline}
                    onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile</label>
                  <input
                    type="text"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    RTO Agent License No
                  </label>
                  <input
                    type="text"
                    value={form.rtoLicenseNumber || ''}
                    onChange={(e) => setForm({ ...form, rtoLicenseNumber: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save Agency Settings'}</span>
                </button>
              </div>
            </form>
          )}

          {tab === 'checklists' && (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <p className="text-xs text-slate-600">
                Configure default required documents for each of the 13 RTO work categories. New applications automatically pre-fill these checklists.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1 border border-slate-200 rounded-lg p-2 max-h-80 overflow-y-auto">
                  {RTO_WORK_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left rounded-md px-2.5 py-2 text-xs font-semibold transition-colors ${
                        selectedCategory === cat
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {cat} ({(form.documentChecklistMap[cat] || []).length})
                    </button>
                  ))}
                </div>

                <div className="md:col-span-2 rounded-lg border border-slate-200 p-4 space-y-3">
                  <h4 className="font-display text-sm font-bold text-slate-900">
                    Required Documents for &ldquo;{selectedCategory}&rdquo;
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {DOCUMENT_CATEGORIES.map((docCat) => {
                      const checked = (form.documentChecklistMap[selectedCategory] || []).includes(
                        docCat
                      );
                      return (
                        <label
                          key={docCat}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium cursor-pointer ${
                            checked
                              ? 'border-blue-600 bg-blue-50 text-blue-900'
                              : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleChecklistItem(selectedCategory, docCat)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600"
                          />
                          <span>{docCat}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save Checklist Rules'}</span>
                </button>
              </div>
            </form>
          )}

          {tab === 'backup' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Download Full JSON Backup</h4>
                  <p className="text-xs text-slate-500">
                    Saves showrooms, common clients, vehicles, RTO applications, document metadata, and checklists.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 shrink-0"
                >
                  <Download className="h-4 w-4" />
                  <span>Export JSON</span>
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Restore from JSON Backup</h4>
                  <p className="text-xs text-slate-500">
                    Imports and writes records into your Supabase PostgreSQL workspace.
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportJson}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 shrink-0"
                >
                  <Upload className="h-4 w-4" />
                  <span>Import JSON</span>
                </button>
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-red-900">Clear All Transactional Data</h4>
                  <p className="text-xs text-red-700">
                    Deletes all Clients, Vehicles, RTO Applications, Documents, History, and Archive while preserving your Showroom list.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmResetOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Reset Data</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {confirmResetOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h3 className="font-display text-base font-bold text-slate-900">
              Confirm Workspace Reset
            </h3>
            <p className="mt-1.5 text-sm text-slate-600">
              This will permanently clear all Clients, Vehicles, RTO Applications, Documents, and Archive records in Supabase. Export a JSON backup first if needed.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmReset}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {saving ? 'Clearing...' : 'Yes, Reset Workspace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
