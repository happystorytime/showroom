import React, { useState } from 'react';
import { X, Code2, Copy, Check, Download } from 'lucide-react';
import { VBA_CODE_MODULE, downloadVbaMacroModule } from '../utils/vbaGenerator';

interface VbaDownloadModalProps {
  onClose: () => void;
}

export const VbaDownloadModal: React.FC<VbaDownloadModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(VBA_CODE_MODULE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked in restricted browser contexts
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-amber-600" />
            <h3 className="font-display text-base font-bold text-slate-900">
              Excel VBA Automation Macros (RTO Multi-Showroom)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          <p className="text-xs text-slate-600">
            Import this <span className="font-mono">.bas</span> module into your exported{' '}
            <span className="font-mono">.xlsx</span> workbook (Alt + F11 → File → Import File) to enable quick sheet navigation, common client/vehicle search, print preview, and dashboard formula refresh.
          </p>

          <pre className="rounded-lg border border-slate-200 bg-slate-900 p-4 text-[11px] font-mono text-slate-100 overflow-x-auto max-h-96">
            {VBA_CODE_MODULE}
          </pre>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-3.5 bg-slate-50">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Copied' : 'Copy Code'}</span>
          </button>
          <button
            type="button"
            onClick={downloadVbaMacroModule}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            <span>Download .BAS Module</span>
          </button>
        </div>
      </div>
    </div>
  );
};
