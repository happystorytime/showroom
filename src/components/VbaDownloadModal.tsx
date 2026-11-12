import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  X,
  Code2,
  Terminal,
  FileCode,
  HelpCircle,
} from 'lucide-react';
import { VBA_CODE_MODULE, downloadVbaMacroModule } from '../utils/vbaGenerator';
import { generateKarnatakaRTOWorkbook, downloadBlob } from '../utils/excelGenerator';
import { AppDatabase } from '../utils/storage';

interface VbaDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: AppDatabase;
}

export const VbaDownloadModal: React.FC<VbaDownloadModalProps> = ({
  isOpen,
  onClose,
  db,
}) => {
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(VBA_CODE_MODULE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadXlsx = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateKarnatakaRTOWorkbook(db);
      downloadBlob(blob, 'Karnataka_RTO_Business_Management.xlsx');
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Download Karnataka_RTO_Business_Management.xlsm Package
              </h3>
              <p className="text-xs text-slate-500">
                Complete VBA Automation Code with working SAVE, UPDATE, DELETE, SEARCH, and PRINT macros.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Download Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <button
            onClick={downloadVbaMacroModule}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white p-3.5 rounded-xl font-bold transition shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>1. Download VBA Macros (.BAS File)</span>
          </button>

          <button
            onClick={handleDownloadXlsx}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white p-3.5 rounded-xl font-bold transition shadow-sm cursor-pointer disabled:bg-slate-300"
          >
            <Download className="w-4 h-4" />
            <span>2. Download Workbook (.XLSX)</span>
          </button>
        </div>

        {/* Step by step guide */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
          <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            <span>How to run working VBA macros in Microsoft Excel:</span>
          </h4>
          <ol className="list-decimal pl-5 space-y-1 text-slate-600 leading-relaxed text-[11px]">
            <li>Open the downloaded <strong>Karnataka_RTO_Business_Management.xlsx</strong> in Excel on your laptop.</li>
            <li>Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold">Alt + F11</kbd> (Windows) or <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold">Opt + F11</kbd> (Mac) to open the Visual Basic Editor.</li>
            <li>Click <strong>File &gt; Import File...</strong> and select the downloaded <code className="bg-white px-1 py-0.5 rounded border border-slate-200">Karnataka_RTO_Automation_Macros.bas</code>.</li>
            <li>Click <strong>File &gt; Save As</strong> and choose <strong>Excel Macro-Enabled Workbook (*.xlsm)</strong>.</li>
            <li>All buttons (SAVE, UPDATE, DELETE, SEARCH, PRINT, REFRESH) and database automation macros are now live!</li>
          </ol>
        </div>

        {/* Live Code Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-slate-500" />
              <span>Full VBA Macro Source Code</span>
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-[11px] font-mono h-48 overflow-y-auto leading-relaxed border border-slate-800">
            {VBA_CODE_MODULE}
          </pre>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100 text-xs">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
