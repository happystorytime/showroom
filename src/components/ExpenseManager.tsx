import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Plus,
  Trash2,
  Printer,
  TrendingDown,
  DollarSign,
} from 'lucide-react';
import { ExpenseRecord, ExpenseCategory, PaymentMode } from '../types';
import { AppDatabase, getNextExpenseId } from '../utils/storage';
import { formatINR } from '../utils/pureCalculations';
import { exportGeneralReportPDF } from '../utils/pdfGenerator';
import { ActiveTab } from './Navbar';

interface ExpenseManagerProps {
  db: AppDatabase;
  onAddExpense: (expense: ExpenseRecord) => void;
  onDeleteExpense: (id: string) => void;
  onNavigate: (tab: ActiveTab) => void;
  currentDateStr: string;
}

export const ExpenseManager: React.FC<ExpenseManagerProps> = ({
  db,
  onAddExpense,
  onDeleteExpense,
  onNavigate,
  currentDateStr,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [catFilter, setCatFilter] = useState<string>('All');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New Expense State
  const [category, setCategory] = useState<ExpenseCategory>('Fuel');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(1000);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [date, setDate] = useState(currentDateStr);
  const [remarks, setRemarks] = useState('');

  const filteredExpenses = db.expenses.filter((e) => {
    const matchesSearch =
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.remarks.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCat = catFilter === 'All' || e.category === catFilter;
    return matchesSearch && matchesCat;
  });

  const totalExpenseSum = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const newExp: ExpenseRecord = {
      id: getNextExpenseId(db.expenses),
      date,
      category,
      description: description.trim(),
      amount: Number(amount) || 0,
      paymentMode,
      remarks: remarks.trim(),
      createdAt: new Date().toISOString(),
    };

    onAddExpense(newExp);
    setIsAddOpen(false);
    setDescription('');
    setAmount(1000);
    setRemarks('');
  };

  const handlePrint = () => {
    const headers = ['Expense ID', 'Date', 'Category', 'Description', 'Amount (₹)', 'Payment Mode', 'Remarks'];
    const data = filteredExpenses.map((e) => [
      e.id,
      e.date,
      e.category,
      e.description,
      formatINR(e.amount),
      e.paymentMode,
      e.remarks,
    ]);
    exportGeneralReportPDF('Operational Expense Ledger Report', headers, data, db.settings);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-rose-600" />
            <span>11. Operational Expense Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Government treasury challans, staff wages, printing supplies, fuel, and agency overhead expenses.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
          >
            <option value="All">All Expense Categories</option>
            {db.settings.expenseCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search description, ID..."
              className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none w-56"
            />
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Expense</span>
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

      {/* Summary Banner */}
      <div className="bg-rose-50/50 border border-rose-200 p-4 rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-rose-800">
          <TrendingDown className="w-4 h-4 text-rose-600" />
          <span className="font-semibold">Filtered Expenses Total:</span>
        </div>
        <div className="text-xl font-black text-rose-700">{formatINR(totalExpenseSum)}</div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3">Expense ID</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Amount (₹)</th>
                <th className="px-4 py-3">Payment Mode</th>
                <th className="px-4 py-3">Remarks</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No matching expenses found.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-500">{exp.id}</td>
                    <td className="px-4 py-3 text-slate-600">{exp.date}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{exp.category}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium max-w-sm">{exp.description}</td>
                    <td className="px-4 py-3 text-right font-black text-rose-600">
                      {formatINR(exp.amount)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{exp.paymentMode}</td>
                    <td className="px-4 py-3 text-slate-500 truncate max-w-xs">{exp.remarks}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onDeleteExpense(exp.id)}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                        title="Delete Expense"
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

      {/* ADD EXPENSE MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Receipt className="w-4 h-4 text-rose-600" />
                Record Operational Expense
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expense Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                  >
                    {db.settings.expenseCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. RTO Challan deposit or diesel fuel"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks & Vendor</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Paid to Sri Balaji Stationery"
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
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
