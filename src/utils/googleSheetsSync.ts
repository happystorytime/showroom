import { AppDatabase } from './storage';
import { maskAadhaar } from './pureCalculations';

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
    'CLIENTS',
    'VEHICLES',
    'RTO_APPLICATIONS',
    'DOCUMENTS',
    'TRACTOR_STOCK',
    'OLD_TRACTOR_EXCHANGE',
    'LOANS',
    'PAYMENTS',
    'EXPENSES',
  ];

  if (!spreadsheetId) {
    // 1. Create a brand new Google Spreadsheet
    const title = `${db.settings.businessName} - Live Cloud Database`;
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        properties: { title },
        sheets: sheetTitles.map((t) => ({
          properties: { title: t, gridProperties: { rowCount: 200, columnCount: 20 } },
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

  // 2. Prepare tabular data payloads for each sheet
  const valueData: { range: string; values: any[][] }[] = [];

  // DASHBOARD
  const totalIncome = db.payments.reduce((a, b) => a + (b.totalPaid || 0), 0);
  const totalExpense = db.expenses.reduce((a, b) => a + (b.amount || 0), 0);
  const netProfit = totalIncome - totalExpense;
  const totalOutstanding = db.applications.reduce((a, b) => a + (b.balanceAmount || 0), 0);

  valueData.push({
    range: 'DASHBOARD!A1:G15',
    values: [
      [db.settings.businessName, '', '', '', '', '', ''],
      [`Last Synced: ${new Date().toLocaleString()}`, '', '', '', '', '', ''],
      ['BUSINESS OVERVIEW', '', '', 'FINANCIAL OVERVIEW', '', '', ''],
      ['Metric', 'Value', '', 'Metric', 'Amount (INR)', '', ''],
      ['Total Clients', db.clients.length, '', 'Total Billed Revenue', db.applications.reduce((a, b) => a + (b.totalFees || 0), 0)],
      ['Total Vehicles', db.vehicles.length, '', 'Total Received Income', totalIncome],
      ['Total Tractor Stock', db.tractors.length, '', 'Total Business Expenses', totalExpense],
      ['Total RTO Applications', db.applications.length, '', 'Net Business Profit', netProfit],
      ['Completed Works', db.applications.filter((a) => a.workStatus === 'Completed').length, '', 'Total Outstanding Balance', totalOutstanding],
      ['Pending Works', db.applications.filter((a) => a.workStatus === 'Pending' || a.workStatus === 'New').length, '', 'Total Advance Collected', db.payments.reduce((a, b) => a + (b.advancePayment || 0), 0)],
      ['Processing Works', db.applications.filter((a) => a.workStatus === 'Processing').length, '', 'Total Tractor Loans', db.loans.reduce((a, b) => a + (b.loanAmount || 0), 0)],
    ],
  });

  // CLIENTS
  const clientRows = [
    ['Client ID', 'Client Name', 'Mobile Number', 'Alternate Number', 'Address', 'Aadhaar (Masked)', 'Registration Date', 'Remarks'],
    ...db.clients.map((c) => [c.id, c.name, c.mobile, c.alternateMobile, c.address, maskAadhaar(c.aadhaar), c.registrationDate, c.remarks]),
  ];
  valueData.push({ range: `CLIENTS!A1:H${clientRows.length}`, values: clientRows });

  // VEHICLES
  const vehRows = [
    ['Vehicle ID', 'Client ID', 'Vehicle Number', 'Owner Name', 'Vehicle Type', 'Brand', 'Model', 'Mfg Year', 'Chassis', 'Engine', 'Fuel', 'Reg Date', 'RC Validity', 'Insurance Expiry', 'Status'],
    ...db.vehicles.map((v) => [v.id, v.clientId, v.vehicleNumber, v.ownerName, v.vehicleType, v.brand, v.model, v.manufacturingYear, v.chassisNumber, v.engineNumber, v.fuelType, v.registrationDate, v.rcValidity, v.insuranceExpiry, v.documentStatus]),
  ];
  valueData.push({ range: `VEHICLES!A1:O${vehRows.length}`, values: vehRows });

  // RTO_APPLICATIONS
  const appRows = [
    ['Application ID', 'Client ID', 'Vehicle ID', 'Client Name', 'Vehicle Number', 'Work Type', 'App Number', 'RTO Office', 'App Date', 'Submission Date', 'Expected Completion', 'Total Fees', 'Advance Paid', 'Balance Amount', 'Status', 'Remarks'],
    ...db.applications.map((a) => [a.id, a.clientId, a.vehicleId, a.clientName, a.vehicleNumber, a.workType, a.applicationNumber, a.rtoOffice, a.applicationDate, a.submissionDate, a.expectedCompletionDate, a.totalFees, a.advancePaid, a.balanceAmount, a.workStatus, a.remarks]),
  ];
  valueData.push({ range: `RTO_APPLICATIONS!A1:P${appRows.length}`, values: appRows });

  // DOCUMENTS
  const docRows = [
    ['Document ID', 'Client ID', 'Vehicle ID', 'Vehicle Number', 'Client Name', 'Document Type', 'Document Number', 'Issue Date', 'Expiry Date', 'Received Status', 'Verification Status', 'Reference', 'Remarks'],
    ...db.documents.map((d) => [d.id, d.clientId, d.vehicleId, d.vehicleNumber, d.clientName, d.documentType, d.documentNumber, d.issueDate, d.expiryDate, d.receivedStatus, d.verificationStatus, d.filePathOrReference, d.remarks]),
  ];
  valueData.push({ range: `DOCUMENTS!A1:M${docRows.length}`, values: docRows });

  // TRACTOR_STOCK
  const trcRows = [
    ['Tractor ID', 'Reg Number', 'Brand', 'Model', 'Mfg Year', 'Chassis', 'Engine', 'Owner/Cust', 'Mobile', 'RC Status', 'Insurance Status', 'Purchase Date', 'Stock Status', 'Price', 'Delivery Date', 'Delivery Status', 'Remarks'],
    ...db.tractors.map((t) => [t.id, t.registrationNumber, t.brand, t.model, t.manufacturingYear, t.chassisNumber, t.engineNumber, t.ownerName, t.customerMobile || '', t.rcStatus, t.insuranceStatus, t.purchaseDate, t.stockStatus, t.price, t.deliveryDate || '', t.deliveryStatus || '', t.remarks || '']),
  ];
  valueData.push({ range: `TRACTOR_STOCK!A1:Q${trcRows.length}`, values: trcRows });

  // OLD_TRACTOR_EXCHANGE
  const excRows = [
    ['Exchange ID', 'Customer Name', 'Mobile', 'Old Tractor Number', 'Old Model', 'Old Chassis', 'Old Engine', 'Old Owner', 'Old Valuation', 'Exchange Date', 'New Model', 'New Tractor Number', 'New Price', 'Difference Amount', 'Remarks'],
    ...db.exchanges.map((e) => [e.id, e.customerName, e.customerMobile, e.oldTractorNumber, e.oldTractorModel, e.oldChassisNumber, e.oldEngineNumber, e.oldTractorOwner, e.oldTractorValuation, e.exchangeDate, e.newTractorModel, e.newTractorNumber, e.newTractorPrice, e.exchangeDifferenceAmount, e.remarks]),
  ];
  valueData.push({ range: `OLD_TRACTOR_EXCHANGE!A1:O${excRows.length}`, values: excRows });

  // LOANS
  const loanRows = [
    ['Loan ID', 'Customer Name', 'Mobile', 'Tractor Number', 'Finance Company', 'Loan Amount', 'Doc Charges', 'Net Credit', 'Status', 'Login Date', 'Approval Date', 'Disbursement Date', 'First Payment', 'Hold Amount', 'Pending Amount', 'Closure Status', 'Remarks'],
    ...db.loans.map((l) => [l.id, l.customerName, l.customerMobile, l.tractorNumber, l.financeCompany, l.loanAmount, l.documentCharges, l.netCreditAmount, l.loanStatus, l.loginDate, l.approvalDate || '', l.disbursementDate || '', l.firstPayment, l.holdAmount, l.pendingAmount, l.accountClosureStatus, l.remarks || '']),
  ];
  valueData.push({ range: `LOANS!A1:Q${loanRows.length}`, values: loanRows });

  // PAYMENTS
  const payRows = [
    ['Transaction ID', 'Date', 'Client ID', 'Client Name', 'Vehicle Number', 'Application ID', 'Payment Type', 'Total Fees', 'Advance Payment', 'Additional Payment', 'Total Paid', 'Balance', 'Mode', 'Reference', 'Remarks'],
    ...db.payments.map((p) => [p.id, p.date, p.clientId, p.clientName, p.vehicleNumber, p.applicationId, p.paymentType, p.totalFees, p.advancePayment, p.additionalPayment, p.totalPaid, p.balanceAmount, p.paymentMode, p.transactionReference, p.remarks]),
  ];
  valueData.push({ range: `PAYMENTS!A1:O${payRows.length}`, values: payRows });

  // EXPENSES
  const expRows = [
    ['Expense ID', 'Date', 'Category', 'Description', 'Amount', 'Payment Mode', 'Remarks'],
    ...db.expenses.map((e) => [e.id, e.date, e.category, e.description, e.amount, e.paymentMode, e.remarks]),
  ];
  valueData.push({ range: `EXPENSES!A1:G${expRows.length}`, values: expRows });

  // 3. Batch Update values in Google Sheets
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
