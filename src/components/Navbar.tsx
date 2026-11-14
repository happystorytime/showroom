import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Building2,
  FilePlus2,
  Users,
  Car,
  ClipboardCheck,
  FolderOpen,
  BellRing,
  BarChart3,
  Archive,
  Search,
  FileSpreadsheet,
  Code2,
  CloudUpload,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import type { Client, RTOApplication, Showroom, SystemSettings, Vehicle } from '../types';
import { runGlobalSearch } from '../utils/pureCalculations';

export type AppTab =
  | 'dashboard'
  | 'showrooms'
  | 'data-entry'
  | 'clients'
  | 'vehicles'
  | 'rto-work'
  | 'documents'
  | 'alerts'
  | 'reports'
  | 'archive';

interface NavbarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  showrooms: Showroom[];
  activeShowroomId: string;
  onShowroomChange: (showroomId: string) => void;
  clients: Client[];
  vehicles: Vehicle[];
  applications: RTOApplication[];
  onGlobalSelect: (target: { tab: AppTab; searchTerm: string }) => void;
  alertCount: number;
  settings: SystemSettings;
  userEmail?: string | null;
  userName?: string | null;
  onExportExcel: () => void;
  onOpenVba: () => void;
  onOpenGoogleSheets: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
  children: React.ReactNode;
}

