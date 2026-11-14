import React, { useMemo, useState } from 'react';
import {
  Search,
  Eye,
  Edit3,
  Trash2,
  Printer,
  History,
  CheckCircle2,
  AlertTriangle,
  X,
  Upload,
  RefreshCw,
} from 'lucide-react';
import type {
  ApplicationHistoryEntry,
  Client,
  DocumentCategory,
  DocumentRecord,
  RTOApplication,
  Showroom,
  SystemSettings,
  WorkStatus,
} from '../types';
import { DOCUMENT_CATEGORIES, RTO_WORK_CATEGORIES, WORK_STATUSES } from '../types';
import {
  evaluateApplicationChecklist,
  filterByShowroom,
  getShowroomLabel,
  getTodayDateStr,
  isDateWithinRange,
  isOverdue,
} from '../utils/pureCalculations';
import { exportRTOReceiptPDF } from '../utils/pdfGenerator';

interface RTOWorkManagerProps {
  applications: RTOApplication[];
  applicationHistory: ApplicationHistoryEntry[];
  clients: Client[];
  documents: DocumentRecord[];
  showrooms: Showroom[];
  settings: SystemSettings;
  activeShowroomId: string;
  initialSearch?: string;
  onUpdateApplication: (app: RTOApplication, note?: string) => Promise<void>;
  onChangeStatus: (app: RTOApplication, nextStatus: WorkStatus, note: string) => Promise<void>;
  onDeleteApplication: (app: RTOApplication) => Promise<void>;
  onQuickUploadForApp: (app: RTOApplication) => void;
}

