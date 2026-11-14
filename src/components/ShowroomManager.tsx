import React, { useMemo, useState } from 'react';
import {
  Building2,
  Plus,
  Edit3,
  Trash2,
  MapPin,
  Phone,
  UserCheck,
  ShieldAlert,
  CheckCircle2,
  X,
  ArrowRight,
} from 'lucide-react';
import type { DocumentRecord, RTOApplication, Showroom, SystemSettings } from '../types';
import {
  checkShowroomDeletionSafety,
  computeShowroomRtoSummary,
  getTodayDateStr,
} from '../utils/pureCalculations';

interface ShowroomManagerProps {
  showrooms: Showroom[];
  applications: RTOApplication[];
  documents: DocumentRecord[];
  settings: SystemSettings;
  onSaveShowroom: (showroom: Showroom, isUpdate: boolean) => Promise<void>;
  onDeleteShowroom: (showroomId: string) => Promise<void>;
  onSelectShowroomWorkspace: (showroomId: string) => void;
  getNextShowroomId: () => string;
}

const emptyForm = (nextId: string, defaultRto: string): Showroom => ({
  id: nextId,
  name: '',
  code: '',
  city: '',
  address: '',
  phone: '',
  managerName: '',
  rtoJurisdiction: defaultRto,
  isActive: true,
});

export const ShowroomManager: React.FC<ShowroomManagerProps> = ({
  showrooms,
  applications,
  documents,
  settings,
  onSaveShowroom,
  onDeleteShowroom,
  onSelectShowroomWorkspace,
  getNextShowroomId,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Showroom>(() =>
    emptyForm(getNextShowroomId(), settings.rtoOffices[0] || '')
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Showroom | null>(null);
  const [deleteBlockReason, setDeleteBlockReason] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const todayStr = getTodayDateStr();
  const summaries = useMemo(
    () => computeShowroomRtoSummary(showrooms, { applications, documents, settings }, todayStr),
    [showrooms, applications, documents, settings, todayStr]
  );

  const openAdd = () => {
    setIsEditing(false);
    setForm(emptyForm(getNextShowroomId(), settings.rtoOffices[0] || ''));
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (shw: Showroom) => {
    setIsEditing(true);
    setForm({ ...shw });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim() || !form.city.trim()) {
      setFormError('Showroom name, showroom code, and city are required.');
      return;
    }

    const codeNorm = form.code.trim().toUpperCase();
    const duplicateCode = showrooms.find(
      (s) => s.id !== form.id && s.code.trim().toUpperCase() === codeNorm
    );
    if (duplicateCode) {
      setFormError(`Showroom code "${codeNorm}" is already assigned to ${duplicateCode.name}.`);
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await onSaveShowroom(
        {
          ...form,
          name: form.name.trim(),
          code: codeNorm,
          city: form.city.trim(),
          address: form.address.trim(),
          phone: form.phone.trim(),
          managerName: form.managerName.trim(),
          rtoJurisdiction: form.rtoJurisdiction.trim(),
        },
        isEditing
      );
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save showroom.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (shw: Showroom) => {
    await onSaveShowroom({ ...shw, isActive: !shw.isActive }, true);
  };

  const requestDelete = (shw: Showroom) => {
    const safety = checkShowroomDeletionSafety(shw.id, { showrooms, applications, documents });
    setDeleteTarget(shw);
    setDeleteBlockReason(safety.allowed ? null : safety.reason || 'Cannot delete showroom.');
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleteBlockReason) return;
    setDeleting(true);
    try {
      await onDeleteShowroom(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Partner Showrooms ({showrooms.length})
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Maintain separate RTO work tracking per showroom while sharing one common client & vehicle database.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add Showroom</span>
        </button>
      </div>

      {/* Showroom Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {summaries.map(({ showroom: shw, uniqueClientsCount, uniqueVehiclesCount, applicationsCount, inProcessCount, completedCount, missingDocsAppsCount, documentsCount }) => (
          <div
            key={shw.id}
            className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-blue-700">
                      {shw.id} · {shw.code}
                    </p>
                    <h3 className="truncate font-display text-base font-bold text-slate-900 mt-0.5">
                      {shw.name}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleActive(shw)}
                  className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold border transition-colors ${
                    shw.isActive
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {shw.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {shw.city}
                    {shw.address ? ` — ${shw.address}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono">{shw.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    Contact: {shw.managerName || '—'} · {shw.rtoJurisdiction || 'Karnataka RTO'}
                  </span>
                </div>
              </div>

              {/* Showroom RTO Stats Grid */}
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
                <div>
                  <p className="text-[11px] text-slate-500">Total Apps</p>
                  <p className="font-display text-base font-bold text-slate-900 tabular-nums">
                    {applicationsCount}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">In Process</p>
                  <p className="font-display text-base font-bold text-blue-700 tabular-nums">
                    {inProcessCount}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Completed</p>
                  <p className="font-display text-base font-bold text-emerald-700 tabular-nums">
                    {completedCount}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {uniqueClientsCount} clients · {uniqueVehiclesCount} vehicles · {documentsCount} docs
                </span>
                {missingDocsAppsCount > 0 && (
                  <span className="font-semibold text-amber-700">
                    {missingDocsAppsCount} missing docs
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onSelectShowroomWorkspace(shw.id)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800"
              >
                <span>Open Showroom RTO Work</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(shw)}
                  title="Edit Showroom"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => requestDelete(shw)}
                  title="Delete Showroom"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Showroom Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="font-display text-base font-bold text-slate-900">
                {isEditing ? `Edit Showroom (${form.id})` : 'Add Partner Showroom'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Showroom Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Sri Basaveshwara Tractor Motors"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Showroom Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. BLR-YPR"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City / Town *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="e.g. Bengaluru"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Number
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="10-digit mobile / landline"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Showroom Coordinator
                  </label>
                  <input
                    type="text"
                    value={form.managerName}
                    onChange={(e) => setForm({ ...form, managerName: e.target.value })}
                    placeholder="Contact person name"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary RTO Jurisdiction
                  </label>
                  <select
                    value={form.rtoJurisdiction}
                    onChange={(e) => setForm({ ...form, rtoJurisdiction: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {settings.rtoOffices.map((rto) => (
                      <option key={rto} value={rto}>
                        {rto}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Showroom Address
                  </label>
                  <textarea
                    rows={2}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Full branch address"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-2">
                  <input
                    id="shw-active-toggle"
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="shw-active-toggle" className="text-sm text-slate-700">
                    Showroom is Active for new RTO applications
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : isEditing ? 'Update Showroom' : 'Create Showroom'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Protection & Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  deleteBlockReason ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                }`}
              >
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-base font-bold text-slate-900">
                  {deleteBlockReason ? 'Showroom Protected' : `Delete ${deleteTarget.name}?`}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {deleteBlockReason
                    ? deleteBlockReason
                    : `This will permanently remove showroom ${deleteTarget.code} (${deleteTarget.id}). No applications or documents are linked to this branch.`}
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {deleteBlockReason ? 'Close' : 'Cancel'}
              </button>
              {!deleteBlockReason && (
                <button
                  type="button"
                  disabled={deleting}
                  onClick={confirmDelete}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
