import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Database, UploadCloud, Sparkles } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { FilterBar } from './components/FilterBar';
import { DashboardOverview } from './components/DashboardOverview';
import { DeepDiveAnalytics } from './components/DeepDiveAnalytics';
import { TimelineAnalytics } from './components/TimelineAnalytics';
import { DataTable } from './components/DataTable';
import { AdsGroupManager } from './components/AdsGroupManager';
import { DataImportExport } from './components/DataImportExport';

import {
  JoinedLead,
  RawMainRow,
  RawStatusRow,
  RawSalesRow,
  AdsGroup,
  FilterState,
} from './types';
import {
  joinDatasets,
  exportToExcel,
  exportToCSV,
} from './utils/parser';
import { generateDemoRawData, INITIAL_ADS_GROUPS } from './utils/demoData';
import {
  loadAdsGroupsFromStorage,
  saveAdsGroupsToStorage,
} from './utils/adsGroupStorage';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mainRows, setMainRows] = useState<RawMainRow[]>([]);
  const [statusRows, setStatusRows] = useState<RawStatusRow[]>([]);
  const [salesRows, setSalesRows] = useState<RawSalesRow[]>([]);
  const [adsGroups, setAdsGroups] = useState<AdsGroup[]>(() => {
    const local = loadAdsGroupsFromStorage();
    return local && local.length > 0 ? local : INITIAL_ADS_GROUPS;
  });
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Global filters
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    years: [],
    months: [],
    dateStart: '',
    dateEnd: '',
    statuses: [],
    branches: [],
    provinces: [],
    staffs: [],
    sources: [],
    jobTypes: [],
    adsGroups: [],
    adsList: [],
    salesFilter: 'all',
  });

  // Load data from Online API on mount
  const fetchOnlineData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const json = await res.json();
        const data = json.data;

        if (
          data &&
          (data.mainRows?.length > 0 ||
            data.statusRows?.length > 0 ||
            data.salesRows?.length > 0)
        ) {
          setMainRows(data.mainRows || []);
          setStatusRows(data.statusRows || []);
          setSalesRows(data.salesRows || []);
          if (data.adsGroups && data.adsGroups.length > 0) {
            setAdsGroups(data.adsGroups);
            saveAdsGroupsToStorage(data.adsGroups);
          } else {
            const local = loadAdsGroupsFromStorage();
            if (local && local.length > 0) {
              setAdsGroups(local);
              fetch('/api/ads-groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adsGroups: local }),
              }).catch(() => {});
            }
          }
          setLastUpdated(data.lastUpdated);
        } else {
          // Clean state: Only use uploaded data, no sample/demo data!
          setMainRows([]);
          setStatusRows([]);
          setSalesRows([]);
          if (data?.adsGroups && data.adsGroups.length > 0) {
            setAdsGroups(data.adsGroups);
            saveAdsGroupsToStorage(data.adsGroups);
          } else {
            const local = loadAdsGroupsFromStorage();
            if (local && local.length > 0) {
              setAdsGroups(local);
            }
          }
          setLastUpdated(data?.lastUpdated || null);
        }
      }
    } catch (err) {
      console.error('Fetch data error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchOnlineData();
  }, [fetchOnlineData]);

  // Compute joined leads
  const allJoinedLeads = useMemo(() => {
    return joinDatasets(mainRows, statusRows, salesRows, adsGroups);
  }, [mainRows, statusRows, salesRows, adsGroups]);

  // Apply filters to leads
  const filteredLeads = useMemo(() => {
    return allJoinedLeads.filter((lead) => {
      // 1. Search text
      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        const match =
          lead.leadNo.toLowerCase().includes(q) ||
          lead.customerName.toLowerCase().includes(q) ||
          lead.phone.toLowerCase().includes(q) ||
          lead.staff.toLowerCase().includes(q) ||
          lead.extractedAds.toLowerCase().includes(q) ||
          lead.branch.toLowerCase().includes(q) ||
          lead.province.toLowerCase().includes(q) ||
          lead.district.toLowerCase().includes(q) ||
          lead.source.toLowerCase().includes(q);

        if (!match) return false;
      }

      // 2. Years (multi-select)
      if (filters.years && filters.years.length > 0) {
        const yr = String(lead.createdYear || '');
        if (!filters.years.includes(yr)) {
          return false;
        }
      }

      // 3. Months (multi-select)
      if (filters.months && filters.months.length > 0) {
        if (!filters.months.includes(lead.createdMonth)) {
          return false;
        }
      }

      // 3.1 Date range (dateStart, dateEnd)
      if (filters.dateStart && lead.createdDateStr && lead.createdDateStr < filters.dateStart) {
        return false;
      }
      if (filters.dateEnd && lead.createdDateStr && lead.createdDateStr > filters.dateEnd) {
        return false;
      }

      // 4. Status
      if (filters.statuses.length > 0 && !filters.statuses.includes(lead.status)) {
        return false;
      }

      // 5. Branch
      if (filters.branches.length > 0 && !filters.branches.includes(lead.branch)) {
        return false;
      }

      // 6. Province
      if (filters.provinces.length > 0 && !filters.provinces.includes(lead.province)) {
        return false;
      }

      // 7. Staff
      if (filters.staffs.length > 0 && !filters.staffs.includes(lead.staff)) {
        return false;
      }

      // 8. Source
      if (filters.sources.length > 0 && !filters.sources.includes(lead.source)) {
        return false;
      }

      // 9. Job type
      if (filters.jobTypes.length > 0 && !filters.jobTypes.includes(lead.jobType)) {
        return false;
      }

      // 10. Ads group
      if (filters.adsGroups.length > 0 && !filters.adsGroups.includes(lead.adsGroup)) {
        return false;
      }

      // 10.1 Individual Ads
      if (filters.adsList && filters.adsList.length > 0 && !filters.adsList.includes(lead.extractedAds)) {
        return false;
      }

      // 11. Sales filter
      if (filters.salesFilter === 'with_sales' && !lead.hasSales) {
        return false;
      }
      if (filters.salesFilter === 'no_sales' && lead.hasSales) {
        return false;
      }

      return true;
    });
  }, [allJoinedLeads, filters]);

  // Total summary for header
  const totalLeadsCount = filteredLeads.length;
  const totalSalesAmount = useMemo(
    () => filteredLeads.reduce((sum, l) => sum + l.totalSales, 0),
    [filteredLeads]
  );

  // File stats
  const fileStats = useMemo(() => {
    const validSalesCount = salesRows.filter((s) => s.salesStatus === 'N').length;
    return {
      mainCount: mainRows.length,
      statusCount: statusRows.length,
      salesCount: salesRows.length,
      validSalesCount,
    };
  }, [mainRows, statusRows, salesRows]);

  // Handlers
  const handleUploadAndSync = async (
    newMain: RawMainRow[] | null,
    newStatus: RawStatusRow[] | null,
    newSales: RawSalesRow[] | null
  ) => {
    setIsSyncing(true);
    // Instant client state update so dashboard reflects immediately
    if (newMain) setMainRows(newMain);
    if (newStatus) setStatusRows(newStatus);
    if (newSales) setSalesRows(newSales);
    setLastUpdated(new Date().toISOString());
    setActiveTab('dashboard'); // Navigate to dashboard immediately

    try {
      const payload: any = { adsGroups };
      if (newMain) payload.mainRows = newMain;
      if (newStatus) payload.statusRows = newStatus;
      if (newSales) payload.salesRows = newSales;

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.warn('Server upload returned status', res.status, '(Client state remains active)');
      }
    } catch (err) {
      console.warn('Server upload sync note (Client state active in browser):', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveAdsGroups = async (groups: AdsGroup[]) => {
    setIsSyncing(true);
    // Instant UI update and durable local storage + backup
    setAdsGroups(groups);
    saveAdsGroupsToStorage(groups);

    try {
      const res = await fetch('/api/ads-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adsGroups: groups }),
      });
      if (!res.ok) {
        console.warn('Server sync returned non-ok, but saved in localStorage');
      }
    } catch (err) {
      console.error('Save ads groups error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearData = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/clear', { method: 'POST' });
      if (res.ok) {
        setMainRows([]);
        setStatusRows([]);
        setSalesRows([]);
        setLastUpdated(new Date().toISOString());
        setActiveTab('import'); // Bring user directly to the upload dropzones!
      }
    } catch (err) {
      console.error('Clear data error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoadDemoData = async () => {
    const demo = generateDemoRawData();
    await handleUploadAndSync(demo.main, demo.status, demo.sales);
    setAdsGroups(demo.adsGroups);
  };

  const handleExportExcel = () => {
    exportToExcel(filteredLeads, `Lead_Sales_Report_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportCSV = () => {
    exportToCSV(filteredLeads, `Lead_Sales_Report_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lastUpdated={lastUpdated}
        totalLeadsCount={totalLeadsCount}
        totalSalesAmount={totalSalesAmount}
        onRefresh={fetchOnlineData}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        isSyncing={isSyncing}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Empty Database Banner if 0 records */}
        {allJoinedLeads.length === 0 && activeTab !== 'import' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-xl mx-auto shadow-xs my-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">ฐานข้อมูลว่างเปล่า (0 รายการ)</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                ระบบพร้อมรับข้อมูลจริง กรุณาอัปโหลดไฟล์ข้อมูลทั้ง 3 ส่วน (Main, Status, Sales) เพื่อเริ่มต้นวิเคราะห์ผล
              </p>
            </div>
            <div className="flex items-center justify-center pt-2">
              <button
                onClick={() => setActiveTab('import')}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>ไปที่หน้าอัปโหลดไฟล์</span>
              </button>
            </div>
          </div>
        )}

        {/* Global Filter Bar (shown on Dashboard, Deepdive, and DataTable if data exists) */}
        {activeTab !== 'import' && allJoinedLeads.length > 0 && (
          <FilterBar
            filters={filters}
            onFilterChange={setFilters}
            leads={allJoinedLeads}
            adsGroups={adsGroups}
            totalFilteredCount={filteredLeads.length}
          />
        )}

        {/* Tab 1: Overview Dashboard */}
        {activeTab === 'dashboard' && allJoinedLeads.length > 0 && (
          <DashboardOverview
            leads={filteredLeads}
            adsGroups={adsGroups}
            onNavigateToDetail={() => setActiveTab('deepdive')}
          />
        )}

        {/* Tab 2: Timeline Analytics (Daily, Monthly, Sales & Leads) */}
        {activeTab === 'timeline' && allJoinedLeads.length > 0 && (
          <TimelineAnalytics leads={filteredLeads} />
        )}

        {/* Tab 3: Deep Dive Analytics */}
        {activeTab === 'deepdive' && allJoinedLeads.length > 0 && (
          <DeepDiveAnalytics leads={filteredLeads} adsGroups={adsGroups} />
        )}

        {/* Tab 4: Data Table */}
        {activeTab === 'datatable' && allJoinedLeads.length > 0 && (
          <DataTable
            leads={filteredLeads}
            onExportExcel={handleExportExcel}
            onExportCSV={handleExportCSV}
          />
        )}

        {/* Tab 5: Ads Group Manager */}
        {activeTab === 'adsgroups' && (
          <AdsGroupManager
            adsGroups={adsGroups}
            leads={allJoinedLeads}
            onSaveAdsGroups={handleSaveAdsGroups}
            isSaving={isSyncing}
          />
        )}

        {/* Tab 6: Data Import & Online Sync */}
        {activeTab === 'import' && (
          <DataImportExport
            onUploadAndSync={handleUploadAndSync}
            onClearData={handleClearData}
            isSyncing={isSyncing}
            fileStats={fileStats}
            lastUpdated={lastUpdated}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            ระบบวิเคราะห์ Lead & สรุปยอดขายแบบเรียลไทม์ (Main + Status + Sales)
          </span>
          <span>
            ซิงค์และเชื่อมโยงฐานข้อมูลอัตโนมัติด้วยรหัสลูกค้า (Lead No)
          </span>
        </div>
      </footer>
    </div>
  );
}
