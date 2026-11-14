import React, { useMemo, useState } from 'react';
import { FileSpreadsheet, Printer, FileDown } from 'lucide-react';
import type { AppDatabase } from '../utils/storage';
import {
  computeShowroomRtoSummary,
  evaluateApplicationChecklist,
  filterByShowroom,
  getShowroomLabel,
  getTodayDateStr,
} from '../utils/pureCalculations';
import { exportGeneralReportPDF } from '../utils/pdfGenerator';

interface ReportsManagerProps {
  db: AppDatabase;
  activeShowroomId: string;
  onExportExcel: () => Promise<void>;
}

type ReportId =
  | 'showroom-rto'
  | 'client-history'
  | 'pending-apps'
  | 'completed-apps'
  | 'missing-docs'
  | 'vehicle-docs'
  | 'monthly-rto';

export const ReportsManager: React.FC<ReportsManagerProps> = ({
  db,
  activeShowroomId,
  onExportExcel,
}) => {
  const todayStr = getTodayDateStr();
  const [selectedReport, setSelectedReport] = useState<ReportId>('showroom-rto');
  const [reportMonth, setReportMonth] = useState(todayStr.slice(0, 7)); // YYYY-MM

  const scopedApps = useMemo(
    () => filterByShowroom(db.applications, activeShowroomId),
    [db.applications, activeShowroomId]
  );

  const reportPayload = useMemo<{
    title: string;
    subtitle: string;
    columns: string[];
    rows: (string | number)[][];
  }>(() => {
    switch (selectedReport) {
      case 'showroom-rto': {
        const summaries = computeShowroomRtoSummary(db.showrooms, db, todayStr);
        return {
          title: 'Showroom-Wise RTO Work Summary',
          subtitle: `Partner showrooms tracked: ${db.showrooms.length}`,
          columns: [
            'Showroom Code',
            'Showroom Name',
            'City',
            'Clients Served',
            'Total Apps',
            'In Process',
            'Completed',
            'Missing Docs',
          ],
          rows: summaries.map((s) => [
            s.showroom.code,
            s.showroom.name,
            s.showroom.city,
            s.uniqueClientsCount,
            s.applicationsCount,
            s.inProcessCount,
            s.completedCount,
            s.missingDocsAppsCount,
          ]),
        };
      }

      case 'client-history': {
        return {
          title: 'Client-Wise RTO Work & Showroom History',
          subtitle: `Centralized common clients: ${db.clients.length}`,
          columns: [
            'Client ID',
            'Full Name',
            'Mobile',
            'Vehicles',
            'Total Apps',
            'Showrooms Used',
            'Latest RTO Work',
          ],
          rows: db.clients.map((c) => {
            const vehs = db.vehicles.filter((v) => v.clientId === c.id);
            const apps = db.applications.filter((a) => a.clientId === c.id);
            const branches = Array.from(
              new Set(apps.map((a) => getShowroomLabel(db.showrooms, a.showroomId)))
            ).join(', ');
            const latest = [...apps].sort((a, b) =>
              (b.applicationDate || '').localeCompare(a.applicationDate || '')
            )[0];
            return [
              c.id,
              c.name,
              c.mobile,
              vehs.map((v) => v.vehicleNumber).join(', ') || '—',
              apps.length,
              branches || 'None',
              latest ? `${latest.workType} (${latest.workStatus})` : '—',
            ];
          }),
        };
      }

      case 'pending-apps': {
        const pending = scopedApps.filter(
          (a) => a.workStatus !== 'Completed' && a.workStatus !== 'Rejected'
        );
        return {
          title: 'Pending & In-Process RTO Applications',
          subtitle: `Open applications: ${pending.length}`,
          columns: [
            'App ID',
            'Showroom',
            'Client Name',
            'Vehicle No',
            'Work Category',
            'RTO Office',
            'Target Date',
            'Status',
          ],
          rows: pending.map((a) => [
            a.id,
            getShowroomLabel(db.showrooms, a.showroomId),
            a.clientName,
            a.vehicleNumber,
            a.workType,
            a.rtoOffice,
            a.expectedCompletionDate || '—',
            a.workStatus,
          ]),
        };
      }

      case 'completed-apps': {
        const completed = scopedApps.filter((a) => a.workStatus === 'Completed');
        return {
          title: 'Completed RTO Applications Report',
          subtitle: `Total completed: ${completed.length}`,
          columns: [
            'App ID',
            'Showroom',
            'Client Name',
            'Vehicle No',
            'Work Category',
            'Govt App No',
            'App Date',
            'Completion Date',
          ],
          rows: completed.map((a) => [
            a.id,
            getShowroomLabel(db.showrooms, a.showroomId),
            a.clientName,
            a.vehicleNumber,
            a.workType,
            a.applicationNumber || '—',
            a.applicationDate,
            a.completionDate || a.updatedAt.slice(0, 10),
          ]),
        };
      }

      case 'missing-docs': {
        const incomplete = scopedApps
          .filter((a) => a.workStatus !== 'Completed' && a.workStatus !== 'Rejected')
          .map((a) => ({
            app: a,
            evalRes: evaluateApplicationChecklist(a, db.documents, db.settings),
          }))
          .filter((x) => x.evalRes.status !== 'Documents Complete');

        return {
          title: 'Missing & Pending Verification Documents Report',
          subtitle: `Applications needing document action: ${incomplete.length}`,
          columns: [
            'App ID',
            'Showroom',
            'Client',
            'Vehicle No',
            'Work Category',
            'Checklist Status',
            'Missing Docs',
            'Pending Verification',
          ],
          rows: incomplete.map(({ app, evalRes }) => [
            app.id,
            getShowroomLabel(db.showrooms, app.showroomId),
            app.clientName,
            app.vehicleNumber,
            app.workType,
            evalRes.status,
            evalRes.missing.join(', ') || 'None',
            evalRes.pendingVerification.join(', ') || 'None',
          ]),
        };
      }

      case 'vehicle-docs': {
        return {
          title: 'Vehicle Document & Validity Report',
          subtitle: `Registered vehicles: ${db.vehicles.length}`,
          columns: [
            'Vehicle No',
            'Owner',
            'Class',
            'RTO Office',
            'RC Validity',
            'Insurance Validity',
            'Hypothecation',
            'Doc Status',
          ],
          rows: db.vehicles.map((v) => [
            v.vehicleNumber,
            v.ownerName,
            v.vehicleClass,
            v.rtoOffice,
            v.rcValidity || '—',
            v.insuranceExpiry || '—',
            v.hypothecationStatus,
            v.documentStatus,
          ]),
        };
      }

      case 'monthly-rto': {
        const monthly = scopedApps.filter((a) => (a.applicationDate || '').startsWith(reportMonth));
        return {
          title: `Monthly RTO Workload Report (${reportMonth})`,
          subtitle: `Applications filed in ${reportMonth}: ${monthly.length}`,
          columns: [
            'App ID',
            'Date',
            'Showroom',
            'Client Name',
            'Vehicle No',
            'Work Category',
            'RTO Office',
            'Status',
          ],
          rows: monthly.map((a) => [
            a.id,
            a.applicationDate,
            getShowroomLabel(db.showrooms, a.showroomId),
            a.clientName,
            a.vehicleNumber,
            a.workType,
            a.rtoOffice,
            a.workStatus,
          ]),
        };
      }
    }
  }, [selectedReport, db, scopedApps, reportMonth, todayStr]);

  const reportTabs: { id: ReportId; label: string }[] = [
    { id: 'showroom-rto', label: '1. Showroom RTO Summary' },
    { id: 'client-history', label: '2. Client History' },
    { id: 'pending-apps', label: '3. Pending Applications' },
    { id: 'completed-apps', label: '4. Completed Applications' },
    { id: 'missing-docs', label: '5. Missing Documents' },
    { id: 'vehicle-docs', label: '6. Vehicle Validity' },
    { id: 'monthly-rto', label: '7. Monthly RTO Report' },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              RTO Operational & Compliance Reports
            </h2>
            <p className="text-xs text-slate-500">
              Export formatted multi-showroom RTO reports to PDF, Excel (.xlsx), or print directly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onExportExcel}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export Full .XLSX</span>
            </button>
            <button
              type="button"
              onClick={() =>
                exportGeneralReportPDF(
                  reportPayload.title,
                  reportPayload.columns,
                  reportPayload.rows,
                  db.settings,
                  reportPayload.subtitle
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <FileDown className="h-4 w-4" />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {reportTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedReport(t.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                selectedReport === t.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {selectedReport === 'monthly-rto' && (
          <div className="flex items-center gap-2 pt-1">
            <label className="text-xs font-semibold text-slate-700">Select Month:</label>
            <input
              type="month"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono"
            />
          </div>
        )}
      </div>

      {/* Report Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-display text-base font-bold text-slate-900">
            {reportPayload.title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{reportPayload.subtitle}</p>
        </div>

        {reportPayload.rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No records available for this report.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {reportPayload.columns.map((col) => (
                    <th key={col} className="px-4 py-3 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportPayload.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-2.5 text-slate-700">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
