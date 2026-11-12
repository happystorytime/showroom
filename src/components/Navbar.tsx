import React from 'react';
import {
  LayoutDashboard,
  FilePlus,
  Users,
  Car,
  FileText,
  FileCheck,
  Tractor,
  Repeat,
  Landmark,
  CreditCard,
  Receipt,
  BellRing,
  BarChart3,
  Archive,
  Settings as SettingsIcon,
  Download,
  FileSpreadsheet,
  CloudUpload,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { User } from 'firebase/auth';

export type ActiveTab =
  | 'dashboard'
  | 'data-entry'
  | 'clients'
  | 'vehicles'
  | 'rto-work'
  | 'documents'
  | 'tractor-showroom'
  | 'exchange'
  | 'loans'
  | 'payments'
  | 'expenses'
  | 'alerts'
  | 'reports'
  | 'archive';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  alertCount: number;
  onOpenSettings: () => void;
  onDownloadExcel: () => void;
  onDownloadXLSM: () => void;
  onOpenGoogleSheets: () => void;
  user: User | null;
  onGoogleSignIn: () => void;
  onLogout: () => void;
  businessName: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  alertCount,
  onOpenSettings,
  onDownloadExcel,
  onDownloadXLSM,
  onOpenGoogleSheets,
  user,
  onGoogleSignIn,
  onLogout,
  businessName,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'data-entry', label: 'Data Entry', icon: <FilePlus className="w-4 h-4" /> },
    { id: 'clients', label: 'Clients', icon: <Users className="w-4 h-4" /> },
    { id: 'vehicles', label: 'Vehicles', icon: <Car className="w-4 h-4" /> },
    { id: 'rto-work', label: 'RTO Work', icon: <FileText className="w-4 h-4" /> },
    { id: 'documents', label: 'Documents', icon: <FileCheck className="w-4 h-4" /> },
    { id: 'tractor-showroom', label: 'Tractors', icon: <Tractor className="w-4 h-4" /> },
    { id: 'exchange', label: 'Exchange', icon: <Repeat className="w-4 h-4" /> },
    { id: 'loans', label: 'Loans', icon: <Landmark className="w-4 h-4" /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'expenses', label: 'Expenses', icon: <Receipt className="w-4 h-4" /> },
    { id: 'alerts', label: 'Alerts', icon: <BellRing className="w-4 h-4" />, badge: alertCount },
    { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'archive', label: 'Archive', icon: <Archive className="w-4 h-4" /> },
  ];

  return (
    <header className="bg-slate-900 text-white shadow-xl sticky top-0 z-40 border-b border-slate-800">
      {/* Top Header Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center shadow-md text-lg">
            KA
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight text-white flex items-center gap-2">
              <span>{businessName}</span>
              <span className="text-[10px] uppercase font-semibold bg-blue-600 text-white px-2 py-0.5 rounded tracking-wider">
                RTO & Tractor ERP
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Karnataka Transport Department RTO Work & Tractor Showroom Automation
            </p>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Download XLSX Button */}
          <button
            onClick={onDownloadExcel}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-md font-medium transition shadow-sm cursor-pointer"
            title="Download Karnataka_RTO_Business_Management.xlsx with multi-sheet databases and formulas"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .XLSX</span>
          </button>

          {/* Download XLSM & VBA Button */}
          <button
            onClick={onDownloadXLSM}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md font-medium transition shadow-sm cursor-pointer"
            title="Download Karnataka_RTO_Business_Management.xlsm macro bundle & automation scripts"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Download .XLSM / VBA</span>
          </button>

          {/* Google Sheets Live Sync */}
          <button
            onClick={onOpenGoogleSheets}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-md font-medium transition shadow-sm cursor-pointer"
            title="Sync all databases directly to Google Sheets spreadsheet in Google Drive"
          >
            <CloudUpload className="w-3.5 h-3.5" />
            <span>Google Sheets Sync</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition cursor-pointer"
            title="System Settings"
            aria-label="System Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          {/* User / Google Sign-in */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
              <span className="text-xs text-slate-300 font-medium truncate max-w-[120px]">
                {user.displayName || user.email}
              </span>
              <button
                onClick={onLogout}
                className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer"
                title="Sign out of Google"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onGoogleSignIn}
              className="flex items-center gap-1.5 bg-white text-slate-900 hover:bg-slate-100 px-2.5 py-1.5 rounded-md font-semibold text-xs shadow-sm cursor-pointer"
            >
              <UserIcon className="w-3 h-3 text-blue-600" />
              <span>Connect Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-bar */}
      <div className="bg-slate-950/70 border-t border-slate-800 px-4 overflow-x-auto scrollbar-none">
        <nav className="max-w-7xl mx-auto flex items-center space-x-1 py-1 min-w-max">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`ml-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-rose-500 text-white' : 'bg-rose-600 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
