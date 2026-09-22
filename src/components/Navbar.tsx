import React from 'react';
import {
  BarChart3,
  Layers,
  Table as TableIcon,
  FolderKanban,
  UploadCloud,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  CloudCheck,
  TrendingUp,
  Calendar,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lastUpdated: string | null;
  totalLeadsCount: number;
  totalSalesAmount: number;
  onRefresh: () => void;
  onExportExcel: () => void;
  onExportCSV: () => void;
  isSyncing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  lastUpdated,
  totalLeadsCount,
  totalSalesAmount,
  onRefresh,
  onExportExcel,
  onExportCSV,
  isSyncing,
}) => {
  const tabs = [
    { id: 'dashboard', label: 'แดชบอร์ดภาพรวม', icon: BarChart3 },
    { id: 'timeline', label: 'ไทม์ไลน์ยอดขาย & Lead', icon: Calendar },
    { id: 'deepdive', label: 'เจาะลึกการวิเคราะห์', icon: TrendingUp },
    { id: 'datatable', label: 'ฐานข้อมูลและตาราง Lead', icon: TableIcon },
    { id: 'adsgroups', label: 'จัดการกลุ่ม Ads', icon: FolderKanban },
    { id: 'import', label: 'นำเข้า & ซิงค์ไฟล์', icon: UploadCloud },
  ];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Top Banner / Brand */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 font-bold text-xl">
              L
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  Lead & Sales Analytics
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CloudCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Online Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                ระบบเชื่อมโยง 3 ฐานข้อมูล (Main, Status, Sales) และจัดกลุ่ม Ads อัตโนมัติ
              </p>
            </div>
          </div>

          {/* Quick Stats & Action buttons */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Quick Metrics Badge */}
            <div className="hidden lg:flex items-center gap-4 py-1 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Leads ทั้งหมด</span>
                <span className="font-bold text-slate-800">{totalLeadsCount.toLocaleString()} ราย</span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">ยอดขายจริง (Status N)</span>
                <span className="font-bold text-blue-600">{formatCurrency(totalSalesAmount)}</span>
              </div>
            </div>

            {/* Sync Refresh button */}
            <button
              id="btn-refresh-data"
              onClick={onRefresh}
              disabled={isSyncing}
              title="ดึงข้อมูลล่าสุดจากเซิร์ฟเวอร์ Online"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">ซิงค์ข้อมูล</span>
            </button>

            {/* Export Dropdown / Buttons */}
            <div className="flex items-center gap-1">
              <button
                id="btn-export-excel"
                onClick={onExportExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Excel (.xlsx)</span>
              </button>

              <button
                id="btn-export-csv"
                onClick={onExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 sm:space-x-2 border-t border-slate-100 overflow-x-auto py-1 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
