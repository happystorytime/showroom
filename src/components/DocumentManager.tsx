import React, { useMemo, useRef, useState } from 'react';
import {
  Upload,
  Search,
  Eye,
  Download,
  RefreshCw,
  Trash2,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  X,
  ClipboardCheck,
} from 'lucide-react';
import type {
  Client,
  DocumentCategory,
  DocumentCustodyStatus,
  DocumentRecord,
  DocumentVerificationStatus,
  RTOApplication,
  Showroom,
  SystemSettings,
  Vehicle,
} from '../types';
import { DOCUMENT_CATEGORIES } from '../types';
import {
  evaluateApplicationChecklist,
  filterByShowroom,
  getDocumentAlertStatus,
  getShowroomLabel,
  getTodayDateStr,
  validateUploadFile,
} from '../utils/pureCalculations';
import { deleteDocumentFile, uploadDocumentFile } from '../utils/storageService';

export interface DocumentUploadPreset {
  showroomId?: string;
  clientId?: string;
  vehicleId?: string;
  applicationId?: string;
  documentType?: DocumentCategory;
}

interface DocumentManagerProps {
  uid: string;
  documents: DocumentRecord[];
  applications: RTOApplication[];
  clients: Client[];
  vehicles: Vehicle[];
  showrooms: Showroom[];
  settings: SystemSettings;
  activeShowroomId: string;
  uploadPreset?: DocumentUploadPreset | null;
  onClearPreset?: () => void;
  onCreateDocument: (docRec: DocumentRecord) => Promise<void>;
  onUpdateDocument: (docRec: DocumentRecord) => Promise<void>;
  onDeleteDocument: (docRec: DocumentRecord) => Promise<void>;
  getNextDocumentId: () => string;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  uid,
  documents,
  applications,
  clients,
  vehicles,
  showrooms,
  settings,
  activeShowroomId,
  uploadPreset,
  onClearPreset,
  onCreateDocument,
  onUpdateDocument,
  onDeleteDocument,
  getNextDocumentId,
}) => {
  const todayStr = getTodayDateStr();
  const [viewMode, setViewMode] = useState<'vault' | 'missing'>('vault');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [verifyFilter, setVerifyFilter] = useState('ALL');

  // Upload / Replace Modal
  const [uploadOpen, setUploadOpen] = useState<boolean>(Boolean(uploadPreset));
  const [replacingDoc, setReplacingDoc] = useState<DocumentRecord | null>(null);
  const [formShowroomId, setFormShowroomId] = useState(
    uploadPreset?.showroomId || (activeShowroomId !== 'ALL' ? activeShowroomId : showrooms[0]?.id || 'SHW-101')
  );
  const [formClientId, setFormClientId] = useState(uploadPreset?.clientId || clients[0]?.id || '');
  const [formVehicleId, setFormVehicleId] = useState(uploadPreset?.vehicleId || '');
  const [formAppId, setFormAppId] = useState(uploadPreset?.applicationId || '');
  const [formDocType, setFormDocType] = useState<DocumentCategory>(
    uploadPreset?.documentType || 'RC Book'
  );
  const [formDocNumber, setFormDocNumber] = useState('');
  const [formIssueDate, setFormIssueDate] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formReceivedStatus, setFormReceivedStatus] = useState<DocumentCustodyStatus>('Received');
  const [formVerificationStatus, setFormVerificationStatus] =
    useState<DocumentVerificationStatus>('Pending');
  const [formRemarks, setFormRemarks] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<DocumentRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const clientVehicles = useMemo(
    () => vehicles.filter((v) => !formClientId || v.clientId === formClientId),
    [vehicles, formClientId]
  );

  const clientApps = useMemo(
    () =>
      applications.filter(
        (a) =>
          (!formClientId || a.clientId === formClientId) &&
          (!formVehicleId || a.vehicleId === formVehicleId)
      ),
    [applications, formClientId, formVehicleId]
  );

  const scopedDocs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return filterByShowroom(documents, activeShowroomId).filter((d) => {
      if (categoryFilter !== 'ALL' && d.documentType !== categoryFilter) return false;
      if (verifyFilter !== 'ALL' && d.verificationStatus !== verifyFilter) return false;
      if (!q) return true;
      return (
        d.clientName.toLowerCase().includes(q) ||
        d.vehicleNumber.toLowerCase().includes(q) ||
        d.documentType.toLowerCase().includes(q) ||
        (d.fileName || '').toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q)
      );
    });
  }, [documents, activeShowroomId, categoryFilter, verifyFilter, searchTerm]);

  const missingChecklists = useMemo(() => {
    return filterByShowroom(applications, activeShowroomId)
      .filter((a) => a.workStatus !== 'Completed' && a.workStatus !== 'Rejected')
      .map((app) => ({
        app,
        evaluation: evaluateApplicationChecklist(app, documents, settings),
      }))
      .filter((item) => item.evaluation.status !== 'Documents Complete');
  }, [applications, activeShowroomId, documents, settings]);

  const openUploadModal = (preset?: DocumentUploadPreset) => {
    setReplacingDoc(null);
    const cid = preset?.clientId || clients[0]?.id || '';
    const firstVeh = preset?.vehicleId || vehicles.find((v) => v.clientId === cid)?.id || '';
    setFormShowroomId(
      preset?.showroomId ||
        (activeShowroomId !== 'ALL' ? activeShowroomId : showrooms[0]?.id || 'SHW-101')
    );
    setFormClientId(cid);
    setFormVehicleId(firstVeh);
    setFormAppId(preset?.applicationId || '');
    setFormDocType(preset?.documentType || 'RC Book');
    setFormDocNumber('');
    setFormIssueDate('');
    setFormExpiryDate('');
    setFormReceivedStatus('Received');
    setFormVerificationStatus('Pending');
    setFormRemarks('');
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadError(null);
    setUploadOpen(true);
  };

  const openReplaceModal = (docRec: DocumentRecord) => {
    setReplacingDoc(docRec);
    setFormShowroomId(docRec.showroomId);
    setFormClientId(docRec.clientId);
    setFormVehicleId(docRec.vehicleId);
    setFormAppId(docRec.applicationId || '');
    setFormDocType(docRec.documentType);
    setFormDocNumber(docRec.documentNumber || '');
    setFormIssueDate(docRec.issueDate || '');
    setFormExpiryDate(docRec.expiryDate || '');
    setFormReceivedStatus(docRec.receivedStatus);
    setFormVerificationStatus(docRec.verificationStatus);
    setFormRemarks(docRec.remarks || '');
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadError(null);
    setUploadOpen(true);
  };

  const handleFileChosen = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const validation = validateUploadFile({ name: file.name, size: file.size, type: file.type });
    if (!validation.valid) {
      setUploadError(validation.error || 'Unsupported file.');
      setSelectedFile(null);
      return;
    }
    setUploadError(null);
    setSelectedFile(file);
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    const client = clients.find((c) => c.id === formClientId);
    const vehicle = vehicles.find((v) => v.id === formVehicleId);
    if (!client || !vehicle) {
      setUploadError('Please select a Client and a linked Vehicle.');
      return;
    }

    if (!replacingDoc && !selectedFile && formReceivedStatus !== 'Missing') {
      setUploadError('Please choose a PDF, JPG, JPEG, or PNG file to upload (max 10 MB).');
      return;
    }

    setUploading(true);
    try {
      const targetId = replacingDoc ? replacingDoc.id : getNextDocumentId();
      let fileMeta = {
        fileName: replacingDoc?.fileName,
        fileSize: replacingDoc?.fileSize,
        mimeType: replacingDoc?.mimeType,
        storagePath: replacingDoc?.storagePath,
        downloadUrl: replacingDoc?.downloadUrl,
        uploadedAt: replacingDoc?.uploadedAt,
      };

      if (selectedFile) {
        const uploaded = await uploadDocumentFile(uid, targetId, selectedFile, (pct) =>
          setUploadProgress(pct)
        );
        if (replacingDoc?.storagePath && replacingDoc.storagePath !== uploaded.storagePath) {
          await deleteDocumentFile(replacingDoc.storagePath).catch(() => undefined);
        }
        fileMeta = uploaded;
      }

      const nowIso = new Date().toISOString();
      const record: DocumentRecord = {
        id: targetId,
        showroomId: formShowroomId,
        clientId: client.id,
        vehicleId: vehicle.id,
        applicationId: formAppId || undefined,
        vehicleNumber: vehicle.vehicleNumber,
        clientName: client.name,
        documentType: formDocType,
        documentNumber: formDocNumber.trim(),
        issueDate: formIssueDate,
        expiryDate: formExpiryDate,
        receivedStatus: formReceivedStatus,
        verificationStatus: formVerificationStatus,
        ...fileMeta,
        filePathOrReference:
          fileMeta.fileName || replacingDoc?.filePathOrReference || 'Digital Vault',
        remarks: formRemarks.trim(),
        createdAt: replacingDoc?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      if (replacingDoc) {
        await onUpdateDocument(record);
      } else {
        await onCreateDocument(record);
      }
      setUploadOpen(false);
      onClearPreset?.();
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Upload failed. Ensure the rto-documents bucket exists in Supabase Storage.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleQuickVerify = async (docRec: DocumentRecord, status: DocumentVerificationStatus) => {
    await onUpdateDocument({ ...docRec, verificationStatus: status, updatedAt: new Date().toISOString() });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.storagePath) {
        await deleteDocumentFile(deleteTarget.storagePath).catch(() => undefined);
      }
      await onDeleteDocument(deleteTarget);
      if (previewDoc?.id === deleteTarget.id) setPreviewDoc(null);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Tabs */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Document Upload & Compliance Vault ({scopedDocs.length})
            </h2>
            <p className="text-xs text-slate-500">
              Upload real PDF, JPG, or PNG files to Supabase Storage, verify checklists, preview, replace, or download.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setViewMode('vault')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  viewMode === 'vault' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Uploaded Vault ({scopedDocs.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode('missing')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  viewMode === 'missing' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Missing Checklists ({missingChecklists.length})
              </button>
            </div>
            <button
              type="button"
              disabled={clients.length === 0 || vehicles.length === 0}
              onClick={() => openUploadModal()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>

        {viewMode === 'vault' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search client, vehicle, file name..."
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All 12 Document Categories</option>
              {DOCUMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={verifyFilter}
              onChange={(e) => setVerifyFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Verification States</option>
              <option value="Verified">Verified</option>
              <option value="Pending">Pending Verification</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        )}
      </div>

      {/* Vault View */}
      {viewMode === 'vault' ? (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {scopedDocs.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No uploaded documents found. Click &ldquo;Upload Document&rdquo; to attach client or vehicle files.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Document & File</th>
                    <th className="px-4 py-3">Client & Vehicle</th>
                    <th className="px-4 py-3">Showroom / App</th>
                    <th className="px-4 py-3">Expiry</th>
                    <th className="px-4 py-3">Verification</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scopedDocs.map((d) => {
                    const isPdf =
                      d.mimeType === 'application/pdf' ||
                      (d.fileName || '').toLowerCase().endsWith('.pdf');
                    const expAlert = getDocumentAlertStatus(d.expiryDate, todayStr);
                    return (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                              {isPdf ? (
                                <FileText className="h-4 w-4 text-red-600" />
                              ) : (
                                <ImageIcon className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">{d.documentType}</p>
                              <p className="truncate max-w-[200px] text-xs text-slate-500">
                                {d.fileName || d.filePathOrReference}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{d.clientName}</p>
                          <p className="font-mono text-xs text-slate-600">{d.vehicleNumber}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          <p>{getShowroomLabel(showrooms, d.showroomId)}</p>
                          {d.applicationId && (
                            <p className="font-mono text-blue-700">{d.applicationId}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span
                            className={`font-mono ${
                              expAlert === 'expired'
                                ? 'text-red-700 font-semibold'
                                : expAlert === 'expiring_soon'
                                ? 'text-amber-700 font-semibold'
                                : 'text-slate-600'
                            }`}
                          >
                            {d.expiryDate || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={d.verificationStatus}
                            onChange={(e) =>
                              handleQuickVerify(d, e.target.value as DocumentVerificationStatus)
                            }
                            className={`rounded-md border px-2 py-1 text-xs font-semibold focus:outline-none ${
                              d.verificationStatus === 'Verified'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : d.verificationStatus === 'Rejected'
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : 'border-amber-200 bg-amber-50 text-amber-700'
                            }`}
                          >
                            <option value="Verified">Verified</option>
                            <option value="Pending">Pending</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            {d.downloadUrl && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(d)}
                                  title="Preview File"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <a
                                  href={d.downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={d.fileName || `${d.id}`}
                                  title="Download File"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => openReplaceModal(d)}
                              title="Replace / Update Document"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(d)}
                              title="Delete Document"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Missing Checklists Matrix */
        <div className="space-y-4">
          {missingChecklists.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-emerald-700 font-medium">
              All active RTO applications have complete, verified document checklists.
            </div>
          ) : (
            missingChecklists.map(({ app, evaluation }) => (
              <div
                key={app.id}
                className="rounded-xl border border-slate-200 bg-white p-5 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4 text-blue-600" />
                      <span className="font-mono text-xs font-bold text-slate-900">{app.id}</span>
                      <span className="text-sm font-bold text-slate-900">
                        {app.workType} · {app.vehicleNumber}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {app.clientName} · {getShowroomLabel(showrooms, app.showroomId)} ·{' '}
                      <strong>{evaluation.status}</strong> ({evaluation.completionPercent}%)
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {evaluation.missing.map((docCat) => (
                    <button
                      key={`miss-${docCat}`}
                      type="button"
                      onClick={() =>
                        openUploadModal({
                          showroomId: app.showroomId,
                          clientId: app.clientId,
                          vehicleId: app.vehicleId,
                          applicationId: app.id,
                          documentType: docCat,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload Missing: {docCat}</span>
                    </button>
                  ))}
                  {evaluation.pendingVerification.map((docCat) => (
                    <span
                      key={`pend-${docCat}`}
                      className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800"
                    >
                      Pending Verification: {docCat}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Upload / Replace Document Modal */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="font-display text-base font-bold text-slate-900">
                {replacingDoc
                  ? `Replace / Edit Document (${replacingDoc.id})`
                  : 'Upload RTO Document'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setUploadOpen(false);
                  onClearPreset?.();
                }}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmitUpload}
              className="p-5 space-y-4 max-h-[85vh] overflow-y-auto"
            >
              {uploadError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Showroom *
                  </label>
                  <select
                    value={formShowroomId}
                    onChange={(e) => setFormShowroomId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {showrooms.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} — {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Document Category *
                  </label>
                  <select
                    value={formDocType}
                    onChange={(e) => setFormDocType(e.target.value as DocumentCategory)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {DOCUMENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Common Client *
                  </label>
                  <select
                    disabled={Boolean(replacingDoc)}
                    value={formClientId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      setFormClientId(cid);
                      const firstV = vehicles.find((v) => v.clientId === cid)?.id || '';
                      setFormVehicleId(firstV);
                      setFormAppId('');
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Linked Vehicle *
                  </label>
                  <select
                    disabled={Boolean(replacingDoc)}
                    value={formVehicleId}
                    onChange={(e) => setFormVehicleId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  >
                    <option value="">Select Vehicle...</option>
                    {clientVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicleNumber} ({v.vehicleClass})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Link to RTO Application (Optional)
                  </label>
                  <select
                    value={formAppId}
                    onChange={(e) => setFormAppId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">General Client/Vehicle Document</option>
                    {clientApps.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.id} — {a.workType} ({a.vehicleNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Document Number
                  </label>
                  <input
                    type="text"
                    value={formDocNumber}
                    onChange={(e) => setFormDocNumber(e.target.value)}
                    placeholder="Policy / DL / NOC number"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expiry Date (if applicable)
                  </label>
                  <input
                    type="date"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custody Status
                  </label>
                  <select
                    value={formReceivedStatus}
                    onChange={(e) =>
                      setFormReceivedStatus(e.target.value as DocumentCustodyStatus)
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="Received">Received</option>
                    <option value="Submitted to RTO">Submitted to RTO</option>
                    <option value="Returned to Client">Returned to Client</option>
                    <option value="Missing">Missing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Verification Status
                  </label>
                  <select
                    value={formVerificationStatus}
                    onChange={(e) =>
                      setFormVerificationStatus(e.target.value as DocumentVerificationStatus)
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Verified">Verified</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* File Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dropped = e.dataTransfer.files?.[0] || null;
                  handleFileChosen(dropped);
                }}
                className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={(e) => handleFileChosen(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <Upload className="mx-auto h-7 w-7 text-blue-600 mb-2" />
                <p className="text-xs font-semibold text-slate-800">
                  {selectedFile
                    ? `Selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`
                    : replacingDoc?.fileName
                    ? `Current file: ${replacingDoc.fileName} — drop a new file to replace`
                    : 'Drag & drop PDF, JPG, JPEG, or PNG (max 10 MB)'}
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Choose File
                </button>

                {uploading && (
                  <div className="mt-3 w-full rounded-full bg-slate-200 h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setUploadOpen(false);
                    onClearPreset?.();
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{uploading ? `Uploading ${uploadProgress}%` : 'Save Document'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && previewDoc.downloadUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="w-full max-w-4xl h-[85vh] rounded-xl bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  {previewDoc.documentType} — {previewDoc.vehicleNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  {previewDoc.fileName} · {previewDoc.clientName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={previewDoc.fileName || previewDoc.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 p-4 overflow-auto flex items-center justify-center">
              {previewDoc.mimeType === 'application/pdf' ||
              (previewDoc.fileName || '').toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.downloadUrl}
                  title={previewDoc.fileName || previewDoc.id}
                  className="w-full h-full rounded-lg border border-slate-200 bg-white"
                />
              ) : (
                <img
                  src={previewDoc.downloadUrl}
                  alt={previewDoc.fileName || previewDoc.documentType}
                  className="max-h-full max-w-full rounded-lg object-contain shadow"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="font-display text-base font-bold text-slate-900">
              Delete & Archive Document {deleteTarget.id}?
            </h3>
            <p className="mt-1.5 text-sm text-slate-600">
              This removes the uploaded file from Supabase Storage and archives metadata for{' '}
              <strong>{deleteTarget.documentType}</strong> ({deleteTarget.vehicleNumber}).
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Delete Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
