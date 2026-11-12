import React, { useState } from 'react';
import {
  Landmark,
  Search,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
} from 'lucide-react';
import { LoanRecord, FinanceCompany, LoanStatus } from '../types';
import { AppDatabase, getNextLoanId } from '../utils/storage';
import { calculateNetCreditAmount, formatINR } from '../utils/pureCalculations';
import { exportGeneralReportPDF } from '../utils/pdfGenerator';
import { ActiveTab } from './Navbar';

interface LoanManagerProps {
  db: AppDatabase;
  onAddLoan: (record: LoanRecord) => void;
  onUpdateLoanStatus: (id: string, status: LoanStatus) => void;
  onDeleteLoan: (id: string) => void;
  onNavigate: (tab: ActiveTab) => void;
  currentDateStr: string;
}

export const LoanManager: React.FC<LoanManagerProps> = ({
  db,
  onAddLoan,
  onUpdateLoanStatus,
  onDeleteLoan,
  onNavigate,
  currentDateStr,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New Loan Form State
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [tractorNumber, setTractorNumber] = useState('');
  const [financeCompany, setFinanceCompany] = useState<FinanceCompany>('TVS Credit Ltd');
  const [loanAmount, setLoanAmount] = useState<number>(500000);
  const [docCharges, setDocCharges] = useState<number>(12000);
  const [loanStatus, setLoanStatus] = useState<LoanStatus>('Login');
  const [loginDate, setLoginDate] = useState(currentDateStr);
  const [approvalDate, setApprovalDate] = useState('');
  const [disbursementDate, setDisbursementDate] = useState('');
  const [firstPayment, setFirstPayment] = useState<number>(15000);
  const [holdAmount, setHoldAmount] = useState<number>(0);
  const [pendingAmount, setPendingAmount] = useState<number>(0);
  const [accountClosureStatus, setAccountClosureStatus] = useState<'Active' | 'Closed' | 'NOC Issued'>('Active');
  const [remarks, setRemarks] = useState('');

  // Automatic Calculation
  const netCreditAmount = calculateNetCreditAmount(loanAmount, docCharges);

  const filteredLoans = db.loans.filter((l) => {
    const matchesSearch =
      l.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.tractorNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.financeCompany.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCompany = companyFilter === 'All' || l.financeCompany === companyFilter;
    const matchesStatus = statusFilter === 'All' || l.loanStatus === statusFilter;

    return matchesSearch && matchesCompany && matchesStatus;
  });

  const handleSaveLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const newLoan: LoanRecord = {
      id: getNextLoanId(db.loans),
      customerName: customerName.trim(),
      customerMobile: customerMobile.trim(),
      tractorNumber: tractorNumber.toUpperCase().trim(),
      financeCompany,
      loanAmount: Number(loanAmount) || 0,
      documentCharges: Number(docCharges) || 0,
      netCreditAmount,
      loanStatus,
      loginDate,
      approvalDate: approvalDate || undefined,
      disbursementDate: disbursementDate || undefined,
      firstPayment: Number(firstPayment) || 0,
      holdAmount: Number(holdAmount) || 0,
      pendingAmount: Number(pendingAmount) || 0,
      accountClosureStatus,
      remarks: remarks.trim(),
    };

    onAddLoan(newLoan);
    setIsAddOpen(false);
    setCustomerName('');
    setCustomerMobile('');
    setTractorNumber('');
    setRemarks('');
  };

  const handlePrint = () => {
    const headers = [
      'Loan ID',
      'Customer',
      'Tractor Number',
      'Finance Company',
      'Sanctioned Loan (₹)',
      'Net Credit (₹)',
      'Status',
      'Login Date',
      'Disbursed Date',
    ];
    const data = filteredLoans.map((l) => [
      l.id,
      `${l.customerName}\n(${l.customerMobile})`,
      l.tractorNumber,
      l.financeCompany,
      formatINR(l.loanAmount),
      formatINR(l.netCreditAmount),
      l.loanStatus,
      l.loginDate,
      l.disbursementDate || 'Pending',
    ]);
    exportGeneralReportPDF('Tractor Finance & Bank Loan Portfolio', headers, data, db.settings);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-emerald-600" />
            <span>09. Tractor Finance & Loan Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            File login tracking, credit approval sanction, net dealer disbursement credit, and bank NOC closure status.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
          >
            <option value="All">All Finance Companies</option>
            {db.settings.financeCompanies.map((fc) => (
              <option key={fc} value={fc}>
                {fc}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
          >
            <option value="All">All Loan Statuses</option>
            <option value="Login">Login</option>
            <option value="In Verification">In Verification</option>
            <option value="Approved">Approved</option>
            <option value="Disbursed">Disbursed</option>
            <option value="Rejected">Rejected</option>
            <option value="Closed">Closed</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customer, company, tractor..."
              className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none w-56"
            />
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Loan Application</span>
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

      {/* Loans Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3">Loan ID</th>
                <th className="px-4 py-3">Customer Details</th>
                <th className="px-4 py-3">Tractor Number</th>
                <th className="px-4 py-3">Finance Institution</th>
                <th className="px-4 py-3 text-right">Loan Amount</th>
                <th className="px-4 py-3 text-right">Doc Charges</th>
                <th className="px-4 py-3 text-right">Net Credit (₹)</th>
                <th className="px-4 py-3 text-center">Loan Status</th>
                <th className="px-4 py-3 text-center">Dates (Login/Disb)</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    No matching finance loan records found.
                  </td>
                </tr>
              ) : (
                filteredLoans.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-500">{l.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{l.customerName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{l.customerMobile}</div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 text-sm">
                      {l.tractorNumber}
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">{l.financeCompany}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatINR(l.loanAmount)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {formatINR(l.documentCharges)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-600">
                      {formatINR(l.netCreditAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={l.loanStatus}
                        onChange={(e) => onUpdateLoanStatus(l.id, e.target.value as LoanStatus)}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold border focus:outline-none cursor-pointer ${
                          l.loanStatus === 'Disbursed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : l.loanStatus === 'Approved'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : l.loanStatus === 'In Verification'
                            ? 'bg-purple-50 text-purple-800 border-purple-300'
                            : l.loanStatus === 'Rejected'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        <option value="Applied">Applied</option>
                        <option value="Login">Login</option>
                        <option value="In Verification">In Verification</option>
                        <option value="Approved">Approved</option>
                        <option value="Disbursed">Disbursed</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      <div>Login: {l.loginDate}</div>
                      <div className="text-[10px] text-slate-400">
                        Disb: {l.disbursementDate || 'Pending'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onDeleteLoan(l.id)}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                        title="Delete Loan Record"
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

      {/* ADD NEW LOAN MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-600" />
                Register New Tractor Loan Application
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLoan} className="space-y-3 text-xs">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tractor Number / Stock No.</label>
                  <input
                    type="text"
                    required
                    value={tractorNumber}
                    onChange={(e) => setTractorNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. KA-04-TR-9941"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Finance Institution</label>
                  <select
                    value={financeCompany}
                    onChange={(e) => setFinanceCompany(e.target.value as FinanceCompany)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none font-medium"
                  >
                    {db.settings.financeCompanies.map((fc) => (
                      <option key={fc} value={fc}>
                        {fc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Loan Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min={1000}
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Document Charges (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={docCharges}
                    onChange={(e) => setDocCharges(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex flex-col justify-center">
                  <span className="text-[10px] font-semibold text-emerald-800">Net Credit Amount:</span>
                  <span className="text-sm font-black text-emerald-700 mt-0.5">
                    {formatINR(netCreditAmount)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Loan Status</label>
                  <select
                    value={loanStatus}
                    onChange={(e) => setLoanStatus(e.target.value as LoanStatus)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none font-medium"
                  >
                    <option value="Login">Login</option>
                    <option value="In Verification">In Verification</option>
                    <option value="Approved">Approved</option>
                    <option value="Disbursed">Disbursed</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Login Date</label>
                  <input
                    type="date"
                    value={loginDate}
                    onChange={(e) => setLoginDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Disbursement Date</label>
                  <input
                    type="date"
                    value={disbursementDate}
                    onChange={(e) => setDisbursementDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks & Sanction Terms</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. 5-year tenure sanctioned at 9.75% interest; dealer invoice submitted"
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Save Loan Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
