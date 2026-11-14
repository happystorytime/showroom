import type { AppDatabase } from './storage';
import {
  computeShowroomRtoSummary,
  evaluateApplicationChecklist,
  getShowroomLabel,
  getTodayDateStr,
  maskAadhaar,
  maskPAN,
} from './pureCalculations';

export interface GoogleSheetsSyncResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  updatedSheets: string[];
}

export async function createAndSyncGoogleSpreadsheet(
  accessToken: string,
  db: AppDatabase,
  existingSpreadsheetId?: string
): Promise<GoogleSheetsSyncResult> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  let spreadsheetId = existingSpreadsheetId;
  let spreadsheetUrl = '';

  const sheetTitles = [
    'DASHBOARD',
    'SHOWROOMS',
    'CLIENTS',
    'VEHICLES',
    'RTO_APPLICATIONS',
    'DOCUMENTS',
    'APPLICATION_HISTORY',
  ];

  if (!spreadsheetId) {
    const title = `${db.settings.businessName} - Live RTO Cloud Database`;
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        properties: { title },
        sheets: sheetTitles.map((t) => ({
          properties: { title: t, gridProperties: { rowCount: 400, columnCount: 20 } },
        })),
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(err.error?.message || 'Failed to create Google Spreadsheet');
    }

    const createdData = await createRes.json();
    spreadsheetId = createdData.spreadsheetId;
    spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  } else {
    spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  }

  const todayStr = getTodayDateStr();
  const valueData: { range: string; values: (string | number)[][] }[] = [];

  const completedCount = db.applications.filter((a) => a.workStatus === 'Completed').length;
  const inProcessCount = db.applications.filter(
    (a) => a.workStatus === 'In Process' || a.workStatus === 'Submitted'
  ).length;
  const pendingCount = db.applications.filter(
    (a) =>
      a.workStatus === 'New' ||
      a.workStatus === 'Documents Pending' ||
      a.workStatus === 'Ready to Submit' ||
      a.workStatus === 'On Hold'
  ).length;
  const missingDocApps = db.applications.filter(
    (a) =>
      a.workStatus !== 'Completed' &&
      a.workStatus !== 'Rejected' &&
      evaluateApplicationChecklist(a, db.documents, db.settings).status === 'Documents Incomplete'
  ).length;

  valueData.push({
    range: 'DASHBOARD!A1:E12',
    values: [
      [db.settings.businessName, '', '', '', ''],
      [`Last Synced: ${new Date().toLocaleString()}`, '', '', '', ''],
      ['RTO OPERATIONS SUMMARY', '', '', 'DOCUMENT COMPLIANCE', ''],
      ['Metric', 'Count', '', 'Metric', 'Count'],
      ['Total Common Clients', db.clients.length, '', 'Total Tracked Documents', db.documents.length],
      ['Total Vehicles', db.vehicles.length, '', 'Verified Documents', db.documents.filter((d) => d.verificationStatus === 'Verified').length],
      ['Partner Showrooms', db.showrooms.length, '', 'Pending Verification', db.documents.filter((d) => d.verificationStatus === 'Pending').length],
      ['Total RTO Applications', db.applications.length, '', 'Apps Missing Documents', missingDocApps],
      ['Completed Applications', completedCount, '', 'Rejected Applications', db.applications.filter((a) => a.workStatus === 'Rejected').length],
      ['Submitted / In Process', inProcessCount, '', 'New / Pending / Hold', pendingCount],
    ],
  });

  const branchSummaries = computeShowroomRtoSummary(db.showrooms, db, todayStr);
  const showroomRows = [
    [
      'Showroom ID',
      'Code',
      'Name',
      'City',
      'Manager',
      'Phone',
      'RTO Jurisdiction',
      'Status',
      'Clients Served',
      'Vehicles Served',
      'Total RTO Apps',
      'In Process',
      'Completed',
      'Missing Docs Apps',
    ],
    ...branchSummaries.map((b) => [
      b.showroom.id,
      b.showroom.code,
      b.showroom.name,
      b.showroom.city,
      b.showroom.managerName,
      b.showroom.phone,
      b.showroom.rtoJurisdiction,
      b.showroom.isActive ? 'Active' : 'Inactive',
      b.uniqueClientsCount,
      b.uniqueVehiclesCount,
      b.applicationsCount,
      b.inProcessCount,
      b.completedCount,
      b.missingDocsAppsCount,
    ]),
  ];
  valueData.push({ range: `SHOWROOMS!A1:N${showroomRows.length}`, values: showroomRows });

  const clientRows = [
    ['Client ID', 'Full Name', 'Mobile', 'Alternate Mobile', 'Address', 'Aadhaar (Masked)', 'PAN (Masked)', 'Reg Date', 'Origin Branch', 'Remarks'],
    ...db.clients.map((c) => [
      c.id,
      c.name,
      c.mobile,
      c.alternateMobile,
      c.address,
      maskAadhaar(c.aadhaar),
      maskPAN(c.panNumber),
      c.registrationDate,
      c.createdShowroomId ? getShowroomLabel(db.showrooms, c.createdShowroomId) : 'Common',
      c.remarks,
    ]),
  ];
  valueData.push({ range: `CLIENTS!A1:J${clientRows.length}`, values: clientRows });

  const vehRows = [
    [
      'Vehicle ID',
      'Client ID',
      'Reg Number',
      'Owner Name',
      'Vehicle Class',
      'Manufacturer',
      'Model',
      'Year',
      'Fuel Type',
      'Chassis',
      'Engine',
      'Reg Date',
      'RC Validity',
      'Insurance Validity',
      'Hypothecation',
      'RTO Office',
      'Doc Status',
    ],
    ...db.vehicles.map((v) => [
      v.id,
      v.clientId,
      v.vehicleNumber,
      v.ownerName,
      v.vehicleClass,
      v.manufacturer,
      v.model,
      v.manufacturingYear,
      v.fuelType,
      v.chassisNumber,
      v.engineNumber,
      v.registrationDate,
      v.rcValidity,
      v.insuranceExpiry,
      v.hypothecationStatus,
      v.rtoOffice,
      v.documentStatus,
    ]),
  ];
  valueData.push({ range: `VEHICLES!A1:Q${vehRows.length}`, values: vehRows });

  const appRows = [
    [
      'Application ID',
      'Showroom',
      'Client ID',
      'Client Name',
      'Vehicle ID',
      'Vehicle Number',
      'Work Category',
      'Govt App No',
      'RTO Office',
      'App Date',
      'Submission Date',
      'Expected Completion',
      'Completion Date',
      'Status',
      'Checklist',
      'Remarks',
    ],
    ...db.applications.map((a) => {
      const evalRes = evaluateApplicationChecklist(a, db.documents, db.settings);
      return [
        a.id,
        getShowroomLabel(db.showrooms, a.showroomId),
        a.clientId,
        a.clientName,
        a.vehicleId,
        a.vehicleNumber,
        a.workType,
        a.applicationNumber,
        a.rtoOffice,
        a.applicationDate,
        a.submissionDate,
        a.expectedCompletionDate,
        a.completionDate || '',
        a.workStatus,
        `${evalRes.status} (${evalRes.uploaded.length}/${evalRes.required.length})`,
        a.remarks,
      ];
    }),
  ];
  valueData.push({ range: `RTO_APPLICATIONS!A1:P${appRows.length}`, values: appRows });

  const docRows = [
    [
      'Document ID',
      'Showroom',
      'Application ID',
      'Client ID',
      'Client Name',
      'Vehicle Number',
      'Document Category',
      'Doc Number',
      'Issue Date',
      'Expiry Date',
      'Custody Status',
      'Verification',
      'File Name',
      'File Link / Reference',
      'Remarks',
    ],
    ...db.documents.map((d) => [
      d.id,
      getShowroomLabel(db.showrooms, d.showroomId),
      d.applicationId || '',
      d.clientId,
      d.clientName,
      d.vehicleNumber,
      d.documentType,
      d.documentNumber,
      d.issueDate,
      d.expiryDate,
      d.receivedStatus,
      d.verificationStatus,
      d.fileName || '',
      d.downloadUrl || d.filePathOrReference,
      d.remarks,
    ]),
  ];
  valueData.push({ range: `DOCUMENTS!A1:O${docRows.length}`, values: docRows });

  const historyRows = [
    ['History ID', 'Application ID', 'Showroom', 'Previous Status', 'New Status', 'Summary', 'Note', 'Timestamp'],
    ...db.applicationHistory.map((h) => [
      h.id,
      h.applicationId,
      getShowroomLabel(db.showrooms, h.showroomId),
      h.previousStatus || '—',
      h.newStatus,
      h.actionSummary,
      h.note,
      h.changedAt,
    ]),
  ];
  valueData.push({ range: `APPLICATION_HISTORY!A1:H${historyRows.length}`, values: historyRows });

  const batchRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: valueData,
      }),
    }
  );

  if (!batchRes.ok) {
    const err = await batchRes.json();
    throw new Error(err.error?.message || 'Failed to update Google Sheets data');
  }

  if (!spreadsheetId) {
    throw new Error('Spreadsheet ID was not generated');
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    updatedSheets: sheetTitles,
  };
}
