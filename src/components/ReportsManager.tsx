import React, { useState } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  FileSpreadsheet,
  Filter,
  CheckCircle,
  FileText,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { AppDatabase } from '../utils/storage';
import { TimeFilter } from '../types';
import {
  formatINR,
  isDateWithinFilter,
  maskAadhaar,
  calculateNetProfit,
} from '../utils/pureCalculations';
import { exportGeneralReportPDF } from '../utils/pdfGenerator';
import { ActiveTab } from './Navbar';

interface ReportsManagerProps {
  db: AppDatabase;
  onNavigate: (tab: ActiveTab) => void;
  currentDateStr: string;
}

export type ReportType =
  | 'daily-business'
  | 'weekly-business'
  | 'monthly-business'
  | 'yearly-business'
  | 'client-history'
  | 'vehicle-history'
  | 'rto-work'
  | 'pending-work'
  | 'completed-work'
  | 'payment-collection'
  | 'outstanding-balance'
  | 'income-expense'
  | 'tractor-stock'
  | 'tractor-exchange'
  | 'loan-report';

export const ReportsManager: React.FC<ReportsManagerProps> = ({
  db,
  onNavigate,
  currentDateStr,
}) => {
  const [activeReport, setActiveReport] = useState<ReportType>('daily-business');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const reportList: { id: ReportType; label: string; desc: string }[] = [
    { id: 'daily-business', label: '1. Daily Business Report', desc: "Today's RTO registrations, collections, and deliveries" },
    { id: 'weekly-business', label: '2. Weekly Business Report', desc: '7-day rolling performance and collections summary' },
    { id: 'monthly-business', label: '3. Monthly Business Report', desc: 'Full monthly revenue, RTO throughput and profit statement' },
    { id: 'yearly-business', label: '4. Yearly Business Report', desc: 'Annual turnover, tractor sales & agency tax metrics' },
    { id: 'client-history', label: '5. Client History Report', desc: 'Registered client directory with vehicle linkages & balance' },
    { id: 'vehicle-history', label: '6. Vehicle History Report', desc: 'All enrolled vehicles with RC & insurance expiry radar' },
    { id: 'rto-work', label: '7. RTO Work Report', desc: 'Master register of all Karnataka RTO applications' },
    { id: 'pending-work', label: '8. Pending Work Report', desc: 'New, submitted & processing files needing follow-up' },
    { id: 'completed-work', label: '9. Completed Work Report', desc: 'Successfully delivered Smart Card RCs and certificates' },
    { id: 'payment-collection', label: '10. Payment Collection Report', desc: 'Detailed receipts ledger with UPI/Cash/Bank references' },
    { id: 'outstanding-balance', label: '11. Outstanding Balance Report', desc: 'Unpaid client fee balances requiring recovery' },
    { id: 'income-expense', label: '12. Income & Expense Report', desc: 'Net profit calculation (Income minus operational costs)' },
    { id: 'tractor-stock', label: '13. Tractor Stock Report', desc: 'Showroom inventory count, valuation & delivery status' },
    { id: 'tractor-exchange', label: '14. Tractor Exchange Report', desc: 'Old tractor trade-in valuation & net exchange difference' },
    { id: 'loan-report', label: '15. Loan Report', desc: 'TVS Credit, Shriram & bank finance disbursement portfolio' },
  ];

  // Generate Report Data according to active type
  const getReportPayload = () => {
    switch (activeReport) {
      case 'daily-business': {
        const apps = db.applications.filter((a) => a.applicationDate === currentDateStr);
        const payments = db.payments.filter((p) => p.date === currentDateStr);
        const headers = ['Record Type', 'Ref / ID', 'Vehicle / Particulars', 'Client Name', 'Amount (₹)', 'Status'];
        const rows: (string | number)[][] = [];

        apps.forEach((a) => {
          rows.push(['RTO Application', a.id, `${a.vehicleNumber} (${a.workType})`, a.clientName, formatINR(a.totalFees), a.workStatus]);
        });
        payments.forEach((p) => {
          rows.push(['Collection', p.id, `${p.vehicleNumber} (${p.paymentType} - ${p.paymentMode})`, p.clientName, formatINR(p.totalPaid), 'Collected']);
        });

        const totalColl = payments.reduce((acc, p) => acc + (p.totalPaid || 0), 0);
        return {
          title: `Daily Business Report (${currentDateStr})`,
          headers,
          rows,
          summary: `Total Collections Today: ${formatINR(totalColl)} | Total New Work Logged: ${apps.length}`,
        };
      }

      case 'weekly-business':
      case 'monthly-business':
      case 'yearly-business': {
        const filterKey: TimeFilter =
          activeReport === 'weekly-business' ? 'week' : activeReport === 'monthly-business' ? 'month' : 'year';
        const apps = db.applications.filter((a) => isDateWithinFilter(a.applicationDate, filterKey, currentDateStr));
        const payments = db.payments.filter((p) => isDateWithinFilter(p.date, filterKey, currentDateStr));
        const expenses = db.expenses.filter((e) => isDateWithinFilter(e.date, filterKey, currentDateStr));

        const totalInc = payments.reduce((acc, p) => acc + (p.totalPaid || 0), 0);
        const totalExp = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
        const profit = totalInc - totalExp;

        const headers = ['Category', 'Volume / Units', 'Total Income (₹)', 'Total Expense (₹)', 'Net Result (₹)'];
        const rows = [
          ['RTO Applications Processed', apps.length, formatINR(totalInc), formatINR(totalExp), formatINR(profit)],
          ['Tractors Sold / Booked', db.tractors.filter((t) => t.stockStatus === 'Sold' || t.stockStatus === 'Booked').length, '-', '-', '-'],
          ['Tractor Loans Sanctioned', db.loans.filter((l) => l.loanStatus === 'Disbursed' || l.loanStatus === 'Approved').length, '-', '-', '-'],
        ];

        return {
          title: `${activeReport.replace('-', ' ').toUpperCase()}`,
          headers,
          rows,
          summary: `Period Income: ${formatINR(totalInc)} | Expenses: ${formatINR(totalExp)} | Net Profit: ${formatINR(profit)}`,
        };
      }

      case 'client-history': {
        const headers = ['Client ID', 'Client Name', 'Mobile', 'Address', 'Aadhaar (Masked)', 'Reg Date'];
        const rows = db.clients.map((c) => [c.id, c.name, c.mobile, c.address, maskAadhaar(c.aadhaar), c.registrationDate]);
        return { title: 'Client Master History Report', headers, rows, summary: `Total Enrolled Clients: ${db.clients.length}` };
      }

      case 'vehicle-history': {
        const headers = ['Vehicle ID', 'Vehicle Number', 'Owner Name', 'Type', 'Brand & Model', 'RC Expiry', 'Ins Expiry'];
        const rows = db.vehicles.map((v) => [v.id, v.vehicleNumber, v.ownerName, v.vehicleType, `${v.brand} ${v.model}`, v.rcValidity, v.insuranceExpiry]);
        return { title: 'Vehicle Fleet & Expiry Radar Report', headers, rows, summary: `Total Vehicles: ${db.vehicles.length}` };
      }

      case 'rto-work':
      case 'pending-work':
      case 'completed-work': {
        const apps =
          activeReport === 'pending-work'
            ? db.applications.filter((a) => a.workStatus !== 'Completed')
            : activeReport === 'completed-work'
            ? db.applications.filter((a) => a.workStatus === 'Completed')
            : db.applications;

        const headers = ['App ID', 'Vehicle No', 'Client Name', 'Work Type', 'RTO Office', 'Total Fees', 'Balance', 'Status'];
        const rows = apps.map((a) => [a.id, a.vehicleNumber, a.clientName, a.workType, a.rtoOffice.split('(')[0], formatINR(a.totalFees), formatINR(a.balanceAmount), a.workStatus]);
        return { title: `RTO Applications - ${activeReport.toUpperCase()}`, headers, rows, summary: `Applications Count: ${apps.length}` };
      }

      case 'payment-collection': {
        const headers = ['Txn ID', 'Date', 'Client Name', 'Vehicle Number', 'Payment Type', 'Total Paid (₹)', 'Mode', 'Reference'];
        const rows = db.payments.map((p) => [p.id, p.date, p.clientName, p.vehicleNumber, p.paymentType, formatINR(p.totalPaid), p.paymentMode, p.transactionReference]);
        const sum = db.payments.reduce((acc, p) => acc + (p.totalPaid || 0), 0);
        return { title: 'Payment Collections Audit Ledger', headers, rows, summary: `Total Collections Received: ${formatINR(sum)}` };
      }

      case 'outstanding-balance': {
        const dueApps = db.applications.filter((a) => a.balanceAmount > 0);
        const headers = ['App ID', 'Client Name', 'Vehicle Number', 'Work Type', 'Total Fees (₹)', 'Advance (₹)', 'Outstanding Balance (₹)', 'Status'];
        const rows = dueApps.map((a) => [a.id, a.clientName, a.vehicleNumber, a.workType, formatINR(a.totalFees), formatINR(a.advancePaid), formatINR(a.balanceAmount), a.workStatus]);
        const sum = dueApps.reduce((acc, a) => acc + (a.balanceAmount || 0), 0);
        return { title: 'Unpaid Outstanding Balances Report', headers, rows, summary: `Total Overdue Balance: ${formatINR(sum)} from ${dueApps.length} applications` };
      }

      case 'income-expense': {
        const totalInc = db.payments.reduce((acc, p) => acc + (p.totalPaid || 0), 0);
        const totalExp = db.expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
        const profit = totalInc - totalExp;
        const headers = ['Financial Component', 'Transaction Count', 'Total Amount (₹)'];
        const rows = [
          ['Total Collections (Income)', db.payments.length, formatINR(totalInc)],
          ['Operational Expenses', db.expenses.length, formatINR(totalExp)],
          ['NET BUSINESS PROFIT', '-', formatINR(profit)],
        ];
        return { title: 'Income, Expense & Net Profit Audit Report', headers, rows, summary: `Net Business Profit: ${formatINR(profit)}` };
      }

      case 'tractor-stock': {
        const headers = ['Tractor ID', 'Reg Number', 'Brand', 'Model', 'Mfg Year', 'Stock Status', 'Price (₹)', 'Customer'];
        const rows = db.tractors.map((t) => [t.id, t.registrationNumber, t.brand, t.model, t.manufacturingYear, t.stockStatus, formatINR(t.price), t.ownerName]);
        return { title: 'Tractor Showroom Stock Inventory Report', headers, rows, summary: `Total Tractors: ${db.tractors.length}` };
      }

      case 'tractor-exchange': {
        const headers = ['Exchange ID', 'Customer', 'Old Tractor & Model', 'Old Valuation (₹)', 'New Tractor', 'Difference Payable (₹)'];
        const rows = db.exchanges.map((e) => [e.id, e.customerName, `${e.oldTractorNumber} (${e.oldTractorModel})`, formatINR(e.oldTractorValuation), e.newTractorModel, formatINR(e.exchangeDifferenceAmount)]);
        return { title: 'Old Tractor Exchange & Valuation Report', headers, rows, summary: `Total Trade-ins: ${db.exchanges.length}` };
      }

      case 'loan-report': {
        const headers = ['Loan ID', 'Customer Name', 'Tractor No', 'Finance Institution', 'Loan Amount (₹)', 'Net Credit (₹)', 'Status'];
        const rows = db.loans.map((l) => [l.id, l.customerName, l.tractorNumber, l.financeCompany, formatINR(l.loanAmount), formatINR(l.netCreditAmount), l.loanStatus]);
        return { title: 'Tractor Bank Finance & Disbursement Report', headers, rows, summary: `Total Loan Files: ${db.loans.length}` };
      }

      default:
        return { title: 'Business Report', headers: [], rows: [], summary: '' };
    }
  };

  const payload = getReportPayload();

  const handleExportPDF = () => {
    exportGeneralReportPDF(payload.title, payload.headers, payload.rows, db.settings, payload.summary);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-rose-600" />
            <span>13. Automated Business & Compliance Reports Hub</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            15 pre-configured automated intelligence reports with date filters, print views, and 1-click PDF download.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Official PDF</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Left Report Selector + Right Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: 15 Reports Navigation */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3 space-y-1 h-fit">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Select Report Type
          </div>
          {reportList.map((rep) => {
            const isSelected = activeReport === rep.id;
            return (
              <button
                key={rep.id}
                onClick={() => setActiveReport(rep.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition flex flex-col cursor-pointer ${
                  isSelected
                    ? 'bg-rose-50 text-rose-900 font-bold border border-rose-200 shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{rep.label}</span>
                <span className="text-[10px] font-normal text-slate-400 mt-0.5">{rep.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Right Column: Active Report View */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{payload.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{payload.summary}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print View</span>
                </button>
              </div>
            </div>

            {/* Render Tabular Report Preview */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    {payload.headers.map((h, i) => (
                      <th key={i} className="px-4 py-2.5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payload.rows.length === 0 ? (
                    <tr>
                      <td colSpan={payload.headers.length || 1} className="px-4 py-8 text-center text-slate-400">
                        No records for this report period.
                      </td>
                    </tr>
                  ) : (
                    payload.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50 transition">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-4 py-2.5 whitespace-pre-line text-slate-700">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
