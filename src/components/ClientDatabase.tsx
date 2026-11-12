import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Printer,
  History,
  Phone,
  CreditCard,
  Car,
  FileText,
  X,
  ExternalLink,
} from 'lucide-react';
import { Client, Vehicle, RTOApplication, PaymentTransaction } from '../types';
import { AppDatabase } from '../utils/storage';
import { formatINR, maskAadhaar } from '../utils/pureCalculations';
import { exportGeneralReportPDF } from '../utils/pdfGenerator';
import { ActiveTab } from './Navbar';

interface ClientDatabaseProps {
  db: AppDatabase;
  onEditClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
  onNavigate: (tab: ActiveTab) => void;
}

export const ClientDatabase: React.FC<ClientDatabaseProps> = ({
  db,
  onEditClient,
  onDeleteClient,
  onNavigate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientHistory, setSelectedClientHistory] = useState<Client | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Compute Client metrics
  const clientRows = db.clients.map((c) => {
    const clientVehicles = db.vehicles.filter((v) => v.clientId === c.id);
    const clientApps = db.applications.filter((a) => a.clientId === c.id);
    const clientPayments = db.payments.filter((p) => p.clientId === c.id);

    const totalPaid = clientPayments.reduce((acc, p) => acc + (p.totalPaid || 0), 0);
    const totalOutstanding = clientApps.reduce((acc, a) => acc + (a.balanceAmount || 0), 0);

    return {
      ...c,
      totalVehicles: clientVehicles.length,
      totalApplications: clientApps.length,
      totalPaid,
      outstandingBalance: totalOutstanding,
      vehicles: clientVehicles,
      applications: clientApps,
      payments: clientPayments,
    };
  });

  const filteredClients = clientRows.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.mobile.includes(searchTerm) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrintAll = () => {
    const headers = [
      'Client ID',
      'Name',
      'Mobile',
      'Address',
      'Aadhaar (Masked)',
      'Reg Date',
      'Vehicles',
      'Apps',
      'Total Paid',
      'Outstanding',
    ];
    const data = filteredClients.map((c) => [
      c.id,
      c.name,
      c.mobile,
      c.address,
      maskAadhaar(c.aadhaar),
      c.registrationDate,
      c.totalVehicles,
      c.totalApplications,
      formatINR(c.totalPaid),
      formatINR(c.outstandingBalance),
    ]);
    exportGeneralReportPDF('Registered Client Database Report', headers, data, db.settings);
  };

  const handlePrintClientSummary = (c: typeof clientRows[0]) => {
    const headers = ['Record Type', 'Identifier / Number', 'Description / Service', 'Status / Amount'];
    const rows: (string | number)[][] = [];

    c.vehicles.forEach((v) => {
      rows.push(['Vehicle', v.vehicleNumber, `${v.brand} ${v.model} (${v.vehicleType})`, `RC: ${v.rcValidity}`]);
    });
    c.applications.forEach((a) => {
      rows.push(['RTO Application', a.id, `${a.workType} (${a.vehicleNumber})`, `${a.workStatus} | Bal: ${formatINR(a.balanceAmount)}`]);
    });
    c.payments.forEach((p) => {
      rows.push(['Payment', p.id, `${p.paymentType} (${p.paymentMode})`, formatINR(p.totalPaid)]);
    });

    exportGeneralReportPDF(
      `Client History - ${c.name} (${c.id})`,
      headers,
      rows,
      db.settings,
      `Mobile: ${c.mobile} | Address: ${c.address} | Total Outstanding: ${formatINR(c.outstandingBalance)}`
    );
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>03. Client Master Database</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered vehicle owners, farmers, and fleet clients linked with vehicles, RTO jobs & ledger balances.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, mobile, ID..."
              className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none w-56"
            />
          </div>

          <button
            onClick={() => onNavigate('data-entry')}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register New Client</span>
          </button>

          <button
            onClick={handlePrintAll}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Clients Database Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3">Client ID</th>
                <th className="px-4 py-3">Client Name</th>
                <th className="px-4 py-3">Mobile Numbers</th>
                <th className="px-4 py-3">Address & Aadhaar</th>
                <th className="px-3 py-3 text-center">Vehicles</th>
                <th className="px-3 py-3 text-center">RTO Works</th>
                <th className="px-4 py-3 text-right">Total Paid</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No matching clients found in database.
                  </td>
                </tr>
              ) : (
                filteredClients.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">{c.id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <div>{c.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">Reg: {c.registrationDate}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{c.mobile}</span>
                      </div>
                      {c.alternateMobile && (
                        <div className="text-[10px] text-slate-400 pl-4">{c.alternateMobile}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                      <div>{c.address}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Aadhaar: {maskAadhaar(c.aadhaar)}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-block bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[11px]">
                        {c.totalVehicles}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-block bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[11px]">
                        {c.totalApplications}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                      {formatINR(c.totalPaid)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-rose-600">
                      {formatINR(c.outstandingBalance)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedClientHistory(c)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="View 360° Client History (Vehicles, Works, Payments)"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handlePrintClientSummary(c)}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                          title="Print Client Statement"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditClient(c)}
                          className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                          title="Edit Client"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(c.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                          title="Delete Client"
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

      {/* CLIENT 360° HISTORY MODAL */}
      {selectedClientHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Client 360° History: {selectedClientHistory.name} ({selectedClientHistory.id})
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedClientHistory.mobile} | {selectedClientHistory.address}
                </p>
              </div>
              <button
                onClick={() => setSelectedClientHistory(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Vehicles section */}
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-700 mb-2 flex items-center gap-1.5">
                <Car className="w-4 h-4 text-emerald-600" />
                <span>Enrolled Vehicles ({db.vehicles.filter((v) => v.clientId === selectedClientHistory.id).length})</span>
              </h4>
              <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-xs">
                {db.vehicles
                  .filter((v) => v.clientId === selectedClientHistory.id)
                  .map((v) => (
                    <div key={v.id} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200">
                      <div>
                        <span className="font-mono font-bold text-slate-900">{v.vehicleNumber}</span>
                        <span className="text-slate-500 ml-2">
                          {v.brand} {v.model} ({v.vehicleType})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        RC: {v.rcValidity} | Ins: {v.insuranceExpiry}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Applications section */}
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-700 mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>RTO Applications ({db.applications.filter((a) => a.clientId === selectedClientHistory.id).length})</span>
              </h4>
              <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-xs">
                {db.applications
                  .filter((a) => a.clientId === selectedClientHistory.id)
                  .map((a) => (
                    <div key={a.id} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200">
                      <div>
                        <span className="font-mono font-bold text-blue-700">{a.id}</span>
                        <span className="font-semibold text-slate-900 ml-2">{a.workType}</span>
                        <span className="text-slate-500 ml-1">({a.vehicleNumber})</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-slate-800">{formatINR(a.totalFees)}</span>
                        <span className="text-rose-600 text-[10px] ml-2">Bal: {formatINR(a.balanceAmount)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Payments section */}
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-700 mb-2 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-violet-600" />
                <span>Payment Transactions ({db.payments.filter((p) => p.clientId === selectedClientHistory.id).length})</span>
              </h4>
              <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-xs">
                {db.payments
                  .filter((p) => p.clientId === selectedClientHistory.id)
                  .map((p) => (
                    <div key={p.id} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200">
                      <div>
                        <span className="font-mono font-bold text-slate-900">{p.id}</span>
                        <span className="text-slate-500 ml-2">
                          {p.date} | {p.paymentType} ({p.paymentMode})
                        </span>
                      </div>
                      <div className="font-bold text-emerald-700">{formatINR(p.totalPaid)}</div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="text-right pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedClientHistory(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Delete Client Confirmation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete client <strong>{confirmDeleteId}</strong>? The record and history will be safely preserved in the deleted archive.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteClient(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Delete Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
