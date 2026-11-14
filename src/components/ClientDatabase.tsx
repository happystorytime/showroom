import React, { useMemo, useState } from 'react';
import {
  Search,
  UserPlus,
  Edit3,
  Trash2,
  Eye,
  Printer,
  X,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Car,
  ClipboardList,
  FolderOpen,
} from 'lucide-react';
import type {
  Client,
  DocumentRecord,
  RTOApplication,
  Showroom,
  SystemSettings,
  Vehicle,
} from '../types';
import {
  findDuplicateClient,
  formatAadhaarInput,
  formatPanInput,
  getShowroomLabel,
  getTodayDateStr,
  maskAadhaar,
  maskPAN,
} from '../utils/pureCalculations';
import { exportGeneralReportPDF } from '../utils/pdfGenerator';

interface ClientDatabaseProps {
  clients: Client[];
  vehicles: Vehicle[];
  applications: RTOApplication[];
  documents: DocumentRecord[];
  showrooms: Showroom[];
  settings: SystemSettings;
  activeShowroomId: string;
  initialSearch?: string;
  onSaveClient: (client: Client, isUpdate: boolean) => Promise<void>;
  onDeleteClient: (client: Client) => Promise<void>;
  getNextClientId: () => string;
}

export const ClientDatabase: React.FC<ClientDatabaseProps> = ({
  clients,
  vehicles,
  applications,
  documents,
  showrooms,
  settings,
  activeShowroomId,
  initialSearch = '',
  onSaveClient,
  onDeleteClient,
  getNextClientId,
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [filterByActiveShowroomOnly, setFilterByActiveShowroomOnly] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Client>({
    id: '',
    createdShowroomId: undefined,
    name: '',
    mobile: '',
    alternateMobile: '',
    address: '',
    aadhaar: '',
    panNumber: '',
    registrationDate: getTodayDateStr(),
    remarks: '',
    createdAt: '',
    updatedAt: '',
  });

  const [drawerClient, setDrawerClient] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredClients = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return clients.filter((c) => {
      if (filterByActiveShowroomOnly && activeShowroomId !== 'ALL') {
        const servedInBranch =
          c.createdShowroomId === activeShowroomId ||
          applications.some((a) => a.clientId === c.id && a.showroomId === activeShowroomId);
        if (!servedInBranch) return false;
      }

      if (!q) return true;
      const linkedVehs = vehicles.filter((v) => v.clientId === c.id);
      const matchesVehicle = linkedVehs.some(
        (v) =>
          v.vehicleNumber.toLowerCase().includes(q) ||
          v.chassisNumber.toLowerCase().includes(q)
      );
      return (
        c.name.toLowerCase().includes(q) ||
        c.mobile.toLowerCase().includes(q) ||
        (c.alternateMobile || '').toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        (c.panNumber || '').toLowerCase().includes(q) ||
        matchesVehicle
      );
    });
  }, [clients, vehicles, applications, searchTerm, filterByActiveShowroomOnly, activeShowroomId]);

  const duplicateWarning = useMemo(() => {
    if (!formOpen) return null;
    if (
      form.mobile.replace(/\D/g, '').length < 10 &&
      (form.aadhaar || '').replace(/\D/g, '').length < 12 &&
      (form.panNumber || '').length < 10
    ) {
      return null;
    }
    return findDuplicateClient(clients, {
      mobile: form.mobile,
      aadhaar: form.aadhaar,
      panNumber: form.panNumber,
      excludeId: isEditing ? form.id : undefined,
    });
  }, [formOpen, form.mobile, form.aadhaar, form.panNumber, form.id, isEditing, clients]);

  const openAdd = () => {
    const today = getTodayDateStr();
    setIsEditing(false);
    setFormError(null);
    setForm({
      id: getNextClientId(),
      createdShowroomId: activeShowroomId !== 'ALL' ? activeShowroomId : showrooms[0]?.id,
      name: '',
      mobile: '',
      alternateMobile: '',
      address: '',
      aadhaar: '',
      panNumber: '',
      registrationDate: today,
      remarks: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setFormOpen(true);
  };

  const openEdit = (client: Client) => {
    setIsEditing(true);
    setFormError(null);
    setForm({ ...client });
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || form.mobile.replace(/\D/g, '').length < 10) {
      setFormError('Client full name and a valid 10-digit mobile number are required.');
      return;
    }
    if (duplicateWarning) {
      setFormError(
        `Duplicate detected (${duplicateWarning.matchedBy}): ${duplicateWarning.client.name} (${duplicateWarning.client.id}) already exists in the common client database.`
      );
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const nowIso = new Date().toISOString();
      await onSaveClient(
        {
          ...form,
          name: form.name.trim(),
          mobile: form.mobile.trim(),
          alternateMobile: (form.alternateMobile || '').trim(),
          address: (form.address || '').trim(),
          aadhaar: form.aadhaar?.trim() || undefined,
          panNumber: form.panNumber?.trim().toUpperCase() || undefined,
          remarks: (form.remarks || '').trim(),
          updatedAt: nowIso,
          createdAt: form.createdAt || nowIso,
        },
        isEditing
      );
      setFormOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save client.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintClients = () => {
    exportGeneralReportPDF(
      'Common Client Directory Report',
      ['Client ID', 'Full Name', 'Mobile', 'Address', 'Aadhaar', 'Vehicles', 'RTO Apps', 'Showrooms'],
      filteredClients.map((c) => {
        const vehCount = vehicles.filter((v) => v.clientId === c.id).length;
        const cApps = applications.filter((a) => a.clientId === c.id);
        const branchNames = Array.from(
          new Set(cApps.map((a) => getShowroomLabel(showrooms, a.showroomId)))
        ).join(', ');
        return [
          c.id,
          c.name,
          c.mobile,
          c.address || '—',
          maskAadhaar(c.aadhaar),
          vehCount,
          cApps.length,
          branchNames || 'Common',
        ];
      }),
      settings,
      `Centralized Common Database · Total Clients: ${filteredClients.length}`
    );
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDeleteClient(deleteTarget);
      if (drawerClient?.id === deleteTarget.id) setDrawerClient(null);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Common Client Database ({clients.length})
            </h2>
            <p className="text-xs text-slate-500">
              One centralized directory shared across all showrooms. Existing clients visiting another showroom are linked without duplication.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrintClients}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              <span>Export PDF</span>
            </button>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Client</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by client name, mobile, PAN, ID, or vehicle registration number..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          {activeShowroomId !== 'ALL' && (
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={filterByActiveShowroomOnly}
                onChange={(e) => setFilterByActiveShowroomOnly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              <span>Only clients served at selected showroom</span>
            </label>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {filteredClients.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No matching clients found in the common directory.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Client ID & Name</th>
                  <th className="px-4 py-3">Mobile / Alt</th>
                  <th className="px-4 py-3">KYC (Masked)</th>
                  <th className="px-4 py-3">Vehicles</th>
                  <th className="px-4 py-3">Showrooms Used</th>
                  <th className="px-4 py-3 text-right">RTO Apps</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClients.map((client) => {
                  const linkedVehs = vehicles.filter((v) => v.clientId === client.id);
                  const clientApps = applications.filter((a) => a.clientId === client.id);
                  const branchCodes = Array.from(
                    new Set(
                      clientApps.map((a) => {
                        const s = showrooms.find((sh) => sh.id === a.showroomId);
                        return s ? s.code : a.showroomId;
                      })
                    )
                  );
                  return (
                    <tr key={client.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{client.name}</p>
                        <p className="font-mono text-xs text-slate-500">
                          {client.id} · Reg {client.registrationDate}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        <p>{client.mobile}</p>
                        {client.alternateMobile && (
                          <p className="text-slate-400">{client.alternateMobile}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        <p>UID: {maskAadhaar(client.aadhaar)}</p>
                        {client.panNumber && <p>PAN: {maskPAN(client.panNumber)}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {linkedVehs.length === 0 ? (
                          <span className="text-slate-400">No vehicles</span>
                        ) : (
                          <div className="space-y-0.5">
                            {linkedVehs.slice(0, 2).map((v) => (
                              <p key={v.id} className="font-mono font-semibold text-slate-800">
                                {v.vehicleNumber}
                              </p>
                            ))}
                            {linkedVehs.length > 2 && (
                              <p className="text-[11px] text-blue-700">
                                +{linkedVehs.length - 2} more
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {branchCodes.length > 0 ? (
                          <span className="font-mono">{branchCodes.join(', ')}</span>
                        ) : client.createdShowroomId ? (
                          <span className="text-slate-500">
                            {getShowroomLabel(showrooms, client.createdShowroomId)}
                          </span>
                        ) : (
                          'Common'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                        {clientApps.length}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDrawerClient(client)}
                            title="View 360° Client History"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(client)}
                            title="Edit Client"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(client)}
                            title="Delete & Archive Client"
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

      {/* Add / Edit Client Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="font-display text-base font-bold text-slate-900">
                {isEditing ? `Edit Common Client (${form.id})` : `Add Common Client (${form.id})`}
              </h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {formError}
                </div>
              )}

              {duplicateWarning && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>
                    Matches existing client <strong>{duplicateWarning.client.name}</strong> (
                    {duplicateWarning.client.id}) by {duplicateWarning.matchedBy}.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alternate Mobile
                  </label>
                  <input
                    type="tel"
                    value={form.alternateMobile}
                    onChange={(e) => setForm({ ...form, alternateMobile: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Aadhaar Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.aadhaar || ''}
                    onChange={(e) => setForm({ ...form, aadhaar: formatAadhaarInput(e.target.value) })}
                    placeholder="XXXX-XXXX-XXXX"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PAN Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.panNumber || ''}
                    onChange={(e) => setForm({ ...form, panNumber: formatPanInput(e.target.value) })}
                    placeholder="ABCDE1234F"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registration Date
                  </label>
                  <input
                    type="date"
                    value={form.registrationDate}
                    onChange={(e) => setForm({ ...form, registrationDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    First Registered Showroom
                  </label>
                  <select
                    value={form.createdShowroomId || ''}
                    onChange={(e) =>
                      setForm({ ...form, createdShowroomId: e.target.value || undefined })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Common (No Primary Branch)</option>
                    {showrooms.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} — {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                  <textarea
                    rows={2}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
                  <input
                    type="text"
                    value={form.remarks}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
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
                  <span>{saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Register Client'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 360° Client History Drawer */}
      {drawerClient && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="font-mono text-xs font-semibold text-blue-700">{drawerClient.id}</p>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  {drawerClient.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDrawerClient(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* KYC Summary */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
                <div>
                  <span className="text-slate-500">Mobile:</span>{' '}
                  <span className="font-mono font-semibold text-slate-900">{drawerClient.mobile}</span>
                </div>
                <div>
                  <span className="text-slate-500">Alternate:</span>{' '}
                  <span className="font-mono text-slate-800">{drawerClient.alternateMobile || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Aadhaar:</span>{' '}
                  <span className="font-mono text-slate-800">{maskAadhaar(drawerClient.aadhaar)}</span>
                </div>
                <div>
                  <span className="text-slate-500">PAN:</span>{' '}
                  <span className="font-mono text-slate-800">{maskPAN(drawerClient.panNumber)}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">Address:</span>{' '}
                  <span className="text-slate-800">{drawerClient.address || '—'}</span>
                </div>
              </div>

              {/* Linked Showrooms */}
              {(() => {
                const cApps = applications.filter((a) => a.clientId === drawerClient.id);
                const cVehs = vehicles.filter((v) => v.clientId === drawerClient.id);
                const cDocs = documents.filter((d) => d.clientId === drawerClient.id);
                const branchIds = Array.from(new Set(cApps.map((a) => a.showroomId)));

                return (
                  <>
                    <div>
                      <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        <span>Showrooms Served ({branchIds.length})</span>
                      </h4>
                      {branchIds.length === 0 ? (
                        <p className="text-xs text-slate-500">No showroom RTO applications yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {branchIds.map((sid) => {
                            const s = showrooms.find((sh) => sh.id === sid);
                            return (
                              <span
                                key={sid}
                                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
                              >
                                {s ? `${s.code} — ${s.name}` : sid}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                        <Car className="h-4 w-4 text-indigo-600" />
                        <span>Linked Vehicles ({cVehs.length})</span>
                      </h4>
                      {cVehs.length === 0 ? (
                        <p className="text-xs text-slate-500">No vehicles registered.</p>
                      ) : (
                        <div className="space-y-2">
                          {cVehs.map((v) => (
                            <div
                              key={v.id}
                              className="rounded-lg border border-slate-200 p-3 text-xs flex items-center justify-between"
                            >
                              <div>
                                <p className="font-mono font-bold text-slate-900">{v.vehicleNumber}</p>
                                <p className="text-slate-500">
                                  {v.manufacturer} {v.model} ({v.vehicleClass}) · {v.rtoOffice}
                                </p>
                              </div>
                              <span className="text-slate-600">
                                RC: {v.rcValidity || '—'} · Ins: {v.insuranceExpiry || '—'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                        <ClipboardList className="h-4 w-4 text-emerald-600" />
                        <span>RTO Applications ({cApps.length})</span>
                      </h4>
                      {cApps.length === 0 ? (
                        <p className="text-xs text-slate-500">No RTO applications filed.</p>
                      ) : (
                        <div className="space-y-2">
                          {cApps.map((a) => (
                            <div
                              key={a.id}
                              className="rounded-lg border border-slate-200 p-3 text-xs flex items-center justify-between"
                            >
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {a.id} · {a.workType}
                                </p>
                                <p className="text-slate-500">
                                  {a.vehicleNumber} · {getShowroomLabel(showrooms, a.showroomId)} ·{' '}
                                  {a.applicationDate}
                                </p>
                              </div>
                              <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-800">
                                {a.workStatus}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                        <FolderOpen className="h-4 w-4 text-amber-600" />
                        <span>Uploaded & Tracked Documents ({cDocs.length})</span>
                      </h4>
                      {cDocs.length === 0 ? (
                        <p className="text-xs text-slate-500">No documents attached yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {cDocs.map((d) => (
                            <div
                              key={d.id}
                              className="rounded-lg border border-slate-200 p-3 text-xs flex items-center justify-between"
                            >
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {d.documentType} ({d.vehicleNumber})
                                </p>
                                <p className="text-slate-500">
                                  {d.fileName || d.filePathOrReference} · {d.receivedStatus}
                                </p>
                              </div>
                              <span className="font-semibold text-slate-700">
                                {d.verificationStatus}
                              </span>
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
              Archive & Remove Client {deleteTarget.name}?
            </h3>
            <p className="mt-1.5 text-sm text-slate-600">
              This removes <strong>{deleteTarget.id}</strong> from the active directory and saves a recoverable snapshot in the Safety Archive.
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
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? 'Archiving...' : 'Archive Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
