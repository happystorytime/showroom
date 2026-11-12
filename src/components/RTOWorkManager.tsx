import React, { useState } from 'react';
import {
  FileText,
  Search,
  Plus,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CreditCard,
  Building,
  Edit2,
  Trash2,
} from 'lucide-react';
import { RTOApplication, WorkStatus, PaymentTransaction } from '../types';
import { AppDatabase, getNextTransactionId } from '../utils/storage';
import { formatINR, isOverdue } from '../utils/pureCalculations';
import { exportRTOReceiptPDF, exportGeneralReportPDF } from '../utils/pdfGenerator';
import { ActiveTab } from './Navbar';

interface RTOWorkManagerProps {
  db: AppDatabase;
  onUpdateStatus: (appId: string, status: WorkStatus) => void;
  onAddPayment: (payment: PaymentTransaction) => void;
  onEditApp: (app: RTOApplication) => void;
  onDeleteApp: (appId: string) => void;
  onNavigate: (tab: ActiveTab) => void;
  currentDateStr: string;
}

export const RTOWorkManager: React.FC<RTOWorkManagerProps> = ({
  db,
  onUpdateStatus,
  onAddPayment,
  onEditApp,
  onDeleteApp,
  onNavigate,
  currentDateStr,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [workTypeFilter, setWorkTypeFilter] = useState<string>('All');
  const [rtoFilter, setRtoFilter] = useState<string>('All');

  // Quick Payment Modal
  const [activePaymentApp, setActivePaymentApp] = useState<RTOApplication | null>(null);
  const [addPayAmount, setAddPayAmount] = useState<number>(0);
  const [addPayMode, setAddPayMode] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque'>('Cash');
  const [addPayRef, setAddPayRef] = useState('');

  const filteredApps = db.applications.filter((a) => {
    const matchesSearch =
      a.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.applicationNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || a.workStatus === statusFilter;
    const matchesType = workTypeFilter === 'All' || a.workType === workTypeFilter;
    const matchesRTO = rtoFilter === 'All' || a.rtoOffice === rtoFilter;

    return matchesSearch && matchesStatus && matchesType && matchesRTO;
  });

  const handlePrintReceipt = (app: RTOApplication) => {
    const client = db.clients.find((c) => c.id === app.clientId);
    exportRTOReceiptPDF(app, client, db.settings);
  };

  const handlePrintAll = () => {
    const headers = [
      'App ID',
      'Vehicle No',
      'Client Name',
      'Work Type',
      'RTO Office',
      'App Date',
      'Expected Due',
      'Total Fees',
      'Advance',
      'Balance',
      'Status',
    ];
    const data = filteredApps.map((a) => [
      a.id,
      a.vehicleNumber,
      a.clientName,
      a.workType,
      a.rtoOffice.split('(')[0],
      a.applicationDate,
      a.expectedCompletionDate,
      formatINR(a.totalFees),
      formatINR(a.advancePaid),
      formatINR(a.balanceAmount),
      a.workStatus,
    ]);
    exportGeneralReportPDF('Karnataka RTO Applications Master Report', headers, data, db.settings);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePaymentApp || addPayAmount <= 0) return;

    const newTxn: PaymentTransaction = {
      id: getNextTransactionId(db.payments),
      date: currentDateStr,
      clientId: activePaymentApp.clientId,
      clientName: activePaymentApp.clientName,
      vehicleNumber: activePaymentApp.vehicleNumber,
      applicationId: activePaymentApp.id,
      paymentType: addPayAmount >= activePaymentApp.balanceAmount ? 'Final Clearance' : 'Installment',
      totalFees: activePaymentApp.totalFees,
      advancePayment: activePaymentApp.advancePaid,
      additionalPayment: Number(addPayAmount),
      totalPaid: activePaymentApp.advancePaid + Number(addPayAmount),
      balanceAmount: Math.max(0, activePaymentApp.balanceAmount - Number(addPayAmount)),
      paymentMode: addPayMode,
      transactionReference: addPayRef || `PAY-${Date.now().toString().slice(-6)}`,
      remarks: 'Recorded from RTO Work Management dashboard',
      createdAt: new Date().toISOString(),
    };

    onAddPayment(newTxn);
    setActivePaymentApp(null);
    setAddPayAmount(0);
    setAddPayRef('');
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span>05. Karnataka RTO Work Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time status tracking across Karnataka RTO offices, fee accounting, balance collections & official receipts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search App ID, vehicle, owner..."
              className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none w-56"
            />
          </div>

          <button
            onClick={() => onNavigate('data-entry')}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New RTO Application</span>
          </button>

          <button
            onClick={handlePrintAll}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Work Report</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-600">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none"
          >
            <option value="All">All Statuses</option>
            {db.settings.applicationStatuses.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-600">Work Type:</span>
          <select
            value={workTypeFilter}
            onChange={(e) => setWorkTypeFilter(e.target.value)}
            className="px-2.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none"
          >
            <option value="All">All Work Types</option>
            {db.settings.workTypes.map((wt) => (
              <option key={wt} value={wt}>
                {wt}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-600">RTO Office:</span>
          <select
            value={rtoFilter}
            onChange={(e) => setRtoFilter(e.target.value)}
            className="px-2.5 py-1 border border-slate-300 rounded-md bg-white focus:outline-none max-w-xs"
          >
            <option value="All">All RTO Jurisdictions</option>
            {db.settings.rtoOffices.map((ro) => (
              <option key={ro} value={ro}>
                {ro}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Applications Master Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3">App ID & Dates</th>
                <th className="px-4 py-3">Vehicle & Owner</th>
                <th className="px-4 py-3">RTO Service Type</th>
                <th className="px-4 py-3">RTO Jurisdiction</th>
                <th className="px-3 py-3 text-right">Total Fees</th>
                <th className="px-3 py-3 text-right">Advance Paid</th>
                <th className="px-3 py-3 text-right">Balance Due</th>
                <th className="px-4 py-3 text-center">Work Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No matching applications found.
                  </td>
                </tr>
              ) : (
                filteredApps.map((a) => {
                  const overdue = isOverdue(a.expectedCompletionDate, a.workStatus, currentDateStr);

                  return (
                    <tr key={a.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-blue-700">{a.id}</div>
                        <div className="text-[10px] text-slate-400">App: {a.applicationDate}</div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          Due: {a.expectedCompletionDate}
                          {overdue && (
                            <span className="text-rose-600 font-bold ml-1">Overdue!</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-900 text-sm">
                          {a.vehicleNumber}
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium">{a.clientName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Ack: {a.applicationNumber}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{a.workType}</div>
                        {a.workDescription && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">
                            {a.workDescription}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                        <div className="font-medium text-slate-800">{a.rtoOffice.split('(')[0]}</div>
                        <div className="text-[10px] text-slate-400">
                          {a.rtoOffice.includes('(') ? a.rtoOffice.split('(')[1].replace(')', '') : ''}
                        </div>
                      </td>

                      <td className="px-3 py-3 text-right font-semibold text-slate-900">
                        {formatINR(a.totalFees)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-emerald-700">
                        {formatINR(a.advancePaid)}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-rose-600">
                        {formatINR(a.balanceAmount)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <select
                          value={a.workStatus}
                          onChange={(e) => onUpdateStatus(a.id, e.target.value as WorkStatus)}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold border focus:outline-none cursor-pointer ${
                            a.workStatus === 'Completed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : a.workStatus === 'Processing'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : a.workStatus === 'Submitted'
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                              : a.workStatus === 'Rejected'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {db.settings.applicationStatuses.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {a.balanceAmount > 0 && (
                            <button
                              onClick={() => {
                                setActivePaymentApp(a);
                                setAddPayAmount(a.balanceAmount);
                              }}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              title="Collect Balance Payment"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handlePrintReceipt(a)}
                            className="p-1 text-slate-700 hover:bg-slate-100 rounded"
                            title="Print Official PDF Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditApp(a)}
                            className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                            title="Edit Application"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteApp(a.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            title="Delete Application"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK PAYMENT COLLECTION MODAL */}
      {activePaymentApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Record Balance Fee Collection
              </h3>
              <button
                onClick={() => setActivePaymentApp(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
              <div>
                <strong>Application ID:</strong> {activePaymentApp.id} ({activePaymentApp.workType})
              </div>
              <div>
                <strong>Vehicle:</strong> {activePaymentApp.vehicleNumber} | {activePaymentApp.clientName}
              </div>
              <div>
                <strong>Total Fees:</strong> {formatINR(activePaymentApp.totalFees)} |{' '}
                <strong>Advance:</strong> {formatINR(activePaymentApp.advancePaid)}
              </div>
              <div className="text-rose-600 font-bold">
                <strong>Current Balance Due:</strong> {formatINR(activePaymentApp.balanceAmount)}
              </div>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Amount to Collect (₹)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={activePaymentApp.balanceAmount}
                  value={addPayAmount}
                  onChange={(e) => setAddPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={addPayMode}
                  onChange={(e) => setAddPayMode(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white font-medium"
                >
                  {db.settings.paymentModes.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Transaction / Challan Reference
                </label>
                <input
                  type="text"
                  value={addPayRef}
                  onChange={(e) => setAddPayRef(e.target.value)}
                  placeholder="e.g. UPI/GPay/12345678 or Cash Receipt No."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActivePaymentApp(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Save & Clear Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