interface NavItem {
  id: AppTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
  badge?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  showrooms,
  activeShowroomId,
  onShowroomChange,
  clients,
  vehicles,
  applications,
  onGlobalSelect,
  alertCount,
  settings,
  userEmail,
  userName,
  onExportExcel,
  onOpenVba,
  onOpenGoogleSheets,
  onOpenSettings,
  onSignOut,
  sidebarCollapsed,
  onToggleSidebarCollapse,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { clients: [], vehicles: [], applications: [] };
    return runGlobalSearch(searchQuery, { clients, vehicles, applications });
  }, [searchQuery, clients, vehicles, applications]);

  const hasResults =
    searchResults.clients.length > 0 ||
    searchResults.vehicles.length > 0 ||
    searchResults.applications.length > 0;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },
    { id: 'showrooms', label: 'Showrooms', icon: Building2, group: 'Overview' },
    { id: 'data-entry', label: 'New RTO Entry', icon: FilePlus2, group: 'Operations' },
    { id: 'rto-work', label: 'RTO Applications', icon: ClipboardCheck, group: 'Operations' },
    { id: 'documents', label: 'Document Vault', icon: FolderOpen, group: 'Operations' },
    { id: 'clients', label: 'Common Clients', icon: Users, group: 'Common Registry' },
    { id: 'vehicles', label: 'Vehicle Registry', icon: Car, group: 'Common Registry' },
    { id: 'alerts', label: 'Reminders & Alerts', icon: BellRing, group: 'Monitoring', badge: alertCount },
    { id: 'reports', label: 'Reports & Export', icon: BarChart3, group: 'Monitoring' },
    { id: 'archive', label: 'Safety Archive', icon: Archive, group: 'Monitoring' },
  ];

  const groups = ['Overview', 'Operations', 'Common Registry', 'Monitoring'];

  const activeNavLabel = navItems.find((n) => n.id === activeTab)?.label || 'Dashboard';
  const activeShowroom = showrooms.find((s) => s.id === activeShowroomId);

  const handleSelectNav = (tab: AppTab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  const handlePickSearch = (tab: AppTab, term: string) => {
    onGlobalSelect({ tab, searchTerm: term });
    setSearchOpen(false);
    setSearchQuery('');
  };

  const renderSidebarContent = (isMobile: boolean) => {
    const compact = !isMobile && sidebarCollapsed;
    return (
      <div className="flex h-full flex-col bg-slate-900 text-slate-200 select-none">
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            {!compact && (
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold text-white">
                  Karnataka RTO
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  Multi-Showroom Desk
                </p>
              </div>
            )}
          </div>
          {!isMobile ? (
            <button
              type="button"
              onClick={onToggleSidebarCollapse}
              title={compact ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden lg:inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              {compact ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {groups.map((grp) => {
            const items = navItems.filter((n) => n.group === grp);
            return (
              <div key={grp}>
                {!compact && (
                  <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {grp}
                  </p>
                )}
                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectNav(item.id)}
                        title={compact ? item.label : undefined}
                        className={`w-full flex items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <Icon className="h-4 w-4 shrink-0" />
                          {!compact && <span className="truncate">{item.label}</span>}
                        </span>
                        {!compact && item.badge !== undefined && item.badge > 0 && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                              isActive
                                ? 'bg-blue-700 text-white'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom Quick Tools & Account */}
        <div className="border-t border-slate-800 p-3 space-y-2">
          {!compact && (
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={onExportExcel}
                className="flex items-center justify-center gap-1.5 rounded-md bg-slate-800 px-2 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                <span>.XLSX</span>
              </button>
              <button
                type="button"
                onClick={onOpenGoogleSheets}
                className="flex items-center justify-center gap-1.5 rounded-md bg-slate-800 px-2 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <CloudUpload className="h-3.5 w-3.5 text-sky-400" />
                <span>Sheets</span>
              </button>
              <button
                type="button"
                onClick={onOpenVba}
                className="flex items-center justify-center gap-1.5 rounded-md bg-slate-800 px-2 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <Code2 className="h-3.5 w-3.5 text-amber-400" />
                <span>Macros</span>
              </button>
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex items-center justify-center gap-1.5 rounded-md bg-slate-800 px-2 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <Settings className="h-3.5 w-3.5 text-slate-300" />
                <span>Settings</span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-800/70 px-2.5 py-2">
            {!compact && (
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-white">
                  {userName || 'RTO Agent'}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {userEmail || settings.email}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={onSignOut}
              title="Sign Out"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-300 hover:bg-red-500/20 hover:text-red-300 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 print:hidden transition-all duration-200 ${
          sidebarCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        <div className="sticky top-0 h-screen">{renderSidebarContent(false)}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden print:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-64 max-w-[85vw] h-full shadow-xl">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur px-4 sm:px-6 py-3 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex lg:hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate font-display text-base sm:text-lg font-bold text-slate-900">
                  {activeNavLabel}
                </h1>
                <p className="truncate text-xs text-slate-500">
                  {settings.businessName} ·{' '}
                  <span className="font-medium text-blue-700">
                    {activeShowroom ? `${activeShowroom.name} (${activeShowroom.code})` : 'All Partner Showrooms'}
                  </span>
                </p>
              </div>
            </div>

            {/* Right controls: Global Search + Showroom Switcher */}
            <div className="flex items-center gap-2.5 flex-1 sm:flex-initial justify-end">
              {/* Global Search */}
              <div ref={searchBoxRef} className="relative w-full max-w-xs sm:w-64 md:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  placeholder="Search client, mobile, KA reg..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
                />

                {searchOpen && searchQuery.trim().length > 0 && (
                  <div className="absolute right-0 mt-1.5 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden z-50">
                    {!hasResults ? (
                      <div className="px-4 py-6 text-center text-xs text-slate-500">
                        No clients, vehicles, or applications match &ldquo;{searchQuery}&rdquo;
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                        {searchResults.clients.length > 0 && (
                          <div className="p-2">
                            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Common Clients
                            </p>
                            {searchResults.clients.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => handlePickSearch('clients', c.mobile || c.name)}
                                className="w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-slate-50"
                              >
                                <span className="font-medium text-slate-900">{c.name}</span>
                                <span className="font-mono text-slate-500">{c.mobile}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {searchResults.vehicles.length > 0 && (
                          <div className="p-2">
                            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Vehicles
                            </p>
                            {searchResults.vehicles.map((v) => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => handlePickSearch('vehicles', v.vehicleNumber)}
                                className="w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-slate-50"
                              >
                                <span className="font-mono font-semibold text-slate-900">
                                  {v.vehicleNumber}
                                </span>
                                <span className="truncate ml-2 text-slate-500">{v.ownerName}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {searchResults.applications.length > 0 && (
                          <div className="p-2">
                            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              RTO Applications
                            </p>
                            {searchResults.applications.map((a) => (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => handlePickSearch('rto-work', a.id)}
                                className="w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-slate-50"
                              >
                                <span className="font-medium text-slate-900 truncate">
                                  {a.id} · {a.workType}
                                </span>
                                <span className="font-mono text-blue-700 ml-2 shrink-0">
                                  {a.vehicleNumber}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Showroom Scope Selector */}
              <div className="shrink-0">
                <label htmlFor="global-showroom-select" className="sr-only">
                  Filter by Showroom
                </label>
                <select
                  id="global-showroom-select"
                  value={activeShowroomId}
                  onChange={(e) => onShowroomChange(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs sm:text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  <option value="ALL">All Showrooms ({showrooms.length})</option>
                  {showrooms.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
