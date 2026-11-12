import React, { useState } from 'react';
import {
  Car,
  Search,
  Plus,
  Trash2,
  Printer,
  ShieldAlert,
  Calendar,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { Vehicle } from '../types';
import { AppDatabase } from '../utils/storage';
import { getDocumentAlertStatus } from '../utils/pureCalculations';
import { exportGeneralReportPDF } from '../utils/pdfGenerator';
import { ActiveTab } from './Navbar';

interface VehicleDatabaseProps {
  db: AppDatabase;
  onDeleteVehicle: (id: string) => void;
  onNavigate: (tab: ActiveTab) => void;
  currentDateStr: string;
}

export const VehicleDatabase: React.FC<VehicleDatabaseProps> = ({
  db,
  onDeleteVehicle,
  onNavigate,
  currentDateStr,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredVehicles = db.vehicles.filter((v) => {
    const matchesSearch =
      v.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.chassisNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'All' || v.vehicleType === typeFilter;
    return matchesSearch && matchesType;
  });

  const handlePrint = () => {
    const headers = [
      'Vehicle ID',
      'Vehicle Number',
      'Owner Name',
      'Type',
      'Brand & Model',
      'Chassis Number',
      'RC Validity',
      'Insurance Expiry',
      'Status',
    ];
    const data = filteredVehicles.map((v) => [
      v.id,
      v.vehicleNumber,
      v.ownerName,
      v.vehicleType,
      `${v.brand} ${v.model}`,
      v.chassisNumber,
      v.rcValidity,
      v.insuranceExpiry,
      v.documentStatus,
    ]);
    exportGeneralReportPDF('Enrolled Vehicle Master Database', headers, data, db.settings);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Car className="w-5 h-5 text-emerald-600" />
            <span>04. Vehicle Master Database</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tractors, commercial vehicles, private cars, chassis & engine verification, and RC/Insurance validity tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
          >
            <option value="All">All Vehicle Types</option>
            {db.settings.vehicleTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search vehicle number, owner..."
              className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none w-56"
            />
          </div>

          <button
            onClick={() => onNavigate('data-entry')}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Enroll Vehicle</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3">Vehicle ID</th>
                <th className="px-4 py-3">Vehicle Number</th>
                <th className="px-4 py-3">Owner / Client</th>
                <th className="px-4 py-3">Type & Model</th>
                <th className="px-4 py-3">Chassis & Engine</th>
                <th className="px-4 py-3">RC Validity</th>
                <th className="px-4 py-3">Insurance Expiry</th>
                <th className="px-4 py-3 text-center">Document Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No matching vehicles found.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => {
                  const insAlert = getDocumentAlertStatus(v.insuranceExpiry, currentDateStr);
                  const rcAlert = getDocumentAlertStatus(v.rcValidity, currentDateStr);

                  return (
                    <tr key={v.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-500">{v.id}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 text-sm">
                        {v.vehicleNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{v.ownerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Client ID: {v.clientId}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-medium">
                          {v.brand} {v.model}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {v.vehicleType} • Year: {v.manufacturingYear}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                        <div>CH: {v.chassisNumber}</div>
                        <div>ENG: {v.engineNumber}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{v.rcValidity}</div>
                        {rcAlert === 'expired' && (
                          <span className="inline-block text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded mt-0.5">
                            RC Expired
                          </span>
                        )}
                        {rcAlert === 'expiring_soon' && (
                          <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded mt-0.5">
                            Due in &lt;30d
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{v.insuranceExpiry}</div>
                        {insAlert === 'expired' && (
                          <span className="inline-block text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded mt-0.5">
                            Insurance Expired
                          </span>
                        )}
                        {insAlert === 'expiring_soon' && (
                          <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded mt-0.5">
                            Due in &lt;30d
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            v.documentStatus === 'Complete'
                              ? 'bg-emerald-100 text-emerald-800'
                              : v.documentStatus === 'Expired'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {v.documentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setConfirmDeleteId(v.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                          title="Delete Vehicle"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRM DELETE MODAL */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Delete Vehicle Confirmation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete vehicle <strong>{confirmDeleteId}</strong>? Record will be preserved in archive.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteVehicle(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
              >
                Delete Vehicle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
