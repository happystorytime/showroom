import React, { useMemo, useState } from 'react';
import { Archive, RotateCcw, Trash2, Search } from 'lucide-react';
import type { ArchivedRecord, Showroom } from '../types';
import { getShowroomLabel } from '../utils/pureCalculations';

interface ArchiveManagerProps {
  archive: ArchivedRecord[];
  showrooms: Showroom[];
  activeShowroomId: string;
  onRestoreRecord: (record: ArchivedRecord) => Promise<void>;
  onDeleteForever: (archiveId: string) => Promise<void>;
  onClearAllArchive: () => Promise<void>;
}

export const ArchiveManager: React.FC<ArchiveManagerProps> = ({
  archive,
  showrooms,
  activeShowroomId,
  onRestoreRecord,
  onDeleteForever,
  onClearAllArchive,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [confirmSingleDelete, setConfirmSingleDelete] = useState<ArchivedRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return archive.filter((rec) => {
      if (
        activeShowroomId !== 'ALL' &&
        rec.showroomId !== activeShowroomId &&
        rec.showroomId !== 'COMMON'
      ) {
        return false;
      }
      if (entityFilter !== 'ALL' && rec.entityType !== entityFilter) return false;
      if (!q) return true;
      return (
        rec.entityId.toLowerCase().includes(q) ||
        rec.summary.toLowerCase().includes(q) ||
        rec.entityType.toLowerCase().includes(q)
      );
    });
  }, [archive, activeShowroomId, entityFilter, searchTerm]);

  const handleRestore = async (rec: ArchivedRecord) => {
    setBusy(true);
    try {
      await onRestoreRecord(rec);
    } finally {
      setBusy(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!confirmSingleDelete) return;
    setBusy(true);
    try {
      await onDeleteForever(confirmSingleDelete.archiveId);
      setConfirmSingleDelete(null);
    } finally {
      setBusy(false);
    }
  };

  const handleClearAll = async () => {
    setBusy(true);
    try {
      await onClearAllArchive();
      setConfirmClearAll(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Safety Archive ({filtered.length})
            </h2>
            <p className="text-xs text-slate-500">
              Deleted Clients, Vehicles, RTO Applications, and Document metadata are safely archived for recovery.
            </p>
          </div>
          {archive.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmClearAll(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" />
              <span>Empty Archive</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search archived ID or summary..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Archived Types</option>
            <option value="Client">Clients</option>
            <option value="Vehicle">Vehicles</option>
            <option value="Application">RTO Applications</option>
            <option value="Document">Documents</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
            <Archive className="h-7 w-7 text-slate-300" />
            <span>No archived records found.</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((rec) => (
              <div
                key={rec.archiveId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {rec.entityType}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {rec.entityId}
                    </span>
                    <span className="text-xs text-slate-500">
                      {rec.showroomId === 'COMMON'
                        ? 'Common Registry'
                        : getShowroomLabel(showrooms, rec.showroomId)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 mt-1">{rec.summary}</p>
                  <p className="text-[11px] text-slate-400">
                    Archived {rec.deletedAt} by {rec.deletedBy}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleRestore(rec)}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Restore</span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmSingleDelete(rec)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Single Delete */}
      {confirmSingleDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="font-display text-base font-bold text-slate-900">
              Permanently Delete {confirmSingleDelete.entityId}?
            </h3>
            <p className="mt-1.5 text-sm text-slate-600">
              This permanently removes the archived snapshot and cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmSingleDelete(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handlePermanentDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Empty Archive */}
      {confirmClearAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="font-display text-base font-bold text-slate-900">
              Empty Entire Safety Archive?
            </h3>
            <p className="mt-1.5 text-sm text-slate-600">
              All {archive.length} archived records will be permanently removed.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmClearAll(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleClearAll}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Empty Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
