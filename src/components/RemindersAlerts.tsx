import React, { useState } from 'react';
import {
  BellRing,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ShieldAlert,
  CreditCard,
  FileWarning,
  Landmark,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { AppDatabase } from '../utils/storage';
import { getDocumentAlertStatus, isOverdue, formatINR } from '../utils/pureCalculations';
import { ActiveTab } from './Navbar';

interface RemindersAlertsProps {
  db: AppDatabase;
  onNavigate: (tab: ActiveTab) => void;
  currentDateStr: string;
}

export const RemindersAlerts: React.FC<RemindersAlertsProps> = ({
  db,
  onNavigate,
  currentDateStr,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'All' | 'RED' | 'YELLOW' | 'GREEN'>('All');

  // Collect all alerts
  interface AlertItem {
    id: string;
    category: 'RTO Work' | 'Insurance' | 'RC Validity' | 'Document' | 'Payment' | 'Loan';
    title: string;
    description: string;
    severity: 'RED' | 'YELLOW' | 'GREEN';
    actionText: string;
    targetTab: ActiveTab;
    dueDate?: string;
  }

  const alerts: AlertItem[] = [];

  // 1. Overdue RTO Applications (RED)
  db.applications.forEach((a) => {
    if (isOverdue(a.expectedCompletionDate, a.workStatus, currentDateStr)) {
      alerts.push({
        id: `APP-OVER-${a.id}`,
        category: 'RTO Work',
        title: `Overdue Application: ${a.id} (${a.vehicleNumber})`,
        description: `${a.workType} at ${a.rtoOffice} was expected on ${a.expectedCompletionDate}. Current status: ${a.workStatus}.`,
        severity: 'RED',
        actionText: 'Update Application',
        targetTab: 'rto-work',
        dueDate: a.expectedCompletionDate,
      });
    } else if (a.workStatus === 'Completed') {
      alerts.push({
        id: `APP-DONE-${a.id}`,
        category: 'RTO Work',
        title: `Completed Work: ${a.id} (${a.vehicleNumber})`,
        description: `${a.workType} successfully finished for client ${a.clientName}. Ready for handover.`,
        severity: 'GREEN',
        actionText: 'View RTO Work',
        targetTab: 'rto-work',
        dueDate: a.completionDate || a.applicationDate,
      });
    } else if (a.workStatus === 'Processing' || a.workStatus === 'Pending') {
      alerts.push({
        id: `APP-DUE-${a.id}`,
        category: 'RTO Work',
        title: `RTO Work In Progress: ${a.id}`,
        description: `${a.workType} for ${a.vehicleNumber} due on ${a.expectedCompletionDate}.`,
        severity: 'YELLOW',
        actionText: 'Check Progress',
        targetTab: 'rto-work',
        dueDate: a.expectedCompletionDate,
      });
    }
  });

  // 2. Vehicle Insurance & RC Expiries
  db.vehicles.forEach((v) => {
    const insStatus = getDocumentAlertStatus(v.insuranceExpiry, currentDateStr);
    if (insStatus === 'expired') {
      alerts.push({
        id: `VEH-INS-EXP-${v.id}`,
        category: 'Insurance',
        title: `Expired Insurance: ${v.vehicleNumber}`,
        description: `Owner ${v.ownerName}'s policy expired on ${v.insuranceExpiry}. Vehicle is running without legal coverage.`,
        severity: 'RED',
        actionText: 'Renew Insurance',
        targetTab: 'rto-work',
        dueDate: v.insuranceExpiry,
      });
    } else if (insStatus === 'expiring_soon') {
      alerts.push({
        id: `VEH-INS-SOON-${v.id}`,
        category: 'Insurance',
        title: `Insurance Expiring Soon: ${v.vehicleNumber}`,
        description: `Policy expires on ${v.insuranceExpiry} (less than 30 days remaining). Contact owner ${v.ownerName}.`,
        severity: 'YELLOW',
        actionText: 'Follow Up Client',
        targetTab: 'clients',
        dueDate: v.insuranceExpiry,
      });
    }

    const rcStatus = getDocumentAlertStatus(v.rcValidity, currentDateStr);
    if (rcStatus === 'expired') {
      alerts.push({
        id: `VEH-RC-EXP-${v.id}`,
        category: 'RC Validity',
        title: `Expired RC Book / Fitness: ${v.vehicleNumber}`,
        description: `Registration validity ended on ${v.rcValidity}. Apply for renewal or fitness certificate immediately.`,
        severity: 'RED',
        actionText: 'Apply Renewal',
        targetTab: 'data-entry',
        dueDate: v.rcValidity,
      });
    } else if (rcStatus === 'expiring_soon') {
      alerts.push({
        id: `VEH-RC-SOON-${v.id}`,
        category: 'RC Validity',
        title: `RC Book Expiring Soon: ${v.vehicleNumber}`,
        description: `Validity expires on ${v.rcValidity}. Prepare Form 25 application.`,
        severity: 'YELLOW',
        actionText: 'View Vehicle',
        targetTab: 'vehicles',
        dueDate: v.rcValidity,
      });
    }
  });

  // 3. Missing Documents
  db.documents.forEach((d) => {
    if (d.receivedStatus === 'Missing' || d.verificationStatus === 'Rejected') {
      alerts.push({
        id: `DOC-MISS-${d.id}`,
        category: 'Document',
        title: `Missing Required Document: ${d.documentType}`,
        description: `${d.documentType} for vehicle ${d.vehicleNumber} (${d.clientName}) is not in custody.`,
        severity: 'RED',
        actionText: 'Collect Document',
        targetTab: 'documents',
      });
    } else if (d.verificationStatus === 'Pending') {
      alerts.push({
        id: `DOC-PEND-${d.id}`,
        category: 'Document',
        title: `Document Pending Verification: ${d.documentType}`,
        description: `${d.documentType} #${d.documentNumber} awaiting RTO inspector verification.`,
        severity: 'YELLOW',
        actionText: 'Verify Document',
        targetTab: 'documents',
      });
    }
  });

  // 4. Pending Payments & Outstanding Balances
  db.applications.forEach((a) => {
    if (a.balanceAmount > 0) {
      alerts.push({
        id: `PAY-DUE-${a.id}`,
        category: 'Payment',
        title: `Pending Fee Balance: ${formatINR(a.balanceAmount)}`,
        description: `Client ${a.clientName} owes balance of ${formatINR(a.balanceAmount)} for application ${a.id} (${a.vehicleNumber}).`,
        severity: a.workStatus === 'Completed' ? 'RED' : 'YELLOW',
        actionText: 'Collect Payment',
        targetTab: 'payments',
      });
    }
  });

  // 5. Loan Follow-ups
  db.loans.forEach((l) => {
    if (l.loanStatus === 'In Verification' || l.loanStatus === 'Login') {
      alerts.push({
        id: `LON-PEND-${l.id}`,
        category: 'Loan',
        title: `Loan In Process: ${l.financeCompany}`,
        description: `Customer ${l.customerName}'s loan file for tractor ${l.tractorNumber} is pending bank sanction.`,
        severity: 'YELLOW',
        actionText: 'Follow Up Bank',
        targetTab: 'loans',
      });
    } else if (l.loanStatus === 'Disbursed') {
      alerts.push({
        id: `LON-DONE-${l.id}`,
        category: 'Loan',
        title: `Loan Disbursed: ${formatINR(l.netCreditAmount)}`,
        description: `${l.financeCompany} credited net loan amount to dealer account for ${l.customerName}.`,
        severity: 'GREEN',
        actionText: 'View Loans',
        targetTab: 'loans',
      });
    }
  });

  const filteredAlerts = alerts.filter(
    (a) => severityFilter === 'All' || a.severity === severityFilter
  );

  const redCount = alerts.filter((a) => a.severity === 'RED').length;
  const yellowCount = alerts.filter((a) => a.severity === 'YELLOW').length;
  const greenCount = alerts.filter((a) => a.severity === 'GREEN').length;

  return (
    <div className="space-y-5 pb-12">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-rose-600" />
            <span>12. Automated Reminders & Compliance Radar</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Color-coded compliance alerts: RED = Overdue & Urgent, YELLOW = Due Soon (&lt;30d), GREEN = Completed & Disbursed.
          </p>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSeverityFilter('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              severityFilter === 'All'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Alerts ({alerts.length})
          </button>
          <button
            onClick={() => setSeverityFilter('RED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              severityFilter === 'RED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>RED Overdue ({redCount})</span>
          </button>
          <button
            onClick={() => setSeverityFilter('YELLOW')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              severityFilter === 'YELLOW'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>YELLOW Due Soon ({yellowCount})</span>
          </button>
          <button
            onClick={() => setSeverityFilter('GREEN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              severityFilter === 'GREEN'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>GREEN Done ({greenCount})</span>
          </button>
        </div>
      </div>

      {/* Alerts Grid / List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
            No compliance alerts matching this severity filter.
          </div>
        ) : (
          filteredAlerts.map((alt) => (
            <div
              key={alt.id}
              className={`p-4 rounded-xl border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                alt.severity === 'RED'
                  ? 'bg-rose-50/50 border-rose-300 hover:border-rose-400'
                  : alt.severity === 'YELLOW'
                  ? 'bg-amber-50/50 border-amber-300 hover:border-amber-400'
                  : 'bg-emerald-50/50 border-emerald-300 hover:border-emerald-400'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                    alt.severity === 'RED'
                      ? 'bg-rose-100 text-rose-700'
                      : alt.severity === 'YELLOW'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {alt.severity === 'RED' && <ShieldAlert className="w-5 h-5" />}
                  {alt.severity === 'YELLOW' && <Clock className="w-5 h-5" />}
                  {alt.severity === 'GREEN' && <CheckCircle2 className="w-5 h-5" />}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-wide ${
                        alt.severity === 'RED'
                          ? 'bg-rose-200 text-rose-900'
                          : alt.severity === 'YELLOW'
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-emerald-200 text-emerald-900'
                      }`}
                    >
                      {alt.severity} • {alt.category}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm">{alt.title}</h3>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{alt.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                {alt.dueDate && (
                  <span className="text-xs text-slate-500 font-medium hidden md:inline-block">
                    Target: {alt.dueDate}
                  </span>
                )}
                <button
                  onClick={() => onNavigate(alt.targetTab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
                    alt.severity === 'RED'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : alt.severity === 'YELLOW'
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <span>{alt.actionText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
