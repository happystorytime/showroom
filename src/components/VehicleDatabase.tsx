import React, { useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type {
  Client,
  FuelType,
  HypothecationStatus,
  SystemSettings,
  Vehicle,
} from '../types';
import { FUEL_TYPES } from '../types';
import {
  formatVehicleNumber,
  getDocumentAlertStatus,
  getTodayDateStr,
} from '../utils/pureCalculations';
import { exportGeneralReportPDF } from '../utils/pdfGenerator';

interface VehicleDatabaseProps {
  vehicles: Vehicle[];
  clients: Client[];
  settings: SystemSettings;
  initialSearch?: string;
  onSaveVehicle: (vehicle: Vehicle, isUpdate: boolean) => Promise<void>;
  onDeleteVehicle: (vehicle: Vehicle) => Promise<void>;
  getNextVehicleId: () => string;
}

export const VehicleDatabase: React.FC<VehicleDatabaseProps> = ({
  vehicles,
  clients,
  settings,
  initialSearch = '',
  onSaveVehicle,
  onDeleteVehicle,
  getNextVehicleId,
}) => {
  const todayStr = getTodayDateStr();
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [classFilter, setClassFilter] = useState('ALL');
  const [expiryFilter, setExpiryFilter] = useState<'ALL' | 'EXPIRED' | 'EXPIRING_SOON'>('ALL');

  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Vehicle>({
    id: '',
    clientId: '',
    vehicleNumber: '',
    chassisNumber: '',
    engineNumber: '',
    vehicleClass: settings.vehicleClasses[0] || 'Agricultural Tractor',
    model: '',
    manufacturer: '',
    manufacturingYear: new Date().getFullYear(),
    fuelType: 'Diesel',
    ownerName: '',
    registrationDate: todayStr,
    rcValidity: '',
    insuranceExpiry: '',
    hypothecationStatus: 'None',
    hypothecationFinancer: '',
    rtoOffice: settings.rtoOffices[0] || 'KA-04 (Bangalore North - Yeshwanthpur)',
    documentStatus: 'Pending Verification',
    createdAt: '',
    updatedAt: '',
  });

  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredVehicles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (classFilter !== 'ALL' && v.vehicleClass !== classFilter) return false;
      const rcStatus = getDocumentAlertStatus(v.rcValidity, todayStr);
      const insStatus = getDocumentAlertStatus(v.insuranceExpiry, todayStr);
      if (expiryFilter === 'EXPIRED' && rcStatus !== 'expired' && insStatus !== 'expired') {
        return false;
      }
      if (
        expiryFilter === 'EXPIRING_SOON' &&
        rcStatus !== 'expiring_soon' &&
        insStatus !== 'expiring_soon'
      ) {
        return false;
      }
      if (!q) return true;
      return (
        v.vehicleNumber.toLowerCase().includes(q) ||
        v.ownerName.toLowerCase().includes(q) ||
        v.chassisNumber.toLowerCase().includes(q) ||
        v.engineNumber.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.manufacturer.toLowerCase().includes(q) ||
        v.id.toLowerCase().includes(q)
      );
    });
  }, [vehicles, searchTerm, classFilter, expiryFilter, todayStr]);

  const openAdd = () => {
    const firstClient = clients[0];
    setIsEditing(false);
    setFormError(null);
    setForm({
      id: getNextVehicleId(),
      clientId: firstClient?.id || '',
      vehicleNumber: '',
      chassisNumber: '',
      engineNumber: '',
      vehicleClass: settings.vehicleClasses[0] || 'Agricultural Tractor',
      model: '',
      manufacturer: '',
      manufacturingYear: new Date().getFullYear(),
      fuelType: 'Diesel',
      ownerName: firstClient?.name || '',
      registrationDate: todayStr,
      rcValidity: '',
      insuranceExpiry: '',
      hypothecationStatus: 'None',
      hypothecationFinancer: '',
      rtoOffice: settings.rtoOffices[0] || 'KA-04 (Bangalore North - Yeshwanthpur)',
      documentStatus: 'Pending Verification',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setFormOpen(true);
  };

  const openEdit = (v: Vehicle) => {
    setIsEditing(true);
    setFormError(null);
    setForm({ ...v });
    setFormOpen(true);
  };

  const handleClientSelect = (cid: string) => {
    const c = clients.find((x) => x.id === cid);
    setForm((prev) => ({
      ...prev,
      clientId: cid,
      ownerName: prev.ownerName || c?.name || '',
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) {
      setFormError('Please select a Client from the common directory first.');
      return;
    }
    if (!form.vehicleNumber.trim()) {
      setFormError('Vehicle registration number is required.');
      return;
    }

    const cleanNum = formatVehicleNumber(form.vehicleNumber);
    const duplicate = vehicles.find(
      (v) => v.id !== form.id && formatVehicleNumber(v.vehicleNumber) === cleanNum
    );
    if (duplicate) {
      setFormError(`Vehicle ${cleanNum} is already registered (${duplicate.id}).`);
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const nowIso = new Date().toISOString();
      await onSaveVehicle(
        {
          ...form,
          vehicleNumber: cleanNum,
          chassisNumber: form.chassisNumber.trim().toUpperCase(),
          engineNumber: form.engineNumber.trim().toUpperCase(),
          manufacturer: form.manufacturer.trim(),
          model: form.model.trim(),
          ownerName: form.ownerName.trim() || clients.find((c) => c.id === form.clientId)?.name || 'Owner',
          hypothecationFinancer:
            form.hypothecationStatus === 'Hypothecated'
              ? form.hypothecationFinancer?.trim()
              : undefined,
          createdAt: form.createdAt || nowIso,
          updatedAt: nowIso,
        },
        isEditing
      );
      setFormOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save vehicle.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    exportGeneralReportPDF(
      'Vehicle Master Registry',
      ['Veh ID', 'Reg Number', 'Owner', 'Class', 'Make & Model', 'RC Valid', 'Ins Valid', 'HP Status', 'RTO Office'],
      filteredVehicles.map((v) => [
        v.id,
        v.vehicleNumber,
        v.ownerName,
        v.vehicleClass,
        `${v.manufacturer} ${v.model}`.trim() || '—',
        v.rcValidity || '—',
        v.insuranceExpiry || '—',
        v.hypothecationStatus,
        v.rtoOffice,
      ]),
      settings,
      `Total Vehicles: ${filteredVehicles.length}`
    );
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDeleteVehicle(deleteTarget);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const validityBadge = (dateStr: string | undefined) => {
    const status = getDocumentAlertStatus(dateStr, todayStr);
    if (status === 'expired') return 'text-red-700 bg-red-50 border-red-200';
    if (status === 'expiring_soon') return 'text-amber-700 bg-amber-50 border-amber-200';
    if (status === 'valid') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    return 'text-slate-600 bg-slate-100 border-slate-200';
  };

  return (
    <div className="space-y-5">
      {/* Header & Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Vehicle Master Registry ({vehicles.length})
            </h2>
            <p className="text-xs text-slate-500">
              One client can own multiple vehicles. Track RC validity, insurance, chassis/engine numbers, and hypothecation.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              <span>Export PDF</span>
            </button>
            <button
              type="button"
              onClick={openAdd}
              disabled={clients.length === 0}
              title={clients.length === 0 ? 'Add a Client first' : 'Add Vehicle'}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>Add Vehicle</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reg no, owner, chassis, engine..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Vehicle Classes</option>
            {settings.vehicleClasses.map((vc) => (
              <option key={vc} value={vc}>
                {vc}
              </option>
            ))}
          </select>
          <select
            value={expiryFilter}
            onChange={(e) => setExpiryFilter(e.target.value as 'ALL' | 'EXPIRED' | 'EXPIRING_SOON')}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Validity Statuses</option>
            <option value="EXPIRED">Expired RC / Insurance</option>
            <option value="EXPIRING_SOON">Expiring Within 30 Days</option>
          </select>
        </div>
      </div>

      {/* Vehicle Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {filteredVehicles.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            {clients.length === 0
              ? 'Register a Client first, then enroll vehicles here or via New RTO Entry.'
              : 'No matching vehicles found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Reg Number & Class</th>
                  <th className="px-4 py-3">Owner & Client</th>
                  <th className="px-4 py-3">Manufacturer / Model</th>
                  <th className="px-4 py-3">Chassis / Engine</th>
                  <th className="px-4 py-3">RC & Insurance</th>
                  <th className="px-4 py-3">Hypothecation & RTO</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-mono font-bold text-slate-900">{v.vehicleNumber}</p>
                      <p className="text-xs text-slate-500">
                        {v.id} · {v.vehicleClass}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{v.ownerName}</p>
                      <p className="font-mono text-xs text-slate-500">{v.clientId}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      <p className="font-medium">
                        {v.manufacturer} {v.model}
                      </p>
                      <p className="text-slate-500">
                        {v.manufacturingYear} · {v.fuelType}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      <p>CH: {v.chassisNumber || '—'}</p>
                      <p>EN: {v.engineNumber || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-xs space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 w-7">RC:</span>
                        <span
                          className={`rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold ${validityBadge(
                            v.rcValidity
                          )}`}
                        >
                          {v.rcValidity || 'Not Set'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 w-7">Ins:</span>
                        <span
                          className={`rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold ${validityBadge(
                            v.insuranceExpiry
                          )}`}
                        >
                          {v.insuranceExpiry || 'Not Set'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      <p className="font-medium">
                        HP: {v.hypothecationStatus}
                        {v.hypothecationFinancer ? ` (${v.hypothecationFinancer})` : ''}
                      </p>
                      <p className="truncate max-w-[200px] text-slate-500">{v.rtoOffice}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(v)}
                          title="Edit Vehicle"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(v)}
                          title="Archive & Delete Vehicle"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Vehicle Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="font-display text-base font-bold text-slate-900">
                {isEditing ? `Edit Vehicle (${form.id})` : `Enroll Vehicle (${form.id})`}
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
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Linked Common Client *
                  </label>
                  <select
                    required
                    value={form.clientId}
                    onChange={(e) => handleClientSelect(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select Client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.mobile} ({c.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registration Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.vehicleNumber}
                    onChange={(e) =>
                      setForm({ ...form, vehicleNumber: e.target.value.toUpperCase() })
                    }
                    placeholder="KA-04-MB-4521"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registered Owner Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.ownerName}
                    onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vehicle Class *
                  </label>
                  <select
                    value={form.vehicleClass}
                    onChange={(e) => setForm({ ...form, vehicleClass: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {settings.vehicleClasses.map((vc) => (
                      <option key={vc} value={vc}>
                        {vc}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    value={form.manufacturer}
                    onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Model</label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Manufacturing Year
                  </label>
                  <input
                    type="number"
                    value={form.manufacturingYear}
                    onChange={(e) =>
                      setForm({ ...form, manufacturingYear: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fuel Type</label>
                  <select
                    value={form.fuelType}
                    onChange={(e) => setForm({ ...form, fuelType: e.target.value as FuelType })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {FUEL_TYPES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
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
                    Chassis Number
                  </label>
                  <input
                    type="text"
                    value={form.chassisNumber}
                    onChange={(e) =>
                      setForm({ ...form, chassisNumber: e.target.value.toUpperCase() })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Engine Number
                  </label>
                  <input
                    type="text"
                    value={form.engineNumber}
                    onChange={(e) =>
                      setForm({ ...form, engineNumber: e.target.value.toUpperCase() })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    RC Validity Date
                  </label>
                  <input
                    type="date"
                    value={form.rcValidity}
                    onChange={(e) => setForm({ ...form, rcValidity: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Insurance Validity Date
                  </label>
                  <input
                    type="date"
                    value={form.insuranceExpiry}
                    onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hypothecation Status
                  </label>
                  <select
                    value={form.hypothecationStatus}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        hypothecationStatus: e.target.value as HypothecationStatus,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="None">None</option>
                    <option value="Hypothecated">Hypothecated</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Financer / Bank (if Hypothecated)
                  </label>
                  <input
                    type="text"
                    disabled={form.hypothecationStatus !== 'Hypothecated'}
                    value={form.hypothecationFinancer || ''}
                    onChange={(e) =>
                      setForm({ ...form, hypothecationFinancer: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    RTO Office *
                  </label>
                  <select
                    value={form.rtoOffice}
                    onChange={(e) => setForm({ ...form, rtoOffice: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
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
                    Document Status
                  </label>
                  <select
                    value={form.documentStatus}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        documentStatus: e.target.value as Vehicle['documentStatus'],
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Complete">Complete</option>
                    <option value="Pending Verification">Pending Verification</option>
                    <option value="Expired">Expired</option>
                  </select>
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
                  <span>{saving ? 'Saving...' : isEditing ? 'Update Vehicle' : 'Save Vehicle'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="font-display text-base font-bold text-slate-900">
              Archive Vehicle {deleteTarget.vehicleNumber}?
            </h3>
            <p className="mt-1.5 text-sm text-slate-600">
              This moves <strong>{deleteTarget.id}</strong> to the Safety Archive so it can be restored later if needed.
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
                {deleting ? 'Archiving...' : 'Archive Vehicle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
