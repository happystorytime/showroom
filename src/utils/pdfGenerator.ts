import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Client, Vehicle, RTOApplication, PaymentTransaction, SystemSettings } from '../types';
import { formatINR, maskAadhaar } from './pureCalculations';

export function exportRTOReceiptPDF(
  app: RTOApplication,
  client: Client | undefined,
  settings: SystemSettings,
  payment?: PaymentTransaction
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header Banner
  doc.setFillColor(30, 58, 138); // Dark Navy Blue
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.businessName, 105, 12, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(settings.tagline, 105, 18, { align: 'center' });
  doc.text(`RTO Lic: ${settings.rtoLicenseNumber || 'KA-RTO-AGT-BLR'} | Phone: ${settings.mobile} | Email: ${settings.email}`, 105, 24, { align: 'center' });

  // Title Box
  doc.setFillColor(241, 245, 249);
  doc.rect(14, 38, 182, 10, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, 38, 182, 10, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL RTO APPLICATION ACKNOWLEDGEMENT & PAYMENT RECEIPT', 105, 44.5, { align: 'center' });

  // Details Grid
  const dateStr = new Date().toLocaleDateString('en-IN');
  const details = [
    ['Application ID:', app.id, 'Date & Time:', `${app.applicationDate} (Issued: ${dateStr})`],
    ['Client ID:', app.clientId, 'Client Name:', app.clientName],
    ['Mobile Number:', client?.mobile || 'N/A', 'Aadhaar (Masked):', maskAadhaar(client?.aadhaar)],
    ['Vehicle Number:', app.vehicleNumber, 'RTO Jurisdiction:', app.rtoOffice],
    ['RTO Work Service:', app.workType, 'Govt Ack No:', app.applicationNumber || 'Under Generation'],
    ['Current Status:', app.workStatus.toUpperCase(), 'Target Completion:', app.expectedCompletionDate],
  ];

  autoTable(doc, {
    startY: 52,
    body: details,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35 },
      1: { cellWidth: 55 },
      2: { fontStyle: 'bold', cellWidth: 35 },
      3: { cellWidth: 57 },
    },
  });

  // Financial Table
  const lastY = (doc as any).lastAutoTable.finalY + 6;

  autoTable(doc, {
    startY: lastY,
    head: [['Fee Particulars / Service Description', 'Total Agreed (INR)', 'Paid to Date (INR)', 'Balance Due (INR)']],
    body: [
      [
        `${app.workType} Processing Charges & Official Government Fees\n${app.workDescription || 'All Karnataka Transport Department formalities included'}`,
        formatINR(app.totalFees),
        formatINR(app.advancePaid),
        formatINR(app.balanceAmount),
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, cellPadding: 3 },
    foot: [
      ['BALANCE OUTSTANDING PAYABLE AT DELIVERY:', '', '', formatINR(app.balanceAmount)],
    ],
    footStyles: { fillColor: [241, 245, 249], textColor: [185, 28, 28], fontStyle: 'bold', fontSize: 10 },
  });

  const finY = (doc as any).lastAutoTable.finalY + 12;

  // Terms & Conditions
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('TERMS & CONDITIONS:', 14, finY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const terms = [
    '1. Original documents are securely held in agency custody under camera surveillance until RTO verification.',
    '2. Delivery timelines are subject to Karnataka Transport Department Vahan portal server uptime and physical inspection track availability.',
    '3. Balance fee must be cleared at the time of Smart Card RC / NOC delivery.',
    '4. In case of government fee revisions or additional penalty for delayed renewal, difference shall be borne by vehicle owner.',
  ];
  terms.forEach((t, i) => {
    doc.text(t, 14, finY + 4 + i * 4);
  });

  // Signatures
  const sigY = finY + 30;
  doc.setDrawColor(148, 163, 184);
  doc.line(14, sigY, 70, sigY);
  doc.line(140, sigY, 196, sigY);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Client Signature / Thumb Impression', 14, sigY + 5);
  doc.text(`For ${settings.businessName}`, 140, sigY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('(Authorized Signatory & Stamp)', 140, sigY + 9);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated on ${new Date().toLocaleString()} | Computer Generated Official Receipt`, 105, 290, { align: 'center' });

  doc.save(`RTO_Receipt_${app.id}_${app.vehicleNumber.replace(/\s+/g, '_')}.pdf`);
}

export function exportGeneralReportPDF(
  title: string,
  columns: string[],
  rows: (string | number)[][],
  settings: SystemSettings,
  summaryNotes?: string
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header Banner
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.businessName, 148, 10, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${settings.tagline} | Date: ${new Date().toLocaleDateString('en-IN')}`, 148, 17, { align: 'center' });

  // Subheader
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), 14, 32);

  if (summaryNotes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(summaryNotes, 14, 38);
  }

  const startY = summaryNotes ? 43 : 36;

  autoTable(doc, {
    startY,
    head: [columns],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, cellPadding: 2 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Confidential Business Report | Page ${i} of ${pageCount} | Generated from Karnataka RTO Management System`,
      148,
      202,
      { align: 'center' }
    );
  }

  const filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.pdf`;
  doc.save(filename);
}
