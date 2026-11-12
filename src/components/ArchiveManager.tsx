import React, { useState } from 'react';
import {
  Archive,
  RotateCcw,
  Trash2,
  Search,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { ArchivedRecord } from '../types';
import { AppDatabase } from '../utils/storage';
import { ActiveTab } from './Navbar';

interface ArchiveManagerProps {
  db: AppDatabase;
  onRestoreRecord: (record: ArchivedRecord) => void;
  onPurgeRecord: (archiveId: string) => void;
  onClearArchive: () => void;
  onNavigate: (tab: ActiveTab) => void;
}

export const ArchiveManager: React.FC<ArchiveManagerProps> = ({
  db,
  onRestoreRecord,
  onPurgeRecord,
  onClearArchive,
  onNavigate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const filteredArchive = db.archive.filter(
    (a) =>
      a.entityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.entityType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-5 pb-12">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Archive className="w-5 h-5 text-slate-600" />
            <span>Deleted Records Safety Vault & Archive</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Prevents accidental data loss. Any client, vehicle, application, or payment deleted in the ERP is safely archived here and can be restored.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search deleted records..."
              className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-500 focus:outline-none w-56"
            />
          </div>

          {db.archive.length > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Empty Vault</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmClear && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Permanently delete all archived records? This action cannot be reversed.</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmClear(false)}
              className="px-3 py-1 bg-white border border-rose-300 rounded text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onClearArchive();
                setConfirmClear(false);
              }}
              className="px-3 py-1 bg-rose-600 text-white rounded font-bold"
            >
              Confirm Empty Vault
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3">Archive ID</th>
                <th className="px-4 py-3">Record Type</th>
                <th className="px-4 py-3">Original ID</th>
                <th className="px-4 py-3">Description / Summary</th>
                <th className="px-4 py-3">Deleted Date & Time</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredArchive.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No deleted records in archive vault.
                  </td>
                </tr>
              ) : (
                filteredArchive.map((item) => (
                  <tr key={item.archiveId} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono text-slate-500 font-bold">{item.archiveId}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-slate-100 text-slate-800 font-semibold px-2 py-0.5 rounded text-[10px]">
                        {item.entityType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{item.entityId}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium max-w-md">{item.summary}</td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">{item.deletedAt}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onRestoreRecord(item)}
                          className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore</span>
                        </button>
                        <button
                          onClick={() => onPurgeRecord(item.archiveId)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                          title="Permanently Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
