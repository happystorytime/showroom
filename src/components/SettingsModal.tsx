import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  RotateCcw,
  Shield,
  Download,
  Upload,
  X,
  Lock,
  Building,
  Phone,
  Mail,
  FileCheck,
} from 'lucide-react';
import { SystemSettings } from '../types';
import { AppDatabase, exportDatabaseAsJson, importDatabaseFromJson } from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SystemSettings;
  onSaveSettings: (settings: SystemSettings) => void;
  db: AppDatabase;
  onRestoreDatabase: (db: AppDatabase) => void;
  onResetToDefault: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  db,
  onRestoreDatabase,
  onResetToDefault,
}) => {
  const [formData, setFormData] = useState<SystemSettings>({ ...settings });
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    onClose();
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportDatabaseAsJson(db);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Karnataka_RTO_Database_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const restored = importDatabaseFromJson(text);
        onRestoreDatabase(restored);
        setImportStatus('Backup restored successfully! All tables updated.');
      } catch (err: any) {
        setImportStatus(`Import Error: ${err.message || 'Invalid JSON file'}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">System Settings & Data Vault</h3>
              <p className="text-xs text-slate-500">Configure business headers, RTO jurisdictions, and backup database</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {importStatus && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs font-medium">
            {importStatus}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* SECTION 1: BUSINESS PROFILE */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-blue-600" />
              <span>Agency & Showroom Information</span>
            </h4>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business Name</label>
              <input
                type="text"
                required
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tagline / Subheading</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Office Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Mobile</label>
                <input
                  type="text"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">RTO Agent License Number</label>
                <input
                  type="text"
                  value={formData.rtoLicenseNumber || ''}
                  onChange={(e) => setFormData({ ...formData, rtoLicenseNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={formData.gstNumber || ''}
                  onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: BACKUP & DATABASE ACTIONS */}
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Data Protection & Backup Vault</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-lg font-semibold transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export JSON Database Backup</span>
              </button>

              <label className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 p-3 rounded-lg font-semibold transition cursor-pointer">
                <Upload className="w-4 h-4 text-slate-600" />
                <span>Restore Backup File</span>
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset all databases to sample Karnataka seed data? Current custom entries will be overwritten.')) {
                    onResetToDefault();
                    onClose();
                  }
                }}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Database to Default Karnataka Demonstration Data</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save System Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
