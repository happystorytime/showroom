import ExcelJS from 'exceljs';
import { AppDatabase } from './storage';
import { maskAadhaar } from './pureCalculations';

export async function generateKarnatakaRTOWorkbook(db: AppDatabase): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Shree Maruthi RTO Consultancy & Tractor Showroom';
  workbook.lastModifiedBy = 'Karnataka RTO Management System';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Color Palette
  const NAVY_HEADER = '1E3A8A'; // Primary brand navy blue
  const NAVY_SUB = '0F172A';
  const CARD_BG = 'F1F5F9';
  const BORDER_COLOR = 'CBD5E1';
  const SUCCESS_GREEN = '15803D';
  const WARNING_AMBER = 'B45309';
  const DANGER_RED = 'B91C1C';

  // 1. DASHBOARD SHEET
  const dashSheet = workbook.addWorksheet('DASHBOARD', {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  dashSheet.mergeCells('A1:J2');
  const titleCell = dashSheet.getCell('A1');
  titleCell.value = `${db.settings.businessName} - EXECUTIVE MANAGEMENT DASHBOARD`;
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: NAVY_HEADER },
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Subtitle
  dashSheet.mergeCells('A3:J3');
  const subCell = dashSheet.getCell('A3');
  subCell.value = `${db.settings.tagline} | Contact: ${db.settings.mobile} | ${db.settings.address}`;
  subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF334155' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CARD_BG } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Section 1: Business Overview KPI Header
  dashSheet.mergeCells('A5:D5');
  const boHeader = dashSheet.getCell('A5');
  boHeader.value = '📊 1. BUSINESS OVERVIEW (OPERATIONAL METRICS)';
  boHeader.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  boHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_SUB } };

  // Section 2: Financial Overview KPI Header
  dashSheet.mergeCells('F5:J5');
  const foHeader = dashSheet.getCell('F5');
  foHeader.value = '💰 2. FINANCIAL OVERVIEW (COLLECTIONS & REVENUE)';
  foHeader.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  foHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_SUB } };

  // Metrics Data Rows
  const kpiRows = [
    {
      bLabel: 'Total Registered Clients',
      bFormula: "=COUNTA('CLIENTS'!A4:A500)",
      bVal: db.clients.length,
      fLabel: 'Total Revenue / Fees Billed',
      fFormula: "=SUM('RTO_APPLICATIONS'!L4:L500)",
      fVal: db.applications.reduce((acc, a) => acc + (a.totalFees || 0), 0),
      isCurrency: true,
    },
    {
      bLabel: 'Total Vehicles Enrolled',
      bFormula: "=COUNTA('VEHICLES'!A4:A500)",
      bVal: db.vehicles.length,
      fLabel: 'Total Payments Received (Income)',
      fFormula: "=SUM('PAYMENTS'!K4:K500)",
      fVal: db.payments.reduce((acc, p) => acc + (p.totalPaid || 0), 0),
      isCurrency: true,
    },
    {
      bLabel: 'Total Tractor Inventory',
      bFormula: "=COUNTA('TRACTOR_STOCK'!A4:A500)",
      bVal: db.tractors.length,
      fLabel: 'Total Business Expenses',
      fFormula: "=SUM('EXPENSES'!E4:E500)",
      fVal: db.expenses.reduce((acc, e) => acc + (e.amount || 0), 0),
      isCurrency: true,
    },
    {
      bLabel: 'Total RTO Applications',
      bFormula: "=COUNTA('RTO_APPLICATIONS'!A4:A500)",
      bVal: db.applications.length,
      fLabel: 'Net Business Profit',
      fFormula: '=I7-I8',
      fVal:
        db.payments.reduce((acc, p) => acc + (p.totalPaid || 0), 0) -
        db.expenses.reduce((acc, e) => acc + (e.amount || 0), 0),
      isCurrency: true,
      highlight: true,
    },
    {
      bLabel: 'Completed RTO Works',
      bFormula: '=COUNTIF(\'RTO_APPLICATIONS\'!O4:O500, "Completed")',
      bVal: db.applications.filter((a) => a.workStatus === 'Completed').length,
      fLabel: 'Outstanding Pending Balance',
      fFormula: "=SUM('RTO_APPLICATIONS'!N4:N500)",
      fVal: db.applications.reduce((acc, a) => acc + (a.balanceAmount || 0), 0),
      isCurrency: true,
      isPending: true,
    },
    {
      bLabel: 'Processing RTO Works',
      bFormula: '=COUNTIF(\'RTO_APPLICATIONS\'!O4:O500, "Processing")',
      bVal: db.applications.filter((a) => a.workStatus === 'Processing').length,
      fLabel: 'Total Advance Payments Received',
      fFormula: "=SUM('PAYMENTS'!I4:I500)",
      fVal: db.payments.reduce((acc, p) => acc + (p.advancePayment || 0), 0),
      isCurrency: true,
    },
    {
      bLabel: 'Pending / New Applications',
      bFormula: '=COUNTIF(\'RTO_APPLICATIONS\'!O4:O500, "Pending")+COUNTIF(\'RTO_APPLICATIONS\'!O4:O500, "New")',
      bVal: db.applications.filter((a) => a.workStatus === 'Pending' || a.workStatus === 'New').length,
      fLabel: 'Total Tractor Loans Sanctioned',
      fFormula: "=SUM('LOANS'!F4:F500)",
      fVal: db.loans.reduce((acc, l) => acc + (l.loanAmount || 0), 0),
      isCurrency: true,
    },
  ];

  let curRow = 6;
  kpiRows.forEach((item) => {
    // Business Overview
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
    bVal.value = { formula: item.bFormula, result: item.bVal };
    bVal.font = { name: 'Arial', size: 11, bold: true, color: { argb: NAVY_HEADER } };
    bVal.alignment = { horizontal: 'right' };
    bVal.border = {
      top: { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } },
    };

    // Financial Overview
    dashSheet.mergeCells(`F${curRow}:H${curRow}`);
    const fLbl = dashSheet.getCell(`F${curRow}`);
    fLbl.value = item.fLabel;
    fLbl.font = { name: 'Arial', size: 10, bold: true };
    fLbl.border = {
      top: { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
      left: { style: 'thin', color: { argb: BORDER_COLOR } },
    };

    const fVal = dashSheet.getCell(`I${curRow}`);
    fVal.value = { formula: item.fFormula, result: item.fVal };
    fVal.numFmt = item.isCurrency ? '₹#,##0.00' : '#,##0';
    fVal.font = {
      name: 'Arial',
      size: 11,
      bold: true,
      color: { argb: item.isPending ? DANGER_RED : item.highlight ? SUCCESS_GREEN : NAVY_HEADER },
    };
    fVal.alignment = { horizontal: 'right' };
    fVal.border = {
      top: { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } },
    };

    curRow++;
  });

  // Section 3: Critical Document & Compliance Alerts
  dashSheet.mergeCells('A14:J14');
  const alertHeader = dashSheet.getCell('A14');
  alertHeader.value = '⚠️ 3. DOCUMENT, COMPLIANCE & EXPIRY ALERTS';
  alertHeader.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  alertHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_SUB } };

  const alertCols = ['Vehicle Number', 'Owner / Client', 'Type', 'RC Expiry', 'Insurance Expiry', 'Doc Status', 'Action Required'];
  dashSheet.getRow(15).values = alertCols;
  dashSheet.getRow(15).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  dashSheet.getRow(15).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };

  let alertRowIdx = 16;
  db.vehicles.forEach((v) => {
    const isInsExpired = new Date(v.insuranceExpiry) < new Date();
    const isRCExpired = new Date(v.rcValidity) < new Date();
    let action = 'Up-to-date';
    if (isInsExpired) action = 'URGENT: Renew Insurance Policy';
    else if (isRCExpired) action = 'URGENT: Apply for RC Renewal';
    else if (v.documentStatus === 'Pending Verification') action = 'Verify Pending Documents';

    const r = dashSheet.getRow(alertRowIdx);
    r.values = [v.vehicleNumber, v.ownerName, v.vehicleType, v.rcValidity, v.insuranceExpiry, v.documentStatus, action];
    if (isInsExpired || isRCExpired) {
      r.font = { color: { argb: DANGER_RED }, bold: true };
    }
    alertRowIdx++;
  });

  dashSheet.columns = [
    { width: 18 },
    { width: 22 },
    { width: 18 },
    { width: 16 },
    { width: 6 },
    { width: 24 },
    { width: 18 },
    { width: 16 },
    { width: 18 },
    { width: 26 },
  ];

  // Helper to format table headers
  const formatHeader = (sheet: ExcelJS.Worksheet, headers: string[]) => {
    const row = sheet.getRow(3);
    row.values = headers;
    row.height = 26;
    row.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: NAVY_HEADER },
    };
    row.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.views = [{ state: 'frozen', ySplit: 3, showGridLines: true }];
  };

  // 2. CLIENTS SHEET
  const clientSheet = workbook.addWorksheet('CLIENTS');
  clientSheet.mergeCells('A1:L1');
  const cTitle = clientSheet.getCell('A1');
  cTitle.value = 'REGISTERED CLIENT MASTER DATABASE';
  cTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  cTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  cTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  const clientHeaders = [
    'Client ID',
    'Client Name',
    'Mobile Number',
    'Alternate Number',
    'Address',
    'Aadhaar Number (Masked)',
    'Registration Date',
    'Total Vehicles',
    'Total Applications',
    'Total Payments',
    'Outstanding Balance',
    'Client Remarks',
  ];
  formatHeader(clientSheet, clientHeaders);

  db.clients.forEach((c, idx) => {
    const rowNum = idx + 4;
    clientSheet.addRow([
      c.id,
      c.name,
      c.mobile,
      c.alternateMobile,
      c.address,
      maskAadhaar(c.aadhaar),
      c.registrationDate,
      { formula: `=COUNTIF('VEHICLES'!B4:B500, "${c.id}")` },
      { formula: `=COUNTIF('RTO_APPLICATIONS'!B4:B500, "${c.id}")` },
      { formula: `=SUMIF('PAYMENTS'!C4:C500, "${c.id}", 'PAYMENTS'!K4:K500)` },
      { formula: `=SUMIF('RTO_APPLICATIONS'!B4:B500, "${c.id}", 'RTO_APPLICATIONS'!N4:N500)` },
      c.remarks,
    ]);
    const r = clientSheet.getRow(rowNum);
    r.getCell(10).numFmt = '₹#,##0.00';
    r.getCell(11).numFmt = '₹#,##0.00';
  });
  clientSheet.columns = [
    { width: 14 },
    { width: 24 },
    { width: 16 },
    { width: 16 },
    { width: 35 },
    { width: 18 },
    { width: 16 },
    { width: 14 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
    { width: 35 },
  ];

  // 3. VEHICLES SHEET
  const vehSheet = workbook.addWorksheet('VEHICLES');
  vehSheet.mergeCells('A1:O1');
  const vTitle = vehSheet.getCell('A1');
  vTitle.value = 'VEHICLE MASTER DATABASE';
  vTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  vTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  vTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  const vehHeaders = [
    'Vehicle ID',
    'Client ID',
    'Vehicle Number',
    'Owner Name',
    'Vehicle Type',
    'Brand',
    'Model',
    'Mfg Year',
    'Chassis Number',
    'Engine Number',
    'Fuel Type',
    'Registration Date',
    'RC Validity',
    'Insurance Expiry',
    'Document Status',
  ];
  formatHeader(vehSheet, vehHeaders);

  db.vehicles.forEach((v) => {
    vehSheet.addRow([
      v.id,
      v.clientId,
      v.vehicleNumber,
      v.ownerName,
      v.vehicleType,
      v.brand,
      v.model,
      v.manufacturingYear,
      v.chassisNumber,
      v.engineNumber,
      v.fuelType,
      v.registrationDate,
      v.rcValidity,
      v.insuranceExpiry,
      v.documentStatus,
    ]);
  });
  vehSheet.columns = [
    { width: 14 },
    { width: 14 },
    { width: 18 },
    { width: 22 },
    { width: 18 },
    { width: 16 },
    { width: 22 },
    { width: 12 },
    { width: 22 },
    { width: 18 },
    { width: 12 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 20 },
  ];

  // 4. RTO_APPLICATIONS SHEET
  const appSheet = workbook.addWorksheet('RTO_APPLICATIONS');
  appSheet.mergeCells('A1:P1');
  const aTitle = appSheet.getCell('A1');
  aTitle.value = 'RTO WORK MANAGEMENT DATABASE';
  aTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  aTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  aTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  const appHeaders = [
    'Application ID',
    'Client ID',
    'Vehicle ID',
    'Client Name',
    'Vehicle Number',
    'Work Type',
    'Application Number',
    'RTO Office',
    'Application Date',
    'Submission Date',
    'Expected Completion',
    'Total Fees (₹)',
    'Advance Paid (₹)',
    'Balance Amount (₹)',
    'Work Status',
    'Remarks',
  ];
  formatHeader(appSheet, appHeaders);

  db.applications.forEach((a, idx) => {
    const rowNum = idx + 4;
    appSheet.addRow([
      a.id,
      a.clientId,
      a.vehicleId,
      a.clientName,
      a.vehicleNumber,
      a.workType,
      a.applicationNumber,
      a.rtoOffice,
      a.applicationDate,
      a.submissionDate,
      a.expectedCompletionDate,
      a.totalFees,
      a.advancePaid,
      { formula: `=L${rowNum}-M${rowNum}` },
      a.workStatus,
      a.remarks,
    ]);
    const r = appSheet.getRow(rowNum);
    r.getCell(12).numFmt = '₹#,##0.00';
    r.getCell(13).numFmt = '₹#,##0.00';
    r.getCell(14).numFmt = '₹#,##0.00';
  });
  appSheet.columns = [
    { width: 16 },
    { width: 14 },
    { width: 14 },
    { width: 22 },
    { width: 18 },
    { width: 22 },
    { width: 22 },
    { width: 28 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 35 },
  ];

  // 5. DOCUMENTS SHEET
  const docSheet = workbook.addWorksheet('DOCUMENTS');
  docSheet.mergeCells('A1:M1');
  const dTitle = docSheet.getCell('A1');
  dTitle.value = 'VEHICLE & RTO DOCUMENT MANAGEMENT';
  dTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  dTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  dTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  const docHeaders = [
    'Document ID',
    'Client ID',
    'Vehicle ID',
    'Vehicle Number',
    'Client Name',
    'Document Type',
    'Document Number',
    'Issue Date',
    'Expiry Date',
    'Received Status',
    'Verification Status',
    'File Reference',
    'Remarks',
  ];
  formatHeader(docSheet, docHeaders);

  db.documents.forEach((d) => {
    docSheet.addRow([
      d.id,
      d.clientId,
      d.vehicleId,
      d.vehicleNumber,
      d.clientName,
      d.documentType,
      d.documentNumber,
      d.issueDate,
      d.expiryDate,
      d.receivedStatus,
      d.verificationStatus,
      d.filePathOrReference,
      d.remarks,
    ]);
  });
  docSheet.columns = [
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 18 },
    { width: 22 },
    { width: 20 },
    { width: 24 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
    { width: 18 },
    { width: 26 },
    { width: 35 },
  ];

  // 6. TRACTOR_STOCK SHEET
  const trcSheet = workbook.addWorksheet('TRACTOR_STOCK');
  trcSheet.mergeCells('A1:Q1');
  const tTitle = trcSheet.getCell('A1');
  tTitle.value = 'TRACTOR SHOWROOM INVENTORY & SALES';
  tTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  tTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  tTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  const trcHeaders = [
    'Tractor ID',
    'Registration Number',
    'Brand',
    'Model',
    'Mfg Year',
    'Chassis Number',
    'Engine Number',
    'Owner / Customer Name',
    'Mobile',
    'RC Status',
    'Insurance Status',
    'Purchase Date',
    'Stock Status',
    'Price (₹)',
    'Delivery Date',
    'Delivery Status',
    'Remarks',
  ];
  formatHeader(trcSheet, trcHeaders);

  db.tractors.forEach((t, idx) => {
    const rowNum = idx + 4;
    trcSheet.addRow([
      t.id,
      t.registrationNumber,
      t.brand,
      t.model,
      t.manufacturingYear,
      t.chassisNumber,
      t.engineNumber,
      t.ownerName,
      t.customerMobile || '',
      t.rcStatus,
      t.insuranceStatus,
      t.purchaseDate,
      t.stockStatus,
      t.price,
      t.deliveryDate || '',
      t.deliveryStatus || '',
      t.remarks || '',
    ]);
    const r = trcSheet.getRow(rowNum);
    r.getCell(14).numFmt = '₹#,##0.00';
  });
  trcSheet.columns = [
    { width: 14 },
    { width: 20 },
    { width: 18 },
    { width: 24 },
    { width: 12 },
    { width: 22 },
    { width: 18 },
    { width: 24 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 35 },
  ];

  // 7. OLD_TRACTOR_EXCHANGE SHEET
  const excSheet = workbook.addWorksheet('OLD_TRACTOR_EXCHANGE');
  excSheet.mergeCells('A1:N1');
  const eTitle = excSheet.getCell('A1');
  eTitle.value = 'OLD TRACTOR EXCHANGE & VALUATION DATABASE';
  eTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  eTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  eTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  const excHeaders = [
    'Exchange ID',
    'Customer Name',
    'Customer Mobile',
    'Old Tractor Number',
    'Old Tractor Model',
    'Old Chassis Number',
    'Old Engine Number',
    'Old Tractor Owner',
    'Old Valuation (₹)',
    'Exchange Date',
    'New Tractor Model',
    'New Tractor Number',
    'New Tractor Price (₹)',
    'Difference Amount (₹)',
    'Remarks',
  ];
  formatHeader(excSheet, excHeaders);

  db.exchanges.forEach((ex, idx) => {
    const rowNum = idx + 4;
    excSheet.addRow([
      ex.id,
      ex.customerName,
      ex.customerMobile,
      ex.oldTractorNumber,
      ex.oldTractorModel,
      ex.oldChassisNumber,
      ex.oldEngineNumber,
      ex.oldTractorOwner,
      ex.oldTractorValuation,
      ex.exchangeDate,
      ex.newTractorModel,
      ex.newTractorNumber,
      ex.newTractorPrice,
      { formula: `=M${rowNum}-I${rowNum}` },
      ex.remarks,
    ]);
    const r = excSheet.getRow(rowNum);
    r.getCell(9).numFmt = '₹#,##0.00';
    r.getCell(13).numFmt = '₹#,##0.00';
    r.getCell(14).numFmt = '₹#,##0.00';
  });
  excSheet.columns = [
    { width: 14 },
    { width: 22 },
    { width: 16 },
    { width: 18 },
    { width: 24 },
    { width: 22 },
    { width: 18 },
    { width: 22 },
    { width: 18 },
    { width: 16 },
    { width: 24 },
    { width: 18 },
    { width: 18 },
    { width: 20 },
    { width: 35 },
  ];

  // 8. LOANS SHEET
  const loanSheet = workbook.addWorksheet('LOANS');
  loanSheet.mergeCells('A1:R1');
  const lTitle = loanSheet.getCell('A1');
  lTitle.value = 'TRACTOR FINANCE & LOAN MANAGEMENT';
  lTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  lTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  lTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  const loanHeaders = [
    'Loan ID',
    'Customer Name',
    'Customer Mobile',
    'Tractor Number',
    'Finance Company',
    'Loan Amount (₹)',
    'Doc Charges (₹)',
    'Net Credit Amount (₹)',
    'Loan Status',
    'Login Date',
    'Approval Date',
    'Disbursement Date',
    'First Payment (₹)',
    'Hold Amount (₹)',
    'Pending Amount (₹)',
    'Account Closure Status',
    'Remarks',
  ];
  formatHeader(loanSheet, loanHeaders);

  db.loans.forEach((l, idx) => {
    const rowNum = idx + 4;
    loanSheet.addRow([
      l.id,
      l.customerName,
      l.customerMobile,
      l.tractorNumber,
      l.financeCompany,
      l.loanAmount,
      l.documentCharges,
      { formula: `=F${rowNum}-G${rowNum}` },
      l.loanStatus,
      l.loginDate,
      l.approvalDate || '',
      l.disbursementDate || '',
      l.firstPayment,
      l.holdAmount,
      l.pendingAmount,
      l.accountClosureStatus,
      l.remarks || '',
    ]);
    const r = loanSheet.getRow(rowNum);
    r.getCell(6).numFmt = '₹#,##0.00';
    r.getCell(7).numFmt = '₹#,##0.00';
    r.getCell(8).numFmt = '₹#,##0.00';
    r.getCell(13).numFmt = '₹#,##0.00';
    r.getCell(14).numFmt = '₹#,##0.00';
    r.getCell(15).numFmt = '₹#,##0.00';
  });
  loanSheet.columns = [
    { width: 14 },
    { width: 22 },
    { width: 16 },
    { width: 18 },
    { width: 24 },
    { width: 18 },
    { width: 16 },
    { width: 20 },
    { width: 18 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 20 },
    { width: 35 },
  ];

  // 9. PAYMENTS SHEET
  const paySheet = workbook.addWorksheet('PAYMENTS');
  paySheet.mergeCells('A1:O1');
  const pTitle = paySheet.getCell('A1');
  pTitle.value = 'PAYMENT TRANSACTIONS & CASH LEDGER';
  pTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  pTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  pTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  const payHeaders = [
    'Transaction ID',
    'Date',
    'Client ID',
    'Client Name',
    'Vehicle Number',
    'Application ID',
    'Payment Type',
    'Total Fees (₹)',
    'Advance Payment (₹)',
    'Additional Payment (₹)',
    'Total Paid (₹)',
    'Balance Amount (₹)',
    'Payment Mode',
    'Transaction Reference',
    'Remarks',
  ];
  formatHeader(paySheet, payHeaders);

  db.payments.forEach((p, idx) => {
    const rowNum = idx + 4;
    paySheet.addRow([
      p.id,
      p.date,
      p.clientId,
      p.clientName,
      p.vehicleNumber,
      p.applicationId,
      p.paymentType,
      p.totalFees,
      p.advancePayment,
      p.additionalPayment,
      { formula: `=I${rowNum}+J${rowNum}` },
      { formula: `=H${rowNum}-K${rowNum}` },
      p.paymentMode,
      p.transactionReference,
      p.remarks,
    ]);
    const r = paySheet.getRow(rowNum);
    r.getCell(8).numFmt = '₹#,##0.00';
    r.getCell(9).numFmt = '₹#,##0.00';
    r.getCell(10).numFmt = '₹#,##0.00';
    r.getCell(11).numFmt = '₹#,##0.00';
    r.getCell(12).numFmt = '₹#,##0.00';
  });
  paySheet.columns = [
    { width: 16 },
    { width: 14 },
    { width: 14 },
    { width: 22 },
    { width: 18 },
    { width: 16 },
    { width: 18 },
    { width: 16 },
    { width: 18 },
    { width: 18 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 24 },
    { width: 35 },
  ];

  // 10. EXPENSES SHEET
  const expSheet = workbook.addWorksheet('EXPENSES');
  expSheet.mergeCells('A1:G1');
  const exTitle = expSheet.getCell('A1');
  exTitle.value = 'OPERATIONAL EXPENSES TRACKER';
  exTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  exTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  exTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  const expHeaders = ['Expense ID', 'Date', 'Category', 'Description', 'Amount (₹)', 'Payment Mode', 'Remarks'];
  formatHeader(expSheet, expHeaders);

  db.expenses.forEach((e, idx) => {
    const rowNum = idx + 4;
    expSheet.addRow([e.id, e.date, e.category, e.description, e.amount, e.paymentMode, e.remarks]);
    const r = expSheet.getRow(rowNum);
    r.getCell(5).numFmt = '₹#,##0.00';
  });
  expSheet.columns = [
    { width: 14 },
    { width: 14 },
    { width: 20 },
    { width: 35 },
    { width: 16 },
    { width: 16 },
    { width: 35 },
  ];

  // 11. SETTINGS & LOOKUP SHEET
  const setSheet = workbook.addWorksheet('SETTINGS');
  setSheet.mergeCells('A1:H1');
  const sTitle = setSheet.getCell('A1');
  sTitle.value = 'SYSTEM CONFIGURATION & DATA VALIDATION LISTS';
  sTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  sTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEADER } };
  sTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  const setHeaders = [
    'Karnataka RTO Offices',
    'Vehicle Types',
    'RTO Work Types',
    'Payment Modes',
    'Expense Categories',
    'Finance Companies',
    'Application Status',
  ];
  formatHeader(setSheet, setHeaders);

  const maxLen = Math.max(
    db.settings.rtoOffices.length,
    db.settings.vehicleTypes.length,
    db.settings.workTypes.length,
    db.settings.paymentModes.length,
    db.settings.expenseCategories.length,
    db.settings.financeCompanies.length,
    db.settings.applicationStatuses.length
  );

  for (let i = 0; i < maxLen; i++) {
    setSheet.addRow([
      db.settings.rtoOffices[i] || '',
      db.settings.vehicleTypes[i] || '',
      db.settings.workTypes[i] || '',
      db.settings.paymentModes[i] || '',
      db.settings.expenseCategories[i] || '',
      db.settings.financeCompanies[i] || '',
      db.settings.applicationStatuses[i] || '',
    ]);
  }
  setSheet.columns = [
    { width: 35 },
    { width: 20 },
    { width: 25 },
    { width: 16 },
    { width: 22 },
    { width: 26 },
    { width: 20 },
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
