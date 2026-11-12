import React, { useState } from 'react';
import {
  FileCheck,
  Search,
  Plus,
  AlertTriangle,
  Clock,
  ShieldCheck,
  FileWarning,
  Trash2,
  Printer,
  FileText,
} from 'lucide-react';
import { DocumentRecord, DocumentCategory } from '../types';
import { AppDatabase, getNextDocumentId } from '../utils/storage';
import { getDocumentAlertStatus } from '../utils/pureCalculations';
import { exportGeneralReportPDF } from '../utils/pdfGenerator';
import { ActiveTab } from './Navbar';

interface DocumentManagerProps {
  db: AppDatabase;
  onAddDocument: (doc: DocumentRecord) => void;
  onDeleteDocument: (docId: string) => void;
  onNavigate: (tab: ActiveTab) => void;
  currentDateStr: string;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  db,
  onAddDocument,
  onDeleteDocument,
  onNavigate,
  currentDateStr,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New Document State
  const [clientId, setClientId] = useState(db.clients[0]?.id || 'CLI-1001');
  const [vehicleNumber, setVehicleNumber] = useState(db.vehicles[0]?.vehicleNumber || '');
  const [documentType, setDocumentType] = useState<DocumentCategory>('RC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issueDate, setIssueDate] = useState(currentDateStr);
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]
  );
  const [receivedStatus, setReceivedStatus] = useState<
    'Received' | 'Missing' | 'Submitted to RTO' | 'Returned to Client'
  >('Received');
  const [verificationStatus, setVerificationStatus] = useState<'Verified' | 'Pending' | 'Rejected'>(
    'Verified'
  );
  const [filePathOrReference, setFilePathOrReference] = useState('');
  const [remarks, setRemarks] = useState('');

  const docCategories: DocumentCategory[] = [
    'RC',
    'Insurance',
    'Aadhaar',
    'PAN Card',
    'Driving Licence',
    'Form 29',
    'Form 30',
    'Form 35',
    'NOC',
    'Fitness Certificate',
    'Permit',
    'Other Documents',
  ];

  const filteredDocs = db.documents.filter((d) => {
    const matchesSearch =
      d.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCat = categoryFilter === 'All' || d.documentType === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleSaveDoc = (e: React.FormEvent) => {
    e.preventDefault();
    const client = db.clients.find((c) => c.id === clientId);
    const vehicle = db.vehicles.find((v) => v.vehicleNumber.toUpperCase() === vehicleNumber.toUpperCase());

    const newDoc: DocumentRecord = {
      id: getNextDocumentId(db.documents),
      clientId,
      vehicleId: vehicle ? vehicle.id : 'VEH-MISC',
      vehicleNumber: vehicleNumber.toUpperCase().trim(),
      clientName: client ? client.name : 'Client',
      documentType,
      documentNumber: documentNumber.trim(),
      issueDate,
      expiryDate,
      receivedStatus,
      verificationStatus,
      filePathOrReference: filePathOrReference.trim() || 'Physical safe file folder',
      remarks: remarks.trim(),
      createdAt: new Date().toISOString(),
    };

    onAddDocument(newDoc);
    setIsAddOpen(false);
    setDocumentNumber('');
    setFilePathOrReference('');
    setRemarks('');
  };

  const handlePrintReport = () => {
    const headers = [
      'Doc ID',
      'Vehicle No',
      'Client Name',
      'Doc Type',
      'Doc Number',
      'Issue Date',
      'Expiry Date',
      'Received Status',
      'Verification',
    ];
    const data = filteredDocs.map((d) => [
      d.id,
      d.vehicleNumber,
      d.clientName,
      d.documentType,
      d.documentNumber,
      d.issueDate,
      d.expiryDate,
      d.receivedStatus,
      d.verificationStatus,
    ]);
    exportGeneralReportPDF('Vehicle & RTO Document Compliance Report', headers, data, db.settings);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-amber-600" />
            <span>06. Document Management & Compliance Vault</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            RC books, Insurance policies, Form 29/30 sale letters, Form 35 Bank NOC, PUC, and fitness certificates.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
          >
            <option value="All">All Document Categories</option>
            {docCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by vehicle number, doc #..."
              className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none w-56"
            />
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Document</span>
          </button>

          <button
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3">Doc ID</th>
                <th className="px-4 py-3">Vehicle Number</th>
                <th className="px-4 py-3">Client Name</th>
                <th className="px-4 py-3">Document Category</th>
                <th className="px-4 py-3">Document Number</th>
                <th className="px-4 py-3">Issue & Expiry</th>
                <th className="px-4 py-3 text-center">Custody Status</th>
                <th className="px-4 py-3 text-center">Verification</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No matching documents found in registry.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((d) => {
                  const alertStatus = getDocumentAlertStatus(d.expiryDate, currentDateStr);

                  return (
                    <tr key={d.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-500">{d.id}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 text-sm">
                        {d.vehicleNumber}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{d.clientName}</td>
                      <td className="px-4 py-3 font-semibold text-amber-700">{d.documentType}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        <div>{d.documentNumber || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                          Ref: {d.filePathOrReference}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[11px] text-slate-500">Issued: {d.issueDate}</div>
                        <div className="font-semibold text-slate-900">
                          Expires: {d.expiryDate}
                          {alertStatus === 'expired' && (
                            <span className="block text-[10px] font-bold text-rose-600">
                              EXPIRED!
                            </span>
                          )}
                          {alertStatus === 'expiring_soon' && (
                            <span className="block text-[10px] font-bold text-amber-600">
                              Expiring Soon (&lt;30d)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            d.receivedStatus === 'Received'
                              ? 'bg-emerald-100 text-emerald-800'
                              : d.receivedStatus === 'Submitted to RTO'
                              ? 'bg-blue-100 text-blue-800'
                              : d.receivedStatus === 'Missing'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {d.receivedStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            d.verificationStatus === 'Verified'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                              : d.verificationStatus === 'Rejected'
                              ? 'bg-rose-50 text-rose-700 border border-rose-300'
                              : 'bg-amber-50 text-amber-700 border border-amber-300'
                          }`}
                        >
                          {d.verificationStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => onDeleteDocument(d.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                          title="Delete Document Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD DOCUMENT MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-amber-600" />
                Record New Vehicle Document
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDoc} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Client</label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                  >
                    {db.clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    required
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. KA-04-MB-4521"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Document Category</label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as DocumentCategory)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                  >
                    {docCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Document Number</label>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="Policy / Smart Card / Challan No"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Received Status</label>
                  <select
                    value={receivedStatus}
                    onChange={(e) => setReceivedStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                  >
                    <option value="Received">Received (In Agency Custody)</option>
                    <option value="Missing">Missing (Awaiting from Client)</option>
                    <option value="Submitted to RTO">Submitted to RTO</option>
                    <option value="Returned to Client">Returned to Client</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Verification Status</label>
                  <select
                    value={verificationStatus}
                    onChange={(e) => setVerificationStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                  >
                    <option value="Verified">Verified</option>
                    <option value="Pending">Pending</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Physical File Reference / Path</label>
                <input
                  type="text"
                  value={filePathOrReference}
                  onChange={(e) => setFilePathOrReference(e.target.value)}
                  placeholder="e.g. Locker 2 / Shelf B / File #KA04-4521"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Original RC handed over to RTO inspector"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Save Document Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
