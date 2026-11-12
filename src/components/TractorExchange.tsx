import React, { useState } from 'react';
import {
  Repeat,
  Search,
  Plus,
  Trash2,
  Printer,
  Calculator,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import { TractorExchange } from '../types';
import { AppDatabase, getNextExchangeId } from '../utils/storage';
import { calculateExchangeDifference, formatINR } from '../utils/pureCalculations';
import { exportGeneralReportPDF } from '../utils/pdfGenerator';
import { ActiveTab } from './Navbar';

interface TractorExchangeProps {
  db: AppDatabase;
  onAddExchange: (record: TractorExchange) => void;
  onDeleteExchange: (id: string) => void;
  onNavigate: (tab: ActiveTab) => void;
  currentDateStr: string;
}

export const TractorExchangeManager: React.FC<TractorExchangeProps> = ({
  db,
  onAddExchange,
  onDeleteExchange,
  onNavigate,
  currentDateStr,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New Exchange Form State
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [oldTractorNumber, setOldTractorNumber] = useState('');
  const [oldTractorModel, setOldTractorModel] = useState('');
  const [oldChassisNumber, setOldChassisNumber] = useState('');
  const [oldEngineNumber, setOldEngineNumber] = useState('');
  const [oldTractorOwner, setOldTractorOwner] = useState('');
  const [oldTractorValuation, setOldTractorValuation] = useState<number>(250000);
  const [exchangeDate, setExchangeDate] = useState(currentDateStr);
  const [newTractorModel, setNewTractorModel] = useState('Mahindra 575 DI Sarpanch');
  const [newTractorNumber, setNewTractorNumber] = useState('');
  const [newTractorPrice, setNewTractorPrice] = useState<number>(765000);
  const [remarks, setRemarks] = useState('');

  // Automatic Calculation
  const exchangeDifferenceAmount = calculateExchangeDifference(newTractorPrice, oldTractorValuation);

  const filteredExchanges = db.exchanges.filter(
    (e) =>
      e.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.oldTractorNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.newTractorModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveExchange = (e: React.FormEvent) => {
    e.preventDefault();
    const newEx: TractorExchange = {
      id: getNextExchangeId(db.exchanges),
      customerName: customerName.trim(),
      customerMobile: customerMobile.trim(),
      oldTractorNumber: oldTractorNumber.toUpperCase().trim(),
      oldTractorModel: oldTractorModel.trim(),
      oldChassisNumber: oldChassisNumber.toUpperCase().trim() || 'OLD-CHASSIS',
      oldEngineNumber: oldEngineNumber.toUpperCase().trim() || 'OLD-ENGINE',
      oldTractorOwner: oldTractorOwner.trim() || customerName.trim(),
      oldTractorValuation: Number(oldTractorValuation) || 0,
      exchangeDate,
      newTractorModel: newTractorModel.trim(),
      newTractorNumber: newTractorNumber.toUpperCase().trim() || 'NEW-BOOKING',
      newTractorPrice: Number(newTractorPrice) || 0,
      exchangeDifferenceAmount,
      remarks: remarks.trim(),
      createdAt: new Date().toISOString(),
    };

    onAddExchange(newEx);
    setIsAddOpen(false);
    setCustomerName('');
    setCustomerMobile('');
    setOldTractorNumber('');
    setOldTractorModel('');
    setRemarks('');
  };

  const handlePrint = () => {
    const headers = [
      'Exchange ID',
      'Customer',
      'Old Tractor No & Model',
      'Old Valuation (₹)',
      'New Tractor & Price (₹)',
      'Difference Amount (₹)',
      'Date',
    ];
    const data = filteredExchanges.map((e) => [
      e.id,
      `${e.customerName}\n(${e.customerMobile})`,
      `${e.oldTractorNumber}\n${e.oldTractorModel}`,
      formatINR(e.oldTractorValuation),
      `${e.newTractorModel}\n${formatINR(e.newTractorPrice)}`,
      formatINR(e.exchangeDifferenceAmount),
      e.exchangeDate,
    ]);
    exportGeneralReportPDF('Old Tractor Exchange & Valuation Report', headers, data, db.settings);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Repeat className="w-5 h-5 text-indigo-600" />
            <span>08. Old Tractor Exchange & Valuation Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Trade-in deals, mechanical valuation of pre-owned tractors, and automatic net exchange difference calculation.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by customer, old tractor #..."
              className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none w-56"
            />
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Exchange Record</span>
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

      {/* Exchanges Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3">Exchange ID</th>
                <th className="px-4 py-3">Customer Details</th>
                <th className="px-4 py-3">Old Tractor (Trade-In)</th>
                <th className="px-4 py-3 text-right">Old Valuation (₹)</th>
                <th className="px-4 py-3">New Tractor Model</th>
                <th className="px-4 py-3 text-right">New Price (₹)</th>
                <th className="px-4 py-3 text-right">Exchange Difference (₹)</th>
                <th className="px-4 py-3 text-center">Exchange Date</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExchanges.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No matching tractor exchange records found.
                  </td>
                </tr>
              ) : (
                filteredExchanges.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-500">{ex.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{ex.customerName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{ex.customerMobile}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-slate-900">{ex.oldTractorNumber}</div>
                      <div className="text-[11px] text-slate-600">{ex.oldTractorModel}</div>
                      <div className="text-[10px] text-slate-400">Owner: {ex.oldTractorOwner}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      {formatINR(ex.oldTractorValuation)}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      <div className="font-semibold">{ex.newTractorModel}</div>
                      <div className="text-[10px] font-mono text-slate-400">{ex.newTractorNumber}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatINR(ex.newTractorPrice)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-rose-600">
                      {formatINR(ex.exchangeDifferenceAmount)}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">{ex.exchangeDate}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onDeleteExchange(ex.id)}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                        title="Delete Exchange Record"
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

      {/* ADD EXCHANGE MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Repeat className="w-4 h-4 text-indigo-600" />
                Record Old Tractor Trade-In Exchange
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExchange} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Suresh Kumar Patil"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder="e.g. 9980145678"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              {/* Old Tractor Box */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase">
                  Old Tractor Information
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Old Tractor Reg No.</label>
                    <input
                      type="text"
                      required
                      value={oldTractorNumber}
                      onChange={(e) => setOldTractorNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. KA-25-T-1940"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Old Model & Year</label>
                    <input
                      type="text"
                      required
                      value={oldTractorModel}
                      onChange={(e) => setOldTractorModel(e.target.value)}
                      placeholder="e.g. Mahindra 275 DI Bhoomiputra 2014"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Old Chassis Number</label>
                    <input
                      type="text"
                      value={oldChassisNumber}
                      onChange={(e) => setOldChassisNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. M275KA201490"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Old Tractor Owner Name</label>
                    <input
                      type="text"
                      value={oldTractorOwner}
                      onChange={(e) => setOldTractorOwner(e.target.value)}
                      placeholder="RC registered owner"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Old Tractor Agreed Valuation (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={oldTractorValuation}
                    onChange={(e) => setOldTractorValuation(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none bg-white"
                  />
                </div>
              </div>

              {/* New Tractor Box */}
              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-200 space-y-3">
                <h4 className="font-bold text-blue-900 text-[11px] uppercase">
                  New Tractor Allotment
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">New Tractor Model</label>
                    <input
                      type="text"
                      required
                      value={newTractorModel}
                      onChange={(e) => setNewTractorModel(e.target.value)}
                      placeholder="e.g. Sonalika DI 745 III Sikander"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">New Tractor Price (₹)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={newTractorPrice}
                      onChange={(e) => setNewTractorPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none bg-white"
                    />
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-blue-200 flex items-center justify-between">
                  <span className="font-bold text-slate-700">Calculated Exchange Difference Payable:</span>
                  <span className="text-lg font-black text-rose-600">
                    {formatINR(exchangeDifferenceAmount)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Exchange Date</label>
                <input
                  type="date"
                  value={exchangeDate}
                  onChange={(e) => setExchangeDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Remaining difference financed via Shriram Finance loan"
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
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Save Exchange Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