export const RTOWorkManager: React.FC<RTOWorkManagerProps> = ({
  applications,
  applicationHistory,
  clients,
  documents,
  showrooms,
  settings,
  activeShowroomId,
  initialSearch = '',
  onUpdateApplication,
  onChangeStatus,
  onDeleteApplication,
  onQuickUploadForApp,
}) => {
  const todayStr = getTodayDateStr();
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [appDateStart, setAppDateStart] = useState('');
  const [appDateEnd, setAppDateEnd] = useState('');
  const [compDateStart, setCompDateStart] = useState('');
  const [compDateEnd, setCompDateEnd] = useState('');

  // Status Change Modal
  const [statusModalApp, setStatusModalApp] = useState<RTOApplication | null>(null);
  const [nextStatus, setNextStatus] = useState<WorkStatus>('In Process');
  const [statusNote, setStatusNote] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  // Edit Modal
  const [editApp, setEditApp] = useState<RTOApplication | null>(null);
  const [editNote, setEditNote] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Detail Drawer (Checklist + Audit History)
  const [detailApp, setDetailApp] = useState<RTOApplication | null>(null);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<RTOApplication | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredApps = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return filterByShowroom(applications, activeShowroomId)
      .filter((a) => {
        if (categoryFilter !== 'ALL' && a.workType !== categoryFilter) return false;
        if (statusFilter !== 'ALL' && a.workStatus !== statusFilter) return false;
        if (!isDateWithinRange(a.applicationDate, appDateStart || undefined, appDateEnd || undefined)) {
          return false;
        }
        if (
          (compDateStart || compDateEnd) &&
          !isDateWithinRange(a.completionDate, compDateStart || undefined, compDateEnd || undefined)
        ) {
          return false;
        }
        if (!q) return true;
        return (
          a.id.toLowerCase().includes(q) ||
          a.applicationNumber.toLowerCase().includes(q) ||
          a.clientName.toLowerCase().includes(q) ||
          a.vehicleNumber.toLowerCase().includes(q) ||
          a.workType.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.applicationDate || '').localeCompare(a.applicationDate || ''));
  }, [
    applications,
    activeShowroomId,
    categoryFilter,
    statusFilter,
    appDateStart,
    appDateEnd,
    compDateStart,
    compDateEnd,
    searchTerm,
  ]);

  const openStatusModal = (app: RTOApplication) => {
    setStatusModalApp(app);
    setNextStatus(app.workStatus);
    setStatusNote('');
  };

  const handleConfirmStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalApp) return;
    setSavingStatus(true);
    try {
      await onChangeStatus(statusModalApp, nextStatus, statusNote.trim());
      setStatusModalApp(null);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editApp) return;
    setSavingEdit(true);
    try {
      await onUpdateApplication(editApp, editNote.trim() || undefined);
      setEditApp(null);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDeleteApplication(deleteTarget);
      if (detailApp?.id === deleteTarget.id) setDetailApp(null);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const statusColor = (status: WorkStatus) => {
    switch (status) {
      case 'Completed':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'In Process':
      case 'Submitted':
        return 'border-blue-200 bg-blue-50 text-blue-700';
      case 'Documents Pending':
      case 'On Hold':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      case 'Rejected':
        return 'border-red-200 bg-red-50 text-red-700';
      case 'Ready to Submit':
        return 'border-indigo-200 bg-indigo-50 text-indigo-700';
      default:
        return 'border-slate-200 bg-slate-100 text-slate-700';
    }
  };

  const checklistBadge = (status: string) => {
    if (status === 'Documents Complete') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (status === 'Documents Under Verification') return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  const isTerminal = (app: RTOApplication) =>
    app.workStatus === 'Completed' || app.workStatus === 'Rejected';

  return (
    <div className="space-y-5">
      {/* Filter Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              RTO Work Management ({filteredApps.length})
            </h2>
            <p className="text-xs text-slate-500">
              Track applications across 13 RTO categories with document compliance checklists and full status audit logs.
            </p>
          </div>
          {(categoryFilter !== 'ALL' ||
            statusFilter !== 'ALL' ||
            appDateStart ||
            appDateEnd ||
            compDateStart ||
            compDateEnd ||
            searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('ALL');
                setStatusFilter('ALL');
                setAppDateStart('');
                setAppDateEnd('');
                setCompDateStart('');
                setCompDateEnd('');
              }}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800"
            >
              Reset All Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search App ID, Govt No, Client, KA Reg..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All 13 RTO Categories</option>
            {RTO_WORK_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Work Statuses</option>
            {WORK_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={appDateStart}
              onChange={(e) => setAppDateStart(e.target.value)}
              title="Application Date From"
              className="rounded-lg border border-slate-300 px-2 py-2 text-xs focus:border-blue-500 focus:outline-none"
            />
            <input
              type="date"
              value={appDateEnd}
              onChange={(e) => setAppDateEnd(e.target.value)}
              title="Application Date To"
              className="rounded-lg border border-slate-300 px-2 py-2 text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="font-semibold">Completion Date Filter:</span>
          <input
            type="date"
            value={compDateStart}
            onChange={(e) => setCompDateStart(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
          />
          <span>to</span>
          <input
            type="date"
            value={compDateEnd}
            onChange={(e) => setCompDateEnd(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
          />
        </div>
      </div>

      {/* Applications Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {filteredApps.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No RTO applications match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Application & Showroom</th>
                  <th className="px-4 py-3">Client & Vehicle</th>
                  <th className="px-4 py-3">Work Category & RTO</th>
                  <th className="px-4 py-3">Checklist Status</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApps.map((app) => {
                  const checklist = evaluateApplicationChecklist(app, documents, settings);
                  const overdue = isOverdue(app.expectedCompletionDate, app.workStatus, todayStr);
                  const client = clients.find((c) => c.id === app.clientId);
                  const showroom = showrooms.find((s) => s.id === app.showroomId);

                  return (
                    <tr key={app.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-mono font-bold text-slate-900">{app.id}</p>
                        <p className="text-xs text-slate-500">
                          {getShowroomLabel(showrooms, app.showroomId)}
                        </p>
                        {app.applicationNumber && (
                          <p className="font-mono text-[11px] text-blue-700">
                            Govt: {app.applicationNumber}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{app.clientName}</p>
                        <p className="font-mono text-xs text-slate-600">{app.vehicleNumber}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{app.workType}</p>
                        <p className="truncate max-w-[200px] text-xs text-slate-500">
                          {app.rtoOffice}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-semibold ${checklistBadge(
                            checklist.status
                          )}`}
                        >
                          {checklist.status} ({checklist.uploaded.length}/{checklist.required.length})
                        </span>
                        {checklist.missing.length > 0 && (
                          <p className="mt-1 text-[11px] text-red-600 truncate max-w-[210px]">
                            Missing: {checklist.missing.join(', ')}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <p>App: {app.applicationDate}</p>
                        {app.completionDate ? (
                          <p className="text-emerald-700 font-medium">Done: {app.completionDate}</p>
                        ) : (
                          <p className={overdue ? 'text-red-600 font-semibold' : ''}>
                            Due: {app.expectedCompletionDate || '—'}
                            {overdue ? ' (Overdue)' : ''}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={isTerminal(app)}
                          onClick={() => openStatusModal(app)}
                          title={
                            isTerminal(app)
                              ? 'Completed/Rejected applications have locked status'
                              : 'Update Application Status'
                          }
                          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold ${statusColor(
                            app.workStatus
                          )} ${!isTerminal(app) ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
                        >
                          <span>{app.workStatus}</span>
                          {!isTerminal(app) && <RefreshCw className="h-3 w-3 opacity-70" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailApp(app)}
                            title="Details, Checklist & History"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              exportRTOReceiptPDF(app, client, showroom, settings, checklist)
                            }
                            title="Print RTO Acknowledgement PDF"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditApp({ ...app });
                              setEditNote('');
                            }}
                            title="Edit Application"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(app)}
                            title="Archive & Delete"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status Change Modal */}
      {statusModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="font-display text-base font-bold text-slate-900">
                Update Status — {statusModalApp.id}
              </h3>
              <button
                type="button"
                onClick={() => setStatusModalApp(null)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmStatus} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Work Status
                </label>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as WorkStatus)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {WORK_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  History Log Note
                </label>
                <textarea
                  rows={3}
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="e.g. Verified Form 29/30 and submitted at KA-04 counter"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModalApp(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStatus}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {savingStatus ? 'Updating...' : 'Save Status & Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Application Modal */}
      {editApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="font-display text-base font-bold text-slate-900">
                Edit RTO Application ({editApp.id})
              </h3>
              <button
                type="button"
                onClick={() => setEditApp(null)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              {isTerminal(editApp) && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Application is finalized ({editApp.workStatus}). Only remarks can be modified.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Showroom</label>
                  <select
                    disabled={isTerminal(editApp)}
                    value={editApp.showroomId}
                    onChange={(e) => setEditApp({ ...editApp, showroomId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  >
                    {showrooms.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} — {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Work Category
                  </label>
                  <select
                    disabled={isTerminal(editApp)}
                    value={editApp.workType}
                    onChange={(e) => setEditApp({ ...editApp, workType: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  >
                    {RTO_WORK_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Govt Application No
                  </label>
                  <input
                    disabled={isTerminal(editApp)}
                    type="text"
                    value={editApp.applicationNumber}
                    onChange={(e) =>
                      setEditApp({ ...editApp, applicationNumber: e.target.value.toUpperCase() })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">RTO Office</label>
                  <select
                    disabled={isTerminal(editApp)}
                    value={editApp.rtoOffice}
                    onChange={(e) => setEditApp({ ...editApp, rtoOffice: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  >
                    {settings.rtoOffices.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Submission Date
                  </label>
                  <input
                    disabled={isTerminal(editApp)}
                    type="date"
                    value={editApp.submissionDate}
                    onChange={(e) => setEditApp({ ...editApp, submissionDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expected Completion
                  </label>
                  <input
                    disabled={isTerminal(editApp)}
                    type="date"
                    value={editApp.expectedCompletionDate}
                    onChange={(e) =>
                      setEditApp({ ...editApp, expectedCompletionDate: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  />
                </div>

                {!isTerminal(editApp) && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Required Document Checklist
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {DOCUMENT_CATEGORIES.map((docCat) => {
                        const checked = (editApp.requiredDocuments || []).includes(docCat);
                        return (
                          <button
                            key={docCat}
                            type="button"
                            onClick={() => {
                              const curr = editApp.requiredDocuments || [];
                              const next: DocumentCategory[] = checked
                                ? curr.filter((x) => x !== docCat)
                                : [...curr, docCat];
                              setEditApp({ ...editApp, requiredDocuments: next });
                            }}
                            className={`rounded border px-2 py-1 text-xs ${
                              checked
                                ? 'border-blue-600 bg-blue-50 text-blue-800 font-semibold'
                                : 'border-slate-200 bg-white text-slate-600'
                            }`}
                          >
                            {checked ? '✓ ' : '+ '}
                            {docCat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
                  <textarea
                    rows={2}
                    value={editApp.remarks}
                    onChange={(e) => setEditApp({ ...editApp, remarks: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                {!isTerminal(editApp) && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Audit Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="Describe changes made"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditApp(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{savingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Drawer: Checklist + History Audit Trail */}
      {detailApp && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="font-mono text-xs font-semibold text-blue-700">
                  {detailApp.id} · {getShowroomLabel(showrooms, detailApp.showroomId)}
                </p>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  {detailApp.workType} — {detailApp.vehicleNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailApp(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {(() => {
                const evalRes = evaluateApplicationChecklist(detailApp, documents, settings);
                const appDocs = documents.filter(
                  (d) => d.applicationId === detailApp.id || d.vehicleId === detailApp.vehicleId
                );
                const historyRows = applicationHistory
                  .filter((h) => h.applicationId === detailApp.id)
                  .sort((a, b) => (b.changedAt || '').localeCompare(a.changedAt || ''));

                return (
                  <>
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
                      <div>
                        <span className="text-slate-500">Client:</span>{' '}
                        <strong className="text-slate-900">{detailApp.clientName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">RTO Office:</span>{' '}
                        <span className="text-slate-900">{detailApp.rtoOffice}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Govt App No:</span>{' '}
                        <span className="font-mono text-slate-900">
                          {detailApp.applicationNumber || 'Pending'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Status:</span>{' '}
                        <strong className="text-blue-700">{detailApp.workStatus}</strong>
                      </div>
                    </div>

                    {/* Checklist Evaluation */}
                    <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="font-display text-sm font-bold text-slate-900">
                            Document Checklist Verification
                          </h4>
                          <p className="text-xs text-slate-500">
                            Status: <strong>{evalRes.status}</strong> ({evalRes.completionPercent}%)
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDetailApp(null);
                            onQuickUploadForApp(detailApp);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span>Upload Document</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {evalRes.required.map((docCat) => {
                          const isMissing = evalRes.missing.includes(docCat);
                          const isRejected = evalRes.rejected.includes(docCat);
                          const isPending = evalRes.pendingVerification.includes(docCat);
                          const label = isMissing
                            ? 'Missing'
                            : isRejected
                            ? 'Rejected'
                            : isPending
                            ? 'Pending Verification'
                            : 'Verified';
                          const cls = isMissing || isRejected
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : isPending
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700';

                          return (
                            <div
                              key={docCat}
                              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${cls}`}
                            >
                              <span className="font-semibold">{docCat}</span>
                              <span>{label}</span>
                            </div>
                          );
                        })}
                      </div>

                      {appDocs.length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-xs font-semibold text-slate-600 mb-1.5">
                            Attached Files ({appDocs.length})
                          </p>
                          <div className="space-y-1.5">
                            {appDocs.map((d) => (
                              <div
                                key={d.id}
                                className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-1.5 text-xs"
                              >
                                <span className="truncate font-medium text-slate-800">
                                  {d.documentType} — {d.fileName || d.filePathOrReference}
                                </span>
                                {d.downloadUrl && (
                                  <a
                                    href={d.downloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-2 shrink-0 font-semibold text-blue-700 hover:underline"
                                  >
                                    Open File
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Audit History Timeline */}
                    <div>
                      <h4 className="flex items-center gap-2 font-display text-sm font-bold text-slate-900 mb-3">
                        <History className="h-4 w-4 text-blue-600" />
                        <span>Application History ({historyRows.length})</span>
                      </h4>
                      {historyRows.length === 0 ? (
                        <p className="text-xs text-slate-500">No status history recorded yet.</p>
                      ) : (
                        <div className="space-y-2.5 border-l-2 border-slate-200 pl-4 ml-2">
                          {historyRows.map((h) => (
                            <div key={h.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-slate-900">{h.actionSummary}</span>
                                <span className="font-mono text-[11px] text-slate-400">
                                  {h.changedAt.replace('T', ' ').slice(0, 16)}
                                </span>
                              </div>
                              {h.note && <p className="mt-1 text-slate-600">{h.note}</p>}
                              <p className="mt-1 text-[11px] text-slate-400">By {h.actorEmail}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="font-display text-base font-bold text-slate-900">
              Archive Application {deleteTarget.id}?
            </h3>
            <p className="mt-1.5 text-sm text-slate-600">
              Moves <strong>{deleteTarget.workType}</strong> ({deleteTarget.vehicleNumber}) to the Safety Archive.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? 'Archiving...' : 'Archive Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
