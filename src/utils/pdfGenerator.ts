import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Client, RTOApplication, Showroom, SystemSettings } from '../types';
import type { ChecklistEvaluation } from './pureCalculations';
import { maskAadhaar, maskPAN } from './pureCalculations';

export function exportRTOReceiptPDF(
  app: RTOApplication,
  client: Client | undefined,
  showroom: Showroom | undefined,
  settings: SystemSettings,
  checklist?: ChecklistEvaluation
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.businessName, 105, 11, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(settings.tagline, 105, 17, { align: 'center' });
  doc.text(
    `RTO Lic: ${settings.rtoLicenseNumber || 'KA-RTO-AGENT'} | Phone: ${settings.mobile} | Email: ${settings.email}`,
    105,
    24,
    { align: 'center' }
  );

  // Title Box
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 38, 182, 10, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, 38, 182, 10, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL RTO WORK ACKNOWLEDGEMENT & DOCUMENT CHECKLIST', 105, 44.5, { align: 'center' });

  const dateStr = new Date().toLocaleDateString('en-IN');
  const details = [
    ['Application ID:', app.id, 'Date Issued:', `${app.applicationDate} (Printed: ${dateStr})`],
    ['Showroom Branch:', showroom ? `${showroom.name} (${showroom.code})` : app.showroomId, 'RTO Office:', app.rtoOffice],
    ['Client ID / Name:', `${app.clientId} — ${app.clientName}`, 'Mobile Number:', client?.mobile || 'N/A'],
    ['Aadhaar (Masked):', maskAadhaar(client?.aadhaar), 'PAN (Masked):', maskPAN(client?.panNumber)],
    ['Vehicle Number:', app.vehicleNumber, 'Work Category:', app.workType],
    ['Govt Ack No:', app.applicationNumber || 'Pending Submission', 'Work Status:', app.workStatus.toUpperCase()],
    ['Submission Date:', app.submissionDate || '—', 'Expected Target:', app.expectedCompletionDate || '—'],
  ];

  autoTable(doc, {
    startY: 52,
    body: details,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 34 },
      1: { cellWidth: 57 },
      2: { fontStyle: 'bold', cellWidth: 32 },
      3: { cellWidth: 59 },
    },
  });

  const afterDetailsY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // Required Document Checklist Table (no fees)
  const requiredDocs = checklist ? checklist.required : app.requiredDocuments || [];
  const uploadedSet = new Set(checklist?.uploaded || []);
  const pendingSet = new Set(checklist?.pendingVerification || []);
  const rejectedSet = new Set(checklist?.rejected || []);

  const checklistRows = requiredDocs.map((docCat, index) => {
    let statusLabel = 'Missing / Not Submitted';
    if (uploadedSet.has(docCat)) {
      if (rejectedSet.has(docCat)) statusLabel = 'Rejected — Re-upload Needed';
      else if (pendingSet.has(docCat)) statusLabel = 'Uploaded (Under Verification)';
      else statusLabel = 'Uploaded & Verified';
    }
    return [String(index + 1), docCat, statusLabel];
  });

  autoTable(doc, {
    startY: afterDetailsY,
    head: [['#', 'Required RTO Document', 'Checklist Compliance Status']],
    body:
      checklistRows.length > 0
        ? checklistRows
        : [['1', 'Standard Vehicle KYC & RC Documentation', 'Verify at Showroom Desk']],
    theme: 'grid',
    headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5, cellPadding: 2.5 },
    foot: [
      [
        '',
        'Overall Checklist Status',
        checklist ? `${checklist.status} (${checklist.completionPercent}%)` : 'In Progress',
      ],
    ],
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 9 },
  });

  const afterTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  if (app.workDescription || app.remarks) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('WORK NOTES / REMARKS:', 14, afterTableY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${app.workDescription || ''} ${app.remarks ? `| ${app.remarks}` : ''}`.trim(), 14, afterTableY + 4.5, {
      maxWidth: 180,
    });
  }

  const termsY = afterTableY + (app.workDescription || app.remarks ? 14 : 2);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('DOCUMENTATION TERMS:', 14, termsY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const terms = [
    '1. Client documents are tracked and stored solely for Karnataka Transport Department (Vahan/Sarathi) processing.',
    '2. Missing or rejected documents must be resubmitted promptly to avoid RTO processing delays.',
    '3. Completion dates are subject to Karnataka RTO inspection slots and government portal verification.',
  ];
  terms.forEach((t, i) => {
    doc.text(t, 14, termsY + 4 + i * 4);
  });

  const sigY = termsY + 26;
  doc.setDrawColor(148, 163, 184);
  doc.line(14, sigY, 72, sigY);
  doc.line(138, sigY, 196, sigY);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Client / Showroom Representative', 14, sigY + 5);
  doc.text(`For ${settings.businessName}`, 138, sigY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('(Authorized RTO Agent)', 138, sigY + 9);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated on ${new Date().toLocaleString()} | Official RTO Work Acknowledgement`, 105, 290, {
    align: 'center',
  });

  doc.save(`RTO_Acknowledgement_${app.id}_${app.vehicleNumber.replace(/\s+/g, '_')}.pdf`);
}

export function exportGeneralReportPDF(
  title: string,
  columns: string[],
  rows: (string | number)[][],
  settings: SystemSettings,
  summaryNotes?: string
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.businessName, 148, 10, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${settings.tagline} | Date: ${new Date().toLocaleDateString('en-IN')}`, 148, 17, { align: 'center' });

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
    headStyles: { fillColor: [29, 78, 216], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, cellPadding: 2 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Karnataka RTO Multi-Showroom Report | Page ${i} of ${pageCount}`,
      148,
      202,
      { align: 'center' }
    );
  }

  const filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.pdf`;
  doc.save(filename);
}
