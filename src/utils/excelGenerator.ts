import ExcelJS from 'exceljs';
import type { AppDatabase } from './storage';
import {
  computeShowroomRtoSummary,
  evaluateApplicationChecklist,
  getDocumentAlertStatus,
  getShowroomLabel,
  getTodayDateStr,
  maskAadhaar,
  maskPAN,
} from './pureCalculations';

export async function generateKarnatakaRTOWorkbook(db: AppDatabase): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = db.settings.businessName || 'Karnataka RTO Multi-Showroom Document System';
  workbook.lastModifiedBy = 'Karnataka RTO Agent & Multi-Showroom Management System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const todayStr = getTodayDateStr();

  const NAVY_HEADER = '0F172A';
  const BLUE_ACCENT = '1D4ED8';
  const CARD_BG = 'F8FAFC';
  const BORDER_COLOR = 'CBD5E1';
  const SUCCESS_GREEN = '15803D';
  const WARNING_AMBER = 'B45309';
  const DANGER_RED = 'B91C1C';

  // 1. DASHBOARD SHEET (Strictly RTO & Compliance KPIs)
  const dashSheet = workbook.addWorksheet('DASHBOARD', {
    views: [{ showGridLines: true }],
  });

  dashSheet.mergeCells('A1:J2');
  const titleCell = dashSheet.getCell('A1');
  titleCell.value = `${db.settings.businessName} — MULTI-SHOWROOM RTO OPERATIONS DASHBOARD`;
  titleCell.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  dashSheet.mergeCells('A3:J3');
  const subCell = dashSheet.getCell('A3');
  subCell.value = `${db.settings.tagline} | License: ${db.settings.rtoLicenseNumber || 'KA-RTO-AGENT'} | Contact: ${db.settings.mobile} | Generated: ${todayStr}`;
  subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF334155' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CARD_BG } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };

  dashSheet.mergeCells('A5:D5');
  const boHeader = dashSheet.getCell('A5');
  boHeader.value = '1. CENTRALIZED REGISTRY & RTO WORKLOAD';
  boHeader.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  boHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_ACCENT } };

  dashSheet.mergeCells('F5:J5');
  const docHeader = dashSheet.getCell('F5');
  docHeader.value = '2. DOCUMENT COMPLIANCE & EXPIRY SUMMARY';
  docHeader.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  docHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_ACCENT } };

  const incompleteApps = db.applications.filter(
    (a) =>
      a.workStatus !== 'Completed' &&
      a.workStatus !== 'Rejected' &&
      evaluateApplicationChecklist(a, db.documents, db.settings).status === 'Documents Incomplete'
  ).length;
  const underVerificationApps = db.applications.filter(
    (a) =>
      a.workStatus !== 'Completed' &&
      a.workStatus !== 'Rejected' &&
      evaluateApplicationChecklist(a, db.documents, db.settings).status === 'Documents Under Verification'
  ).length;
  const expiredRcCount = db.vehicles.filter(
    (v) => getDocumentAlertStatus(v.rcValidity, todayStr) === 'expired'
  ).length;
  const expiringRcCount = db.vehicles.filter(
    (v) => getDocumentAlertStatus(v.rcValidity, todayStr) === 'expiring_soon'
  ).length;
  const expiredInsCount = db.vehicles.filter(
    (v) => getDocumentAlertStatus(v.insuranceExpiry, todayStr) === 'expired'
  ).length;
  const expiringInsCount = db.vehicles.filter(
    (v) => getDocumentAlertStatus(v.insuranceExpiry, todayStr) === 'expiring_soon'
  ).length;

  const kpiRows = [
    {
      bLabel: 'Total Common Clients',
      bFormula: "=COUNTA('CLIENTS'!A4:A2000)",
      bVal: db.clients.length,
      dLabel: 'Total Tracked Documents',
      dFormula: "=COUNTA('DOCUMENTS'!A4:A2000)",
      dVal: db.documents.length,
      tone: 'normal' as const,
    },
    {
      bLabel: 'Total Registered Vehicles',
      bFormula: "=COUNTA('VEHICLES'!A4:A2000)",
      bVal: db.vehicles.length,
      dLabel: 'Verified Documents',
      dFormula: '=COUNTIF(\'DOCUMENTS\'!L4:L2000, "Verified")',
      dVal: db.documents.filter((d) => d.verificationStatus === 'Verified').length,
      tone: 'success' as const,
    },
    {
      bLabel: 'Partner Showrooms Active',
      bFormula: '=COUNTIF(\'SHOWROOMS\'!H4:H100, "Active")',
      bVal: db.showrooms.filter((s) => s.isActive).length,
      dLabel: 'Applications w/ Missing Docs',
      dFormula: '',
      dVal: incompleteApps,
      tone: 'danger' as const,
    },
    {
      bLabel: 'Total RTO Applications',
      bFormula: "=COUNTA('RTO_APPLICATIONS'!A4:A2000)",
      bVal: db.applications.length,
      dLabel: 'Docs Under Verification',
      dFormula: '=COUNTIF(\'DOCUMENTS\'!L4:L2000, "Pending")',
      dVal: underVerificationApps,
      tone: 'warning' as const,
    },
    {
      bLabel: 'Completed RTO Works',
      bFormula: '=COUNTIF(\'RTO_APPLICATIONS\'!N4:N2000, "Completed")',
      bVal: db.applications.filter((a) => a.workStatus === 'Completed').length,
      dLabel: 'Expired Insurance Policies',
      dFormula: '',
      dVal: expiredInsCount,
      tone: 'danger' as const,
    },
    {
      bLabel: 'Submitted / In Process',
      bFormula: '=COUNTIF(\'RTO_APPLICATIONS\'!N4:N2000, "In Process")+COUNTIF(\'RTO_APPLICATIONS\'!N4:N2000, "Submitted")',
      bVal: db.applications.filter((a) => a.workStatus === 'In Process' || a.workStatus === 'Submitted').length,
      dLabel: 'Insurance Expiring <= 30 Days',
      dFormula: '',
      dVal: expiringInsCount,
      tone: 'warning' as const,
    },
    {
      bLabel: 'New / Docs Pending / Hold',
      bFormula: '=COUNTIF(\'RTO_APPLICATIONS\'!N4:N2000, "New")+COUNTIF(\'RTO_APPLICATIONS\'!N4:N2000, "Documents Pending")+COUNTIF(\'RTO_APPLICATIONS\'!N4:N2000, "On Hold")',
      bVal: db.applications.filter(
        (a) => a.workStatus === 'New' || a.workStatus === 'Documents Pending' || a.workStatus === 'On Hold'
      ).length,
      dLabel: 'RC Expired / Expiring Soon',
      dFormula: '',
      dVal: expiredRcCount + expiringRcCount,
      tone: 'warning' as const,
    },
  ];

  let curRow = 6;
  kpiRows.forEach((item) => {
    dashSheet.mergeCells(`A${curRow}:C${curRow}`);
    const bLbl = dashSheet.getCell(`A${curRow}`);
    bLbl.value = item.bLabel;
    bLbl.font = { name: 'Arial', size: 10, bold: true };
    bLbl.border = {
      top: { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
      left: { style: 'thin', color: { argb: BORDER_COLOR } },
    };

    const bVal = dashSheet.getCell(`D${curRow}`);
    bVal.value = item.bFormula ? { formula: item.bFormula, result: item.bVal } : item.bVal;
    bVal.font = { name: 'Arial', size: 11, bold: true, color: { argb: BLUE_ACCENT } };
    bVal.alignment = { horizontal: 'right' };
    bVal.border = {
      top: { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } },
    };

    dashSheet.mergeCells(`F${curRow}:H${curRow}`);
    const dLbl = dashSheet.getCell(`F${curRow}`);
    dLbl.value = item.dLabel;
    dLbl.font = { name: 'Arial', size: 10, bold: true };
    dLbl.border = {
      top: { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
      left: { style: 'thin', color: { argb: BORDER_COLOR } },
    };

    const dVal = dashSheet.getCell(`I${curRow}`);
    dVal.value = item.dFormula ? { formula: item.dFormula, result: item.dVal } : item.dVal;
    dVal.numFmt = '#,##0';
    const colorMap = {
      normal: BLUE_ACCENT,
      success: SUCCESS_GREEN,
      warning: WARNING_AMBER,
      danger: DANGER_RED,
    };
    dVal.font = { name: 'Arial', size: 11, bold: true, color: { argb: colorMap[item.tone] } };
    dVal.alignment = { horizontal: 'right' };
    dVal.border = {
      top: { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } },
    };

    curRow++;
  });

  // Compliance Alerts table on Dashboard
  dashSheet.mergeCells('A15:J15');
  const alertHeader = dashSheet.getCell('A15');
  alertHeader.value = '3. VEHICLE RC & INSURANCE COMPLIANCE ALERTS';
  alertHeader.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  alertHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };

  const alertCols = ['Vehicle Number', 'Owner / Client', 'Vehicle Class', 'RTO Office', 'RC Validity', 'Insurance Validity', 'Doc Status', 'Action Required'];
  dashSheet.getRow(16).values = alertCols;
  dashSheet.getRow(16).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  dashSheet.getRow(16).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_ACCENT } };

  let alertRowIdx = 17;
  db.vehicles.forEach((v) => {
    const insStatus = getDocumentAlertStatus(v.insuranceExpiry, todayStr);
    const rcStatus = getDocumentAlertStatus(v.rcValidity, todayStr);
    let action = 'Up-to-date';
    if (insStatus === 'expired') action = 'URGENT: Insurance Expired';
    else if (rcStatus === 'expired') action = 'URGENT: RC Validity Expired';
    else if (insStatus === 'expiring_soon') action = 'Insurance Expiring <= 30 Days';
    else if (rcStatus === 'expiring_soon') action = 'RC Expiring <= 30 Days';
    else if (v.documentStatus === 'Pending Verification') action = 'Verify Pending Documents';

    const r = dashSheet.getRow(alertRowIdx);
    r.values = [
      v.vehicleNumber,
      v.ownerName,
      v.vehicleClass,
      v.rtoOffice,
      v.rcValidity || '—',
      v.insuranceExpiry || '—',
      v.documentStatus,
      action,
    ];
    if (insStatus === 'expired' || rcStatus === 'expired') {
      r.font = { color: { argb: DANGER_RED }, bold: true };
    } else if (insStatus === 'expiring_soon' || rcStatus === 'expiring_soon') {
      r.font = { color: { argb: WARNING_AMBER }, bold: true };
    }
    alertRowIdx++;
  });

  dashSheet.columns = [
    { width: 20 },
    { width: 24 },
    { width: 20 },
    { width: 24 },
    { width: 14 },
    { width: 20 },
    { width: 18 },
    { width: 26 },
    { width: 16 },
    { width: 18 },
  ];

  const formatHeader = (sheet: ExcelJS.Worksheet, headers: string[]) => {
    const row = sheet.getRow(3);
    row.values = headers;
    row.height = 26;
    row.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
    row.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.views = [{ state: 'frozen', ySplit: 3, showGridLines: true }];
  };

  // 2. SHOWROOMS SHEET (RTO-Only Breakdown)
  const shwSheet = workbook.addWorksheet('SHOWROOMS');
  shwSheet.mergeCells('A1:N1');
  const shwTitle = shwSheet.getCell('A1');
  shwTitle.value = 'PARTNER SHOWROOMS & RTO WORKLOAD BREAKDOWN';
  shwTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  shwTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  shwTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  formatHeader(shwSheet, [
    'Showroom ID',
    'Code',
    'Showroom Name',
    'City',
    'Manager',
    'Phone',
    'RTO Jurisdiction',
    'Status',
    'Clients Served',
    'Vehicles Served',
    'Total RTO Apps',
    'In Process / Submitted',
    'Completed Apps',
    'Missing Docs Apps',
  ]);

  const branchSummaries = computeShowroomRtoSummary(db.showrooms, db, todayStr);
  branchSummaries.forEach((b) => {
    shwSheet.addRow([
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
    ]);
  });
  shwSheet.columns = [
    { width: 14 },
    { width: 14 },
    { width: 30 },
    { width: 16 },
    { width: 20 },
    { width: 16 },
    { width: 28 },
    { width: 12 },
    { width: 14 },
    { width: 15 },
    { width: 15 },
    { width: 20 },
    { width: 16 },
    { width: 18 },
  ];

  // 3. CLIENTS SHEET (Centralized Common Client Directory)
  const clientSheet = workbook.addWorksheet('CLIENTS');
  clientSheet.mergeCells('A1:M1');
  const cTitle = clientSheet.getCell('A1');
  cTitle.value = 'CENTRALIZED COMMON CLIENT DATABASE (SHARED ACROSS ALL SHOWROOMS)';
  cTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  cTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  cTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  formatHeader(clientSheet, [
    'Client ID',
    'Full Name',
    'Mobile Number',
    'Alternate Mobile',
    'Address',
    'Aadhaar (Masked)',
    'PAN (Masked)',
    'Registration Date',
    'First Registered Showroom',
    'Linked Vehicles',
    'Total RTO Applications',
    'Active / Open Apps',
    'Remarks',
  ]);

  db.clients.forEach((c) => {
    clientSheet.addRow([
      c.id,
      c.name,
      c.mobile,
      c.alternateMobile,
      c.address,
      maskAadhaar(c.aadhaar),
      maskPAN(c.panNumber),
      c.registrationDate,
      c.createdShowroomId ? getShowroomLabel(db.showrooms, c.createdShowroomId) : 'Common',
      { formula: `=COUNTIF('VEHICLES'!B4:B2000, "${c.id}")` },
      { formula: `=COUNTIF('RTO_APPLICATIONS'!B4:B2000, "${c.id}")` },
      { formula: `=COUNTIFS('RTO_APPLICATIONS'!B4:B2000, "${c.id}", 'RTO_APPLICATIONS'!N4:N2000, "<>Completed")` },
      c.remarks,
    ]);
  });
  clientSheet.columns = [
    { width: 14 },
    { width: 24 },
    { width: 16 },
    { width: 16 },
    { width: 34 },
    { width: 18 },
    { width: 16 },
    { width: 16 },
    { width: 24 },
    { width: 15 },
    { width: 18 },
    { width: 18 },
    { width: 32 },
  ];

  // 4. VEHICLES SHEET
  const vehSheet = workbook.addWorksheet('VEHICLES');
  vehSheet.mergeCells('A1:R1');
  const vTitle = vehSheet.getCell('A1');
  vTitle.value = 'CENTRALIZED VEHICLE MASTER REGISTRY';
  vTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  vTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  vTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  formatHeader(vehSheet, [
    'Vehicle ID',
    'Client ID',
    'Registration Number',
    'Owner Name',
    'Vehicle Class',
    'Manufacturer',
    'Model',
    'Mfg Year',
    'Fuel Type',
    'Chassis Number',
    'Engine Number',
    'Registration Date',
    'RC Validity',
    'Insurance Validity',
    'Hypothecation',
    'Financer',
    'RTO Office',
    'Document Status',
  ]);

  db.vehicles.forEach((v) => {
    vehSheet.addRow([
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
      v.hypothecationFinancer || '',
      v.rtoOffice,
      v.documentStatus,
    ]);
  });
  vehSheet.columns = [
    { width: 14 },
    { width: 14 },
    { width: 18 },
    { width: 22 },
    { width: 22 },
    { width: 18 },
    { width: 20 },
    { width: 12 },
    { width: 12 },
    { width: 22 },
    { width: 20 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 22 },
    { width: 28 },
    { width: 18 },
  ];

  // 5. RTO_APPLICATIONS SHEET (Strictly RTO Work — Zero Fee Columns)
  const appSheet = workbook.addWorksheet('RTO_APPLICATIONS');
  appSheet.mergeCells('A1:Q1');
  const aTitle = appSheet.getCell('A1');
  aTitle.value = 'SHOWROOM-WISE RTO WORK APPLICATIONS';
  aTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  aTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  aTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  formatHeader(appSheet, [
    'Application ID',
    'Client ID',
    'Vehicle ID',
    'Showroom',
    'Client Name',
    'Vehicle Number',
    'RTO Work Category',
    'Govt Application No',
    'RTO Office',
    'Application Date',
    'Submission Date',
    'Expected Completion',
    'Completion Date',
    'Work Status',
    'Required Documents Checklist',
    'Work Description',
    'Remarks',
  ]);

  db.applications.forEach((a) => {
    const checklist = evaluateApplicationChecklist(a, db.documents, db.settings);
    appSheet.addRow([
      a.id,
      a.clientId,
      a.vehicleId,
      getShowroomLabel(db.showrooms, a.showroomId),
      a.clientName,
      a.vehicleNumber,
      a.workType,
      a.applicationNumber,
      a.rtoOffice,
      a.applicationDate,
      a.submissionDate,
      a.expectedCompletionDate,
      a.completionDate || '',
      a.workStatus,
      `${checklist.status} (${checklist.uploaded.length}/${checklist.required.length})`,
      a.workDescription || '',
      a.remarks,
    ]);
  });
  appSheet.columns = [
    { width: 16 },
    { width: 14 },
    { width: 14 },
    { width: 24 },
    { width: 22 },
    { width: 18 },
    { width: 24 },
    { width: 22 },
    { width: 28 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
    { width: 16 },
    { width: 18 },
    { width: 28 },
    { width: 30 },
    { width: 32 },
  ];

  // 6. DOCUMENTS SHEET
  const docSheet = workbook.addWorksheet('DOCUMENTS');
  docSheet.mergeCells('A1:O1');
  const dTitle = docSheet.getCell('A1');
  dTitle.value = 'RTO DOCUMENT VAULT & VERIFICATION LEDGER';
  dTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  dTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  dTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  formatHeader(docSheet, [
    'Document ID',
    'Showroom',
    'Application ID',
    'Client ID',
    'Client Name',
    'Vehicle Number',
    'Document Category',
    'Document Number',
    'Issue Date',
    'Expiry Date',
    'Custody Status',
    'Verification Status',
    'File Name',
    'File Reference / URL',
    'Remarks',
  ]);

  db.documents.forEach((d) => {
    docSheet.addRow([
      d.id,
      getShowroomLabel(db.showrooms, d.showroomId),
      d.applicationId || '—',
      d.clientId,
      d.clientName,
      d.vehicleNumber,
      d.documentType,
      d.documentNumber,
      d.issueDate,
      d.expiryDate,
      d.receivedStatus,
      d.verificationStatus,
      d.fileName || '—',
      d.downloadUrl || d.filePathOrReference,
      d.remarks,
    ]);
  });
  docSheet.columns = [
    { width: 14 },
    { width: 22 },
    { width: 16 },
    { width: 14 },
    { width: 22 },
    { width: 18 },
    { width: 20 },
    { width: 22 },
    { width: 14 },
    { width: 14 },
    { width: 18 },
    { width: 18 },
    { width: 26 },
    { width: 36 },
    { width: 30 },
  ];

  // 7. APPLICATION_HISTORY SHEET
  const hisSheet = workbook.addWorksheet('APPLICATION_HISTORY');
  hisSheet.mergeCells('A1:H1');
  const hTitle = hisSheet.getCell('A1');
  hTitle.value = 'APPLICATION STATUS & AUDIT HISTORY';
  hTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  hTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  hTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  formatHeader(hisSheet, [
    'History ID',
    'Application ID',
    'Showroom',
    'Previous Status',
    'New Status',
    'Action Summary',
    'Note',
    'Timestamp',
  ]);

  db.applicationHistory.forEach((h) => {
    hisSheet.addRow([
      h.id,
      h.applicationId,
      getShowroomLabel(db.showrooms, h.showroomId),
      h.previousStatus || '—',
      h.newStatus,
      h.actionSummary,
      h.note,
      h.changedAt,
    ]);
  });
  hisSheet.columns = [
    { width: 14 },
    { width: 16 },
    { width: 24 },
    { width: 18 },
    { width: 18 },
    { width: 28 },
    { width: 36 },
    { width: 22 },
  ];

  // 8. SETTINGS SHEET
  const setSheet = workbook.addWorksheet('SETTINGS');
  setSheet.mergeCells('A1:D1');
  const sTitle = setSheet.getCell('A1');
  sTitle.value = 'SYSTEM CONFIGURATION & RTO LOOKUP LISTS';
  sTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  sTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  sTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  formatHeader(setSheet, [
    'Karnataka RTO Offices',
    'Vehicle Classes',
    'RTO Work Categories',
    'Application Statuses',
  ]);

  const maxLen = Math.max(
    db.settings.rtoOffices.length,
    db.settings.vehicleClasses.length,
    db.settings.workTypes.length,
    db.settings.applicationStatuses.length
  );

  for (let i = 0; i < maxLen; i++) {
    setSheet.addRow([
      db.settings.rtoOffices[i] || '',
      db.settings.vehicleClasses[i] || '',
      db.settings.workTypes[i] || '',
      db.settings.applicationStatuses[i] || '',
    ]);
  }
  setSheet.columns = [
    { width: 38 },
    { width: 26 },
    { width: 28 },
    { width: 24 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
