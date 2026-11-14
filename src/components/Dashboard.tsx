import React, { useMemo, useState } from 'react';
import {
  Users,
  Car,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileWarning,
  CalendarClock,
  Plus,
  Building2,
  ArrowUpRight,
} from 'lucide-react';
import type {
  Client,
  DocumentRecord,
  RTOApplication,
  Showroom,
  SystemSettings,
  TimeFilter,
  Vehicle,
} from '../types';
import {
  computeShowroomRtoSummary,
  evaluateApplicationChecklist,
  filterByShowroom,
  getDocumentAlertStatus,
  getShowroomLabel,
  getTodayDateStr,
  isDateWithinFilter,
  isOverdue,
} from '../utils/pureCalculations';
import type { AppTab } from './Navbar';

interface DashboardProps {
  showrooms: Showroom[];
  activeShowroomId: string;
  onShowroomChange: (id: string) => void;
  clients: Client[]; // Centralized common clients
  vehicles: Vehicle[]; // Centralized vehicles
  applications: RTOApplication[];
  documents: DocumentRecord[];
  settings: SystemSettings;
  onNavigate: (tab: AppTab) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  showrooms,
  activeShowroomId,
  onShowroomChange,
  clients,
  vehicles,
  applications,
  documents,
  settings,
  onNavigate,
}) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const todayStr = getTodayDateStr();

  const scopedApps = useMemo(() => {
    const byBranch = filterByShowroom(applications, activeShowroomId);
    return byBranch.filter((a) => isDateWithinFilter(a.applicationDate, timeFilter, todayStr));
  }, [applications, activeShowroomId, timeFilter, todayStr]);

  const scopedDocs = useMemo(
    () => filterByShowroom(documents, activeShowroomId),
    [documents, activeShowroomId]
  );

  const stats = useMemo(() => {
    const completed = scopedApps.filter((a) => a.workStatus === 'Completed').length;
    const inProcess = scopedApps.filter(
      (a) => a.workStatus === 'In Process' || a.workStatus === 'Submitted'
    ).length;
    const pending = scopedApps.filter(
      (a) =>
        a.workStatus === 'New' ||
        a.workStatus === 'Documents Pending' ||
        a.workStatus === 'Ready to Submit' ||
        a.workStatus === 'On Hold'
    ).length;
    const rejected = scopedApps.filter((a) => a.workStatus === 'Rejected').length;
    const submittedToday = filterByShowroom(applications, activeShowroomId).filter(
      (a) => a.submissionDate === todayStr || a.applicationDate === todayStr
    ).length;

    const missingDocsApps = scopedApps.filter((a) => {
      if (a.workStatus === 'Completed' || a.workStatus === 'Rejected') return false;
      return evaluateApplicationChecklist(a, documents, settings).status === 'Documents Incomplete';
    }).length;

    const overdueApps = scopedApps.filter((a) =>
      isOverdue(a.expectedCompletionDate, a.workStatus, todayStr)
    ).length;

    const expiringVehicles = vehicles.filter((v) => {
      const ins = getDocumentAlertStatus(v.insuranceExpiry, todayStr);
      const rc = getDocumentAlertStatus(v.rcValidity, todayStr);
      return ins === 'expired' || ins === 'expiring_soon' || rc === 'expired' || rc === 'expiring_soon';
    });

    return {
      totalClients: clients.length,
      totalVehicles: vehicles.length,
      totalApps: scopedApps.length,
      completed,
      inProcess,
      pending,
      rejected,
      submittedToday,
      missingDocsApps,
      overdueApps,
      expiringVehicles,
      totalDocs: scopedDocs.length,
    };
  }, [scopedApps, applications, activeShowroomId, todayStr, documents, settings, vehicles, clients.length, scopedDocs.length]);

  const showroomSummaries = useMemo(
    () => computeShowroomRtoSummary(showrooms, { applications, documents, settings }, todayStr),
    [showrooms, applications, documents, settings, todayStr]
  );

  const recentApps = useMemo(
    () =>
      [...scopedApps]
        .sort((a, b) => (b.applicationDate || '').localeCompare(a.applicationDate || ''))
        .slice(0, 6),
    [scopedApps]
  );

  const recentClients = useMemo(
    () =>
      [...clients]
        .sort((a, b) => (b.registrationDate || '').localeCompare(a.registrationDate || ''))
        .slice(0, 5),
    [clients]
  );

  const pendingQueue = useMemo(
    () =>
      scopedApps
        .filter((a) => a.workStatus !== 'Completed' && a.workStatus !== 'Rejected')
        .sort((a, b) => (a.expectedCompletionDate || '9999').localeCompare(b.expectedCompletionDate || '9999'))
        .slice(0, 6),
    [scopedApps]
  );

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'In Process':
      case 'Submitted':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Documents Pending':
      case 'On Hold':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar: Time Filter + Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 mr-1">
            Period:
          </span>
          {(['all', 'today', 'week', 'month'] as TimeFilter[]).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeFilter(tf)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                timeFilter === tf
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {tf === 'all' ? 'All Time' : tf === 'today' ? 'Today' : tf === 'week' ? 'Last 7 Days' : 'This Month'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('documents')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <FileWarning className="h-4 w-4 text-amber-600" />
            <span>Missing Docs ({stats.missingDocsApps})</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('data-entry')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>New RTO Work</span>
          </button>
        </div>
      </div>

      {/* KPI Row 1: Registry & RTO Pipeline */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('clients')}
          className="text-left rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Common Clients</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {stats.totalClients}
          </p>
          <p className="mt-1 text-xs text-slate-500">Shared across all showrooms</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('vehicles')}
          className="text-left rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Registered Vehicles</span>
            <Car className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {stats.totalVehicles}
          </p>
          <p className="mt-1 text-xs text-slate-500">RC & Insurance tracked</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('rto-work')}
          className="text-left rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">RTO Applications</span>
            <ClipboardList className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {stats.totalApps}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {stats.submittedToday} submitted today
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('rto-work')}
          className="text-left rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Completed Works</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-emerald-700 tabular-nums">
            {stats.completed}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {stats.inProcess} submitted / in process
          </p>
        </button>
      </div>

      {/* KPI Row 2: Pending / Alerts / Verification */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Pending / Hold</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {stats.pending}
          </p>
          <p className="mt-1 text-xs text-slate-500">New, Docs Pending & On Hold</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Missing Documents</span>
            <FileWarning className="h-4 w-4 text-red-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-red-700 tabular-nums">
            {stats.missingDocsApps}
          </p>
          <p className="mt-1 text-xs text-slate-500">Active apps incomplete</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Overdue Applications</span>
            <CalendarClock className="h-4 w-4 text-orange-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-orange-700 tabular-nums">
            {stats.overdueApps}
          </p>
          <p className="mt-1 text-xs text-slate-500">Past expected date</p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('alerts')}
          className="text-left rounded-xl border border-slate-200 bg-white p-4 hover:border-amber-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">RC & Ins Alerts</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-amber-700 tabular-nums">
            {stats.expiringVehicles.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Expired or expiring within 30 days</p>
        </button>
      </div>

      {/* Multi-Showroom Workload Breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            <h3 className="font-display text-sm font-bold text-slate-900">
              Showroom-Wise RTO Workload Summary
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('showrooms')}
            className="text-xs font-semibold text-blue-700 hover:text-blue-800 inline-flex items-center gap-1"
          >
            <span>Manage Showrooms</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Showroom</th>
                <th className="px-4 py-3 text-right">Clients Served</th>
                <th className="px-4 py-3 text-right">Total Apps</th>
                <th className="px-4 py-3 text-right">New / Pending</th>
                <th className="px-4 py-3 text-right">In Process</th>
                <th className="px-4 py-3 text-right">Completed</th>
                <th className="px-4 py-3 text-right">Missing Docs</th>
                <th className="px-5 py-3 text-right">Filter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {showroomSummaries.map((s) => (
                <tr
                  key={s.showroom.id}
                  className={
                    activeShowroomId === s.showroom.id ? 'bg-blue-50/40' : 'hover:bg-slate-50'
                  }
                >
                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-900">{s.showroom.name}</p>
                    <p className="text-xs text-slate-500">
                      <span className="font-mono">{s.showroom.code}</span> · {s.showroom.city}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {s.uniqueClientsCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                    {s.applicationsCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-amber-700">
                    {s.newAndPendingCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-blue-700">
                    {s.inProcessCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-700 font-semibold">
                    {s.completedCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-700 font-semibold">
                    {s.missingDocsAppsCount}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        onShowroomChange(
                          activeShowroomId === s.showroom.id ? 'ALL' : s.showroom.id
                        )
                      }
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                        activeShowroomId === s.showroom.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {activeShowroomId === s.showroom.id ? 'Focused' : 'Focus'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lower Two-Column Operational Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent RTO Applications */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
            <h3 className="font-display text-sm font-bold text-slate-900">
              Recent RTO Applications
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('rto-work')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800"
            >
              View All
            </button>
          </div>
          {recentApps.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No RTO applications recorded yet. Create an entry using New RTO Entry.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentApps.map((app) => (
                <div key={app.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {app.workType} · <span className="font-mono">{app.vehicleNumber}</span>
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {app.clientName} · {getShowroomLabel(showrooms, app.showroomId)} · {app.applicationDate}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(
                      app.workStatus
                    )}`}
                  >
                    {app.workStatus}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Work & Upcoming Expiries */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <h3 className="font-display text-sm font-bold text-slate-900">
                Pending RTO Work Queue
              </h3>
              <span className="text-xs text-slate-500">{pendingQueue.length} active</span>
            </div>
            {pendingQueue.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                No pending applications in this scope.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingQueue.map((app) => {
                  const overdue = isOverdue(app.expectedCompletionDate, app.workStatus, todayStr);
                  return (
                    <div key={app.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">
                          {app.id} · {app.clientName} ({app.vehicleNumber})
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          {app.workType} · Due: {app.expectedCompletionDate || 'Not set'}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold ${
                          overdue ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {overdue ? 'Overdue' : app.workStatus}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <h3 className="font-display text-sm font-bold text-slate-900">
                Recent Common Clients ({clients.length})
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('clients')}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800"
              >
                Open Directory
              </button>
            </div>
            {recentClients.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                No clients registered yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentClients.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900">
                        {c.name}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {c.id} · {c.address || 'Karnataka'}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-slate-600 shrink-0">{c.mobile}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
