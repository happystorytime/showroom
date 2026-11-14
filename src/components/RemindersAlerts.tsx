import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  FileWarning,
  ShieldAlert,
  Upload,
  ExternalLink,
} from 'lucide-react';
import type {
  DocumentRecord,
  RTOApplication,
  Showroom,
  SystemSettings,
  Vehicle,
} from '../types';
import {
  evaluateApplicationChecklist,
  filterByShowroom,
  getDocumentAlertStatus,
  getShowroomLabel,
  getTodayDateStr,
  isOverdue,
} from '../utils/pureCalculations';
import type { AppTab } from './Navbar';
import type { DocumentUploadPreset } from './DocumentManager';

interface RemindersAlertsProps {
  vehicles: Vehicle[];
  applications: RTOApplication[];
  documents: DocumentRecord[];
  showrooms: Showroom[];
  settings: SystemSettings;
  activeShowroomId: string;
  onNavigate: (tab: AppTab, searchTerm?: string) => void;
  onQuickUpload: (preset: DocumentUploadPreset) => void;
}

type AlertFilter = 'all' | 'insurance' | 'rc' | 'overdue' | 'missing_docs';

export const RemindersAlerts: React.FC<RemindersAlertsProps> = ({
  vehicles,
  applications,
  documents,
  showrooms,
  settings,
  activeShowroomId,
  onNavigate,
  onQuickUpload,
}) => {
  const [filter, setFilter] = useState<AlertFilter>('all');
  const todayStr = getTodayDateStr();

  const scopedApps = useMemo(
    () => filterByShowroom(applications, activeShowroomId),
    [applications, activeShowroomId]
  );

  const insuranceAlerts = useMemo(() => {
    return vehicles
      .map((v) => ({
        vehicle: v,
        status: getDocumentAlertStatus(v.insuranceExpiry, todayStr),
      }))
      .filter((item) => item.status === 'expired' || item.status === 'expiring_soon');
  }, [vehicles, todayStr]);

  const rcAlerts = useMemo(() => {
    return vehicles
      .map((v) => ({
        vehicle: v,
        status: getDocumentAlertStatus(v.rcValidity, todayStr),
      }))
      .filter((item) => item.status === 'expired' || item.status === 'expiring_soon');
  }, [vehicles, todayStr]);

  const overdueApps = useMemo(() => {
    return scopedApps.filter((a) => isOverdue(a.expectedCompletionDate, a.workStatus, todayStr));
  }, [scopedApps, todayStr]);

  const missingDocApps = useMemo(() => {
    return scopedApps
      .filter((a) => a.workStatus !== 'Completed' && a.workStatus !== 'Rejected')
      .map((app) => ({
        app,
        evalRes: evaluateApplicationChecklist(app, documents, settings),
      }))
      .filter((item) => item.evalRes.status !== 'Documents Complete');
  }, [scopedApps, documents, settings]);

  const totalAlerts =
    insuranceAlerts.length + rcAlerts.length + overdueApps.length + missingDocApps.length;

  return (
    <div className="space-y-6">
      {/* Summary Tabs */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Compliance Reminders & Alerts ({totalAlerts})
            </h2>
            <p className="text-xs text-slate-500">
              Proactive alerts for expiring Insurance & RC, overdue RTO filings, and incomplete document checklists.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'all', label: `All Alerts (${totalAlerts})` },
              { id: 'insurance', label: `Insurance Expiry (${insuranceAlerts.length})` },
              { id: 'rc', label: `RC Validity (${rcAlerts.length})` },
              { id: 'overdue', label: `Overdue Applications (${overdueApps.length})` },
              { id: 'missing_docs', label: `Checklist Gaps (${missingDocApps.length})` },
            ] as { id: AlertFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {totalAlerts === 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center text-sm font-medium text-emerald-800">
          All vehicles and RTO applications are compliant with zero active alerts.
        </div>
      )}

      {/* Missing Documents & Verification */}
      {(filter === 'all' || filter === 'missing_docs') && missingDocApps.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3.5 bg-slate-50">
            <FileWarning className="h-4 w-4 text-red-600" />
            <h3 className="font-display text-sm font-bold text-slate-900">
              Incomplete / Pending Document Checklists ({missingDocApps.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {missingDocApps.map(({ app, evalRes }) => (
              <div
                key={app.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {app.id} · {app.workType} ({app.vehicleNumber})
                  </p>
                  <p className="text-xs text-slate-500">
                    {app.clientName} · {getShowroomLabel(showrooms, app.showroomId)} ·{' '}
                    <span className="font-semibold text-red-700">{evalRes.status}</span>
                  </p>
                  {evalRes.missing.length > 0 && (
                    <p className="text-xs text-red-600 mt-0.5">
                      Missing: {evalRes.missing.join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {evalRes.missing[0] && (
                    <button
                      type="button"
                      onClick={() =>
                        onQuickUpload({
                          showroomId: app.showroomId,
                          clientId: app.clientId,
                          vehicleId: app.vehicleId,
                          applicationId: app.id,
                          documentType: evalRes.missing[0],
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload {evalRes.missing[0]}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onNavigate('rto-work', app.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <span>Open App</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overdue Applications */}
      {(filter === 'all' || filter === 'overdue') && overdueApps.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3.5 bg-slate-50">
            <Clock className="h-4 w-4 text-orange-600" />
            <h3 className="font-display text-sm font-bold text-slate-900">
              Overdue RTO Applications ({overdueApps.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {overdueApps.map((app) => (
              <div key={app.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {app.id} · {app.workType} ({app.vehicleNumber})
                  </p>
                  <p className="text-xs text-slate-500">
                    {app.clientName} · {getShowroomLabel(showrooms, app.showroomId)} · Expected:{' '}
                    <span className="font-mono font-semibold text-red-700">
                      {app.expectedCompletionDate}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('rto-work', app.id)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Inspect Work
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insurance Expiry */}
      {(filter === 'all' || filter === 'insurance') && insuranceAlerts.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3.5 bg-slate-50">
            <ShieldAlert className="h-4 w-4 text-red-600" />
            <h3 className="font-display text-sm font-bold text-slate-900">
              Insurance Expiry Alerts ({insuranceAlerts.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {insuranceAlerts.map(({ vehicle, status }) => (
              <div
                key={`ins-${vehicle.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div>
                  <p className="font-mono text-sm font-bold text-slate-900">
                    {vehicle.vehicleNumber}
                  </p>
                  <p className="text-xs text-slate-500">
                    {vehicle.ownerName} · {vehicle.vehicleClass} · Expiry:{' '}
                    <span className="font-mono font-semibold">{vehicle.insuranceExpiry}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                      status === 'expired'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {status === 'expired' ? 'Expired' : 'Expiring <= 30d'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('vehicles', vehicle.vehicleNumber)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Open Vehicle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RC Validity */}
      {(filter === 'all' || filter === 'rc') && rcAlerts.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3.5 bg-slate-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="font-display text-sm font-bold text-slate-900">
              RC Validity Alerts ({rcAlerts.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {rcAlerts.map(({ vehicle, status }) => (
              <div
                key={`rc-${vehicle.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div>
                  <p className="font-mono text-sm font-bold text-slate-900">
                    {vehicle.vehicleNumber}
                  </p>
                  <p className="text-xs text-slate-500">
                    {vehicle.ownerName} · {vehicle.rtoOffice} · RC Valid Till:{' '}
                    <span className="font-mono font-semibold">{vehicle.rcValidity}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                      status === 'expired'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {status === 'expired' ? 'RC Expired' : 'Expiring <= 30d'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('vehicles', vehicle.vehicleNumber)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Open Vehicle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
