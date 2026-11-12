import React, { useState } from 'react';
import {
  Users,
  Car,
  Tractor,
  FileText,
  CheckCircle2,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Calendar,
  ArrowRight,
  ShieldAlert,
  CreditCard,
  FileWarning,
  Sparkles,
} from 'lucide-react';
import { AppDatabase } from '../utils/storage';
import { TimeFilter } from '../types';
import {
  formatINR,
  isDateWithinFilter,
  getDocumentAlertStatus,
  isOverdue,
} from '../utils/pureCalculations';
import { ActiveTab } from './Navbar';

interface DashboardProps {
  db: AppDatabase;
  onNavigate: (tab: ActiveTab) => void;
  onRefresh: () => void;
  currentDateStr: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  db,
  onNavigate,
  onRefresh,
  currentDateStr,
}) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Filtered RTO applications
  const filteredApps = db.applications.filter((a) =>
    isDateWithinFilter(a.applicationDate, timeFilter, currentDateStr)
  );

  // Filtered Payments
  const filteredPayments = db.payments.filter((p) =>
    isDateWithinFilter(p.date, timeFilter, currentDateStr)
  );

  // Filtered Expenses
  const filteredExpenses = db.expenses.filter((e) =>
    isDateWithinFilter(e.date, timeFilter, currentDateStr)
  );

  // Business Overview Metrics
  const totalClients = db.clients.length;
  const totalVehicles = db.vehicles.length;
  const totalTractors = db.tractors.length;
  const totalApplications = filteredApps.length;
  const completedApps = filteredApps.filter((a) => a.workStatus === 'Completed').length;
  const pendingApps = filteredApps.filter((a) => a.workStatus === 'Pending').length;
  const processingApps = filteredApps.filter((a) => a.workStatus === 'Processing').length;
  const todayEntries = db.applications.filter((a) => a.applicationDate === currentDateStr).length;

  // Financial Overview Metrics
  const totalIncome = filteredPayments.reduce((acc, p) => acc + (p.totalPaid || 0), 0);
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const netProfit = totalIncome - totalExpenses;
  const totalOutstanding = filteredApps.reduce((acc, a) => acc + (a.balanceAmount || 0), 0);
  const totalAdvance = filteredPayments.reduce((acc, p) => acc + (p.advancePayment || 0), 0);

  const todayCollection = db.payments
    .filter((p) => p.date === currentDateStr)
    .reduce((acc, p) => acc + (p.totalPaid || 0), 0);

  const monthlyCollection = db.payments
    .filter((p) => isDateWithinFilter(p.date, 'month', currentDateStr))
    .reduce((acc, p) => acc + (p.totalPaid || 0), 0);

  // Document & Compliance Alerts
  const expiredInsuranceCount = db.vehicles.filter(
    (v) => getDocumentAlertStatus(v.insuranceExpiry, currentDateStr) === 'expired'
  ).length;

  const expiringInsuranceCount = db.vehicles.filter(
    (v) => getDocumentAlertStatus(v.insuranceExpiry, currentDateStr) === 'expiring_soon'
  ).length;

  const expiredRCCount = db.vehicles.filter(
    (v) => getDocumentAlertStatus(v.rcValidity, currentDateStr) === 'expired'
  ).length;

  const expiringRCCount = db.vehicles.filter(
    (v) => getDocumentAlertStatus(v.rcValidity, currentDateStr) === 'expiring_soon'
  ).length;

  const pendingDocumentsCount = db.documents.filter(
    (d) => d.receivedStatus === 'Missing' || d.verificationStatus === 'Pending'
  ).length;

  const overdueAppsCount = db.applications.filter((a) =>
    isOverdue(a.expectedCompletionDate, a.workStatus, currentDateStr)
  ).length;

  const pendingPaymentsCount = db.applications.filter((a) => a.balanceAmount > 0).length;

  return (
    <div className="space-y-6 pb-16 pt-2">
      {/* Top Banner & Control Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Executive Business Overview & Control Hub
            </h2>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Live Database Connected
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time RTO workflow monitoring, tractor showroom sales, finance ledger and compliance expiry alerts.
          </p>
        </div>

        {/* Date Filter & Refresh Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1" />
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-2.5 py-1 rounded-md transition ${
                timeFilter === 'all' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setTimeFilter('today')}
              className={`px-2.5 py-1 rounded-md transition ${
                timeFilter === 'today' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeFilter('week')}
              className={`px-2.5 py-1 rounded-md transition ${
                timeFilter === 'week' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setTimeFilter('month')}
              className={`px-2.5 py-1 rounded-md transition ${
                timeFilter === 'month' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
          </div>

          <button
            onClick={handleRefreshClick}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-xs transition cursor-pointer"
            title="Recalculate metrics and reload fresh database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Dashboard</span>
          </button>
        </div>
      </div>

      {/* Quick Navigation Action Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
        <button
          onClick={() => onNavigate('data-entry')}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg flex flex-col items-center justify-center text-center text-xs font-semibold shadow-xs transition group cursor-pointer"
        >
          <span className="w-7 h-7 rounded-full bg-blue-500/50 flex items-center justify-center mb-1 group-hover:scale-110 transition">
            +
          </span>
          <span>New Entry Form</span>
        </button>
        <button
          onClick={() => onNavigate('clients')}
          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 p-3 rounded-lg flex flex-col items-center justify-center text-center text-xs font-medium shadow-xs transition group cursor-pointer"
        >
          <Users className="w-5 h-5 text-blue-600 mb-1 group-hover:scale-110 transition" />
          <span>Client Database</span>
        </button>
        <button
          onClick={() => onNavigate('vehicles')}
          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 p-3 rounded-lg flex flex-col items-center justify-center text-center text-xs font-medium shadow-xs transition group cursor-pointer"
        >
          <Car className="w-5 h-5 text-emerald-600 mb-1 group-hover:scale-110 transition" />
          <span>Vehicle Master</span>
        </button>
        <button
          onClick={() => onNavigate('rto-work')}
          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 p-3 rounded-lg flex flex-col items-center justify-center text-center text-xs font-medium shadow-xs transition group cursor-pointer"
        >
          <FileText className="w-5 h-5 text-indigo-600 mb-1 group-hover:scale-110 transition" />
          <span>RTO Applications</span>
        </button>
        <button
          onClick={() => onNavigate('tractor-showroom')}
          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 p-3 rounded-lg flex flex-col items-center justify-center text-center text-xs font-medium shadow-xs transition group cursor-pointer"
        >
          <Tractor className="w-5 h-5 text-amber-600 mb-1 group-hover:scale-110 transition" />
          <span>Tractor Inventory</span>
        </button>
        <button
          onClick={() => onNavigate('payments')}
          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 p-3 rounded-lg flex flex-col items-center justify-center text-center text-xs font-medium shadow-xs transition group cursor-pointer"
        >
          <CreditCard className="w-5 h-5 text-violet-600 mb-1 group-hover:scale-110 transition" />
          <span>Payment Ledger</span>
        </button>
        <button
          onClick={() => onNavigate('reports')}
          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 p-3 rounded-lg flex flex-col items-center justify-center text-center text-xs font-medium shadow-xs transition group cursor-pointer"
        >
          <Sparkles className="w-5 h-5 text-rose-600 mb-1 group-hover:scale-110 transition" />
          <span>Automated Reports</span>
        </button>
      </div>

      {/* SECTION 1: BUSINESS OVERVIEW */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            01. Business Operations Overview
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Active Records in Master Database
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Total Clients */}
          <div
            onClick={() => onNavigate('clients')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase text-slate-500">Clients</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-2">{totalClients}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Registered Owners</div>
          </div>

          {/* Total Vehicles */}
          <div
            onClick={() => onNavigate('vehicles')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-400 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase text-slate-500">Vehicles</span>
              <Car className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-2">{totalVehicles}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Enrolled Assets</div>
          </div>

          {/* Total Tractors */}
          <div
            onClick={() => onNavigate('tractor-showroom')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-amber-400 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase text-slate-500">Tractors</span>
              <Tractor className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-2">{totalTractors}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Showroom Stock</div>
          </div>

          {/* Total Applications */}
          <div
            onClick={() => onNavigate('rto-work')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase text-slate-500">RTO Apps</span>
              <FileText className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-2">{totalApplications}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Work Files</div>
          </div>

          {/* Completed Applications */}
          <div
            onClick={() => onNavigate('rto-work')}
            className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs hover:border-emerald-400 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-[11px] font-semibold uppercase text-emerald-700">Completed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-emerald-700 mt-2">{completedApps}</div>
            <div className="text-[10px] text-emerald-600 mt-0.5">Delivered RC/Permit</div>
          </div>

          {/* Processing Applications */}
          <div
            onClick={() => onNavigate('rto-work')}
            className="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-xs hover:border-blue-400 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-blue-600">
              <span className="text-[11px] font-semibold uppercase text-blue-700">Processing</span>
              <RefreshCw className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl font-bold text-blue-700 mt-2">{processingApps}</div>
            <div className="text-[10px] text-blue-600 mt-0.5">At RTO Counter</div>
          </div>

          {/* Pending Applications */}
          <div
            onClick={() => onNavigate('rto-work')}
            className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs hover:border-amber-400 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-[11px] font-semibold uppercase text-amber-700">Pending</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-bold text-amber-700 mt-2">{pendingApps}</div>
            <div className="text-[10px] text-amber-600 mt-0.5">Doc Verification</div>
          </div>

          {/* Today's New Entries */}
          <div
            onClick={() => onNavigate('data-entry')}
            className="bg-white p-3.5 rounded-xl border border-purple-200 bg-purple-50/20 shadow-xs hover:border-purple-400 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-purple-600">
              <span className="text-[11px] font-semibold uppercase text-purple-700">Today New</span>
              <Calendar className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-xl font-bold text-purple-700 mt-2">{todayEntries}</div>
            <div className="text-[10px] text-purple-600 mt-0.5">Logged Today</div>
          </div>
        </div>
      </div>

      {/* SECTION 2: FINANCIAL OVERVIEW */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            02. Financial Overview & Revenue Cash Ledger
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Calculated Automatically from Payments & Expenses
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Income */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500">Total Income (Collections)</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">{formatINR(totalIncome)}</div>
            <div className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <span>Includes advance & stage clearance</span>
            </div>
          </div>

          {/* Total Expenses */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500">Total Expenses</span>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">{formatINR(totalExpenses)}</div>
            <div className="text-xs text-rose-600 font-medium mt-1">
              Salaries, challans, fuel & office costs
            </div>
          </div>

          {/* Net Profit */}
          <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white p-4 rounded-xl shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-300">Net Business Profit</span>
              <div className="p-2 bg-white/10 text-emerald-400 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-white mt-2">{formatINR(netProfit)}</div>
            <div className="text-xs text-emerald-300 font-medium mt-1">
              Total Income - Total Expenses
            </div>
          </div>

          {/* Total Outstanding */}
          <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-rose-700">Total Outstanding Balance</span>
              <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-700 mt-2">{formatINR(totalOutstanding)}</div>
            <div className="text-xs text-rose-600 font-medium mt-1">
              Pending fee clearance from clients
            </div>
          </div>
        </div>

        {/* Supplementary Collections Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Today's Collection:</span>
            <span className="font-bold text-slate-900">{formatINR(todayCollection)}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">This Month's Collection:</span>
            <span className="font-bold text-slate-900">{formatINR(monthlyCollection)}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Total Advance Payments Held:</span>
            <span className="font-bold text-blue-700">{formatINR(totalAdvance)}</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: DOCUMENT ALERTS & COMPLIANCE RADAR */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
            03. Critical Document & Compliance Alerts
          </h3>
          <button
            onClick={() => onNavigate('alerts')}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>Open Reminders & Alerts Hub</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Expired Insurance */}
          <div
            onClick={() => onNavigate('alerts')}
            className="bg-white p-3 rounded-xl border border-rose-300 bg-rose-50/40 shadow-xs hover:border-rose-500 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-rose-600">
              <span className="text-[10px] font-bold uppercase">Expired Insurance</span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-xl font-bold text-rose-700 mt-1">{expiredInsuranceCount}</div>
            <div className="text-[10px] text-rose-600">RED = Overdue</div>
          </div>

          {/* Insurance Expiring Soon */}
          <div
            onClick={() => onNavigate('alerts')}
            className="bg-white p-3 rounded-xl border border-amber-300 bg-amber-50/40 shadow-xs hover:border-amber-500 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-[10px] font-bold uppercase">Ins Expiring Soon</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-bold text-amber-700 mt-1">{expiringInsuranceCount}</div>
            <div className="text-[10px] text-amber-600">YELLOW = &lt; 30 Days</div>
          </div>

          {/* Expired RC */}
          <div
            onClick={() => onNavigate('alerts')}
            className="bg-white p-3 rounded-xl border border-rose-300 bg-rose-50/40 shadow-xs hover:border-rose-500 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-rose-600">
              <span className="text-[10px] font-bold uppercase">Expired RC</span>
              <FileWarning className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-xl font-bold text-rose-700 mt-1">{expiredRCCount}</div>
            <div className="text-[10px] text-rose-600">Needs FC Renewal</div>
          </div>

          {/* RC Expiring Soon */}
          <div
            onClick={() => onNavigate('alerts')}
            className="bg-white p-3 rounded-xl border border-amber-300 bg-amber-50/40 shadow-xs hover:border-amber-500 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-[10px] font-bold uppercase">RC Expiring Soon</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-bold text-amber-700 mt-1">{expiringRCCount}</div>
            <div className="text-[10px] text-amber-600">Within 30 Days</div>
          </div>

          {/* Overdue Applications */}
          <div
            onClick={() => onNavigate('alerts')}
            className="bg-white p-3 rounded-xl border border-rose-300 bg-rose-50/40 shadow-xs hover:border-rose-500 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-rose-600">
              <span className="text-[10px] font-bold uppercase">Overdue RTO Apps</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-xl font-bold text-rose-700 mt-1">{overdueAppsCount}</div>
            <div className="text-[10px] text-rose-600">Target Date Passed</div>
          </div>

          {/* Missing Documents */}
          <div
            onClick={() => onNavigate('documents')}
            className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs hover:border-slate-400 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase">Pending Documents</span>
              <FileText className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-xl font-bold text-slate-800 mt-1">{pendingDocumentsCount}</div>
            <div className="text-[10px] text-slate-500">Form 29/30/Challans</div>
          </div>

          {/* Pending Payments */}
          <div
            onClick={() => onNavigate('payments')}
            className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs hover:border-slate-400 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase">Pending Balance</span>
              <CreditCard className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-xl font-bold text-slate-800 mt-1">{pendingPaymentsCount}</div>
            <div className="text-[10px] text-slate-500">Applications Due</div>
          </div>
        </div>
      </div>

      {/* SECTION 4: RECENT ACTIVITY LOG & RTO WORK PROGRESS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent RTO Applications List */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Recent RTO Applications
            </h4>
            <button
              onClick={() => onNavigate('rto-work')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              View All ({db.applications.length})
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {db.applications.slice(0, 4).map((app) => (
              <div key={app.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    <span>{app.vehicleNumber}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-700">{app.workType}</span>
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    {app.clientName} | {app.rtoOffice.split('(')[0]}
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      app.workStatus === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : app.workStatus === 'Processing'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {app.workStatus}
                  </span>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Due: {app.expectedCompletionDate}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Tractor & Exchange Activity */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Tractor className="w-4 h-4 text-amber-600" />
              Tractor Showroom & Exchange Deals
            </h4>
            <button
              onClick={() => onNavigate('tractor-showroom')}
              className="text-xs text-amber-600 hover:text-amber-800 font-semibold cursor-pointer"
            >
              View Stock ({db.tractors.length})
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {db.tractors.slice(0, 4).map((trc) => (
              <div key={trc.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    <span>{trc.brand} {trc.model}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600">{trc.registrationNumber}</span>
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Price: {formatINR(trc.price)} | Cust: {trc.ownerName}
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      trc.stockStatus === 'In Stock'
                        ? 'bg-emerald-100 text-emerald-800'
                        : trc.stockStatus === 'Sold'
                        ? 'bg-blue-100 text-blue-800'
                        : trc.stockStatus === 'Booked'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {trc.stockStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
