import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  Trash2,
  Printer,
  DollarSign,
  Receipt,
} from 'lucide-react';
import { PaymentTransaction, PaymentMode } from '../types';
import { AppDatabase, getNextTransactionId } from '../utils/storage';
import { calculateBalance, calculateTotalPaid, formatINR } from '../utils/pureCalculations';
import { exportGeneralReportPDF } from '../utils/pdfGenerator';
import { ActiveTab } from './Navbar';

interface PaymentManagerProps {
  db: AppDatabase;
  onAddPayment: (txn: PaymentTransaction) => void;
  onDeletePayment: (id: string) => void;
  onNavigate: (tab: ActiveTab) => void;
  currentDateStr: string;
}

export const PaymentManager: React.FC<PaymentManagerProps> = ({
  db,
  onAddPayment,
  onDeletePayment,
  onNavigate,
  currentDateStr,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New Transaction Form State
  const [selectedAppId, setSelectedAppId] = useState(db.applications[0]?.id || '');
  const [paymentType, setPaymentType] = useState<'Advance' | 'Installment' | 'Final Clearance' | 'Document Fee'>('Installment');
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [additionalAmount, setAdditionalAmount] = useState<number>(2000);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(currentDateStr);
  const [remarks, setRemarks] = useState('');

  // Selected App Details
  const selectedApp = db.applications.find((a) => a.id === selectedAppId);
  const totalFees = selectedApp ? selectedApp.totalFees : 5000;
  const totalPaid = calculateTotalPaid(advanceAmount, additionalAmount);
  const balanceAmount = calculateBalance(totalFees, totalPaid);

  const filteredPayments = db.payments.filter((p) => {
    const matchesSearch =
      p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.applicationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.transactionReference.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMode = modeFilter === 'All' || p.paymentMode === modeFilter;
    const matchesType = typeFilter === 'All' || p.paymentType === typeFilter;

    return matchesSearch && matchesMode && matchesType;
  });

  const handleSaveTxn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    const newTxn: PaymentTransaction = {
      id: getNextTransactionId(db.payments),
      date,
      clientId: selectedApp.clientId,
      clientName: selectedApp.clientName,
      vehicleNumber: selectedApp.vehicleNumber,
      applicationId: selectedApp.id,
      paymentType,
      totalFees,
      advancePayment: Number(advanceAmount) || 0,
      additionalPayment: Number(additionalAmount) || 0,
      totalPaid,
      balanceAmount,
      paymentMode,
      transactionReference: reference.trim() || `TXN-${Date.now().toString().slice(-6)}`,
      remarks: remarks.trim(),
      createdAt: new Date().toISOString(),
    };

    onAddPayment(newTxn);
    setIsAddOpen(false);
    setReference('');
    setRemarks('');
  };

  const handlePrintLedger = () => {
    const headers = [
      'Txn ID',
      'Date',
      'Client Name',
      'Vehicle No',
      'App ID',
      'Payment Type',
      'Total Paid (₹)',
      'Balance Due (₹)',
      'Mode',
      'Reference',
    ];
    const data = filteredPayments.map((p) => [
      p.id,
      p.date,
      p.clientName,
      p.vehicleNumber,
      p.applicationId,
      p.paymentType,
      formatINR(p.totalPaid),
      formatINR(p.balanceAmount),
      p.paymentMode,
      p.transactionReference,
    ]);
    exportGeneralReportPDF('Payment Transactions & Cash Collections Ledger', headers, data, db.settings);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-violet-600" />
            <span>10. Payment Transactions & Cash Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Client advances, installment stage payments, balance fee clearance, and audit references (UPI/Bank/Cash).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
          >
            <option value="All">All Payment Modes</option>
            {db.settings.paymentModes.map((pm) => (
              <option key={pm} value={pm}>
                {pm}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search client, vehicle, ref..."
              className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-violet-500 focus:outline-none w-56"
            />
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>

          <button
            onClick={handlePrintLedger}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Ledger</span>
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3">Txn ID & Date</th>
                <th className="px-4 py-3">Client & Vehicle</th>
                <th className="px-4 py-3">Application ID</th>
                <th className="px-4 py-3">Payment Type</th>
                <th className="px-3 py-3 text-right">Total Fees</th>
                <th className="px-3 py-3 text-right">Advance Paid</th>
                <th className="px-3 py-3 text-right">Additional Paid</th>
                <th className="px-3 py-3 text-right">Total Paid (₹)</th>
                <th className="px-3 py-3 text-right">Balance Due (₹)</th>
                <th className="px-4 py-3">Mode & Reference</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-400">
                    No matching payment transactions found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-slate-900">{p.id}</div>
                      <div className="text-[10px] text-slate-400">{p.date}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{p.clientName}</div>
                      <div className="font-mono text-slate-500 font-bold text-[11px]">
                        {p.vehicleNumber}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-blue-700 font-bold">{p.applicationId}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-slate-100 text-slate-800 font-medium px-2 py-0.5 rounded text-[10px]">
                        {p.paymentType}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600">{formatINR(p.totalFees)}</td>
                    <td className="px-3 py-3 text-right text-slate-600">
                      {formatINR(p.advancePayment)}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600">
                      {formatINR(p.additionalPayment)}
                    </td>
                    <td className="px-3 py-3 text-right font-black text-emerald-700">
                      {formatINR(p.totalPaid)}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-rose-600">
                      {formatINR(p.balanceAmount)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="font-semibold">{p.paymentMode}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                        {p.transactionReference}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onDeletePayment(p.id)}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                        title="Delete Payment Transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD PAYMENT MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-violet-600" />
                Record Payment Transaction
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTxn} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Application & Vehicle
                </label>
                <select
                  value={selectedAppId}
                  onChange={(e) => {
                    setSelectedAppId(e.target.value);
                    const app = db.applications.find((a) => a.id === e.target.value);
                    if (app) {
                      setAdvanceAmount(app.advancePaid);
                      setAdditionalAmount(app.balanceAmount);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                >
                  {db.applications.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.id} - {a.vehicleNumber} ({a.clientName} - {a.workType}) | Bal: {formatINR(a.balanceAmount)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Type</label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                  >
                    <option value="Advance">Advance Payment</option>
                    <option value="Installment">Installment</option>
                    <option value="Final Clearance">Final Clearance</option>
                    <option value="Document Fee">Document Fee</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                  >
                    {db.settings.paymentModes.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Advance Amount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Additional Payment Received (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={additionalAmount}
                    onChange={(e) => setAdditionalAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Automatic Calculation Banner */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[10px] text-slate-500 font-semibold">Total Fees</div>
                  <div className="font-bold text-slate-800">{formatINR(totalFees)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-700 font-semibold">Total Paid</div>
                  <div className="font-black text-emerald-600">{formatINR(totalPaid)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-rose-700 font-semibold">Remaining Balance</div>
                  <div className="font-black text-rose-600">{formatINR(balanceAmount)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reference / UTR No.</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. UPI/12345678 or Cheque #8812"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Cleared full balance at smart card delivery"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Save Payment Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
