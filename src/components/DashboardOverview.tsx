import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Users,
  CheckCircle2,
  DollarSign,
  Percent,
  Receipt,
  ArrowUpRight,
  Sparkles,
  Layers,
  Award,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { JoinedLead, AdsGroup } from '../types';
import { DrilldownLeadListModal } from './DrilldownLeadListModal';

interface DashboardOverviewProps {
  leads: JoinedLead[];
  adsGroups: AdsGroup[];
  onSelectDimension?: (dim: string, value: string) => void;
  onNavigateToDetail?: () => void;
}

const COLORS = [
  '#2563EB', // Blue
  '#10B981', // Green
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#F97316', // Orange
  '#64748B', // Slate
];

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  leads,
  adsGroups,
  onSelectDimension,
  onNavigateToDetail,
}) => {
  const [adsViewMode, setAdsViewMode] = useState<'group' | 'individual'>('group');
  const [drilldownModal, setDrilldownModal] = useState<{
    title: string;
    subtitle: string;
    leads: JoinedLead[];
  } | null>(null);

  // Key KPI Calculations
  const stats = useMemo(() => {
    const totalLeads = leads.length;
    const leadsWithSales = leads.filter((l) => l.hasSales).length;
    const totalSalesAmount = leads.reduce((sum, l) => sum + l.totalSales, 0);
    const conversionRate = totalLeads > 0 ? (leadsWithSales / totalLeads) * 100 : 0;
    const avgDealSize = leadsWithSales > 0 ? totalSalesAmount / leadsWithSales : 0;
    const totalTransactions = leads.reduce((sum, l) => sum + l.salesCount, 0);

    return {
      totalLeads,
      leadsWithSales,
      totalSalesAmount,
      conversionRate,
      avgDealSize,
      totalTransactions,
    };
  }, [leads]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // 1. Timeline Trend (Group by Created Month / Date)
  const timelineData = useMemo(() => {
    const dateMap = new Map<string, { label: string; leadsCount: number; salesAmount: number; wonCount: number }>();

    leads.forEach((lead) => {
      const key = lead.createdDateStr || 'ไม่ระบุ';
      const label = lead.createdDateFormattedThai || key;

      if (!dateMap.has(key)) {
        dateMap.set(key, { label, leadsCount: 0, salesAmount: 0, wonCount: 0 });
      }
      const entry = dateMap.get(key)!;
      entry.leadsCount += 1;
      entry.salesAmount += lead.totalSales;
      if (lead.hasSales) entry.wonCount += 1;
    });

    // Sort only the grouped unique dates
    const sortedKeys = Array.from(dateMap.keys()).sort();
    return sortedKeys.slice(-20).map((k) => dateMap.get(k)!);
  }, [leads]);

  // 2. Performance by Source (Marketing Channels)
  const sourceData = useMemo(() => {
    const map = new Map<string, { name: string; leads: number; sales: number; won: number }>();
    leads.forEach((l) => {
      const src = l.source || 'ไม่ระบุ';
      if (!map.has(src)) map.set(src, { name: src, leads: 0, sales: 0, won: 0 });
      const entry = map.get(src)!;
      entry.leads += 1;
      entry.sales += l.totalSales;
      if (l.hasSales) entry.won += 1;
    });

    return Array.from(map.values()).sort((a, b) => b.sales - a.sales);
  }, [leads]);

  // 3. Performance by Ads vs Ads Group
  const adsData = useMemo(() => {
    const map = new Map<string, { name: string; leads: number; sales: number; won: number }>();
    leads.forEach((l) => {
      const key = adsViewMode === 'group' ? l.adsGroup : l.extractedAds;
      const name = key || 'ไม่ระบุ Ads';
      if (!map.has(name)) map.set(name, { name, leads: 0, sales: 0, won: 0 });
      const entry = map.get(name)!;
      entry.leads += 1;
      entry.sales += l.totalSales;
      if (l.hasSales) entry.won += 1;
    });

    return Array.from(map.values())
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 8); // Top 8
  }, [leads, adsViewMode]);

  // 4. Status breakdown for pie chart
  const statusData = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach((l) => {
      const st = l.status || 'ไม่ระบุ';
      map.set(st, (map.get(st) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [leads]);

  // 5. Branch Sales Leaderboard
  const branchData = useMemo(() => {
    const map = new Map<string, { name: string; leads: number; sales: number; won: number }>();
    leads.forEach((l) => {
      const branch = l.branch || 'สำนักงานใหญ่';
      if (!map.has(branch)) map.set(branch, { name: branch, leads: 0, sales: 0, won: 0 });
      const entry = map.get(branch)!;
      entry.leads += 1;
      entry.sales += l.totalSales;
      if (l.hasSales) entry.won += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.sales - a.sales);
  }, [leads]);

  // 6. Job type distribution
  const jobTypeData = useMemo(() => {
    const map = new Map<string, { name: string; sales: number; leads: number }>();
    leads.forEach((l) => {
      const job = l.jobType || 'ทั่วไป';
      if (!map.has(job)) map.set(job, { name: job, sales: 0, leads: 0 });
      const entry = map.get(job)!;
      entry.leads += 1;
      entry.sales += l.totalSales;
    });
    return Array.from(map.values()).sort((a, b) => b.sales - a.sales);
  }, [leads]);

  return (
    <div className="space-y-6">
      {/* Interactive Drill-down Hint Banner */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-blue-800">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
          <span>
            💡 <strong>เจาะลึกข้อมูล (Interactive Drill-down):</strong> สามารถ <strong>Double Click (ดับเบิ้ลคลิก)</strong> ที่การ์ดสถิติ, กราฟ, หรือรายการสถานะ/สาขา เพื่อเปิดดูรายชื่อ Lead และรายการขายจริงทั้งหมดได้ทันที
          </span>
        </div>
      </div>

      {/* Top Section: Executive KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Leads */}
        <div
          onDoubleClick={() =>
            setDrilldownModal({
              title: 'รายการ Lead ทั้งหมดที่ตรงตามตัวกรอง',
              subtitle: `จำนวน ${stats.totalLeads.toLocaleString()} ราย (จากข้อมูล 3 ฐานข้อมูลที่เชื่อมโยงกัน)`,
              leads,
            })
          }
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer select-none group"
          title="ดับเบิ้ลคลิกเพื่อดูรายการ Lead ทั้งหมด"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-blue-600 transition-colors">
              จำนวน Lead ทั้งหมด
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
              {stats.totalLeads.toLocaleString()} <span className="text-sm font-normal text-slate-500">ราย</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span className="font-medium text-blue-700">เชื่อมโยงจาก 3 ฐานข้อมูล</span>
              <span className="text-[10px] text-blue-500 underline opacity-0 group-hover:opacity-100 transition-opacity">Double-click</span>
            </p>
          </div>
        </div>

        {/* Metric 2: Won Leads */}
        <div
          onDoubleClick={() =>
            setDrilldownModal({
              title: 'รายการ Lead ที่เกิดยอดขายจริง (Status N)',
              subtitle: `จำนวน ${stats.leadsWithSales.toLocaleString()} ราย, อัตราความสำเร็จ ${stats.conversionRate.toFixed(1)}%`,
              leads: leads.filter((l) => l.hasSales),
            })
          }
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer select-none group"
          title="ดับเบิ้ลคลิกเพื่อดูรายการ Lead ที่ปิดการขายได้"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-emerald-600 transition-colors">
              Lead ที่เกิดยอดขายจริง
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-bold text-emerald-700">
              {stats.leadsWithSales.toLocaleString()} <span className="text-sm font-normal text-slate-500">ราย</span>
            </h3>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
              <span>อัตราสำเร็จ (Win Rate)</span>
              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                {stats.conversionRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Total Sales Amount */}
        <div
          onDoubleClick={() =>
            setDrilldownModal({
              title: 'รายการ Lead ที่มียอดขายจริง (Status N)',
              subtitle: `ยอดขายรวม ${formatCurrency(stats.totalSalesAmount)} จาก ${stats.leadsWithSales.toLocaleString()} ราย`,
              leads: leads.filter((l) => l.hasSales),
            })
          }
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-blue-500 hover:shadow-md transition-all cursor-pointer select-none group"
          title="ดับเบิ้ลคลิกเพื่อดูรายการ Lead ที่มียอดขาย"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-blue-600 transition-colors">
              ยอดขายเกิดขึ้นจริง (Status N)
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/30 group-hover:scale-105 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight group-hover:text-blue-700 transition-colors">
              {formatCurrency(stats.totalSalesAmount)}
            </h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>รวม {stats.totalTransactions.toLocaleString()} รายการชำระเงิน</span>
              <span className="text-[10px] text-blue-500 underline opacity-0 group-hover:opacity-100 transition-opacity">Double-click</span>
            </p>
          </div>
        </div>

        {/* Metric 4: Average Deal Size */}
        <div
          onDoubleClick={() =>
            setDrilldownModal({
              title: 'รายการ Lead ที่มียอดขายเฉลี่ย',
              subtitle: `ยอดขายเฉลี่ย ${formatCurrency(stats.avgDealSize)} ต่อราย`,
              leads: leads.filter((l) => l.hasSales),
            })
          }
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-purple-400 hover:shadow-md transition-all cursor-pointer select-none group"
          title="ดับเบิ้ลคลิกเพื่อดูรายการ Lead ที่ปิดการขายได้"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-purple-600 transition-colors">
              ยอดขายเฉลี่ยต่อ Lead ที่ซื้อ
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
              {formatCurrency(stats.avgDealSize)}
            </h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>จาก Lead ที่ปิดการขายได้ทั้งหมด</span>
              <span className="text-[10px] text-purple-500 underline opacity-0 group-hover:opacity-100 transition-opacity">Double-click</span>
            </p>
          </div>
        </div>
      </div>

      {/* Row 2: Timeline Trends & Marketing Source Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Trends Chart (2 Columns) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                แนวโน้มยอดขายและจำนวน Lead ตามช่วงเวลา
              </h3>
              <p className="text-xs text-slate-500">
                วิเคราะห์การเกิด Lead และยอดชำระเงินจริงตามวันที่สร้าง Lead (L26...)
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    domain={[0, 'auto']}
                  />
                  <Tooltip
                    formatter={(val: any, name?: any) => {
                      if (name === 'ยอดขายจริง (บาท)') return [formatCurrency(Number(val)), String(name)];
                      return [`${val} ราย`, String(name || '')];
                    }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="salesAmount"
                    name="ยอดขายจริง (บาท)"
                    stroke="#2563EB"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                    isAnimationActive={false}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="leadsCount"
                    name="จำนวน Lead ทั้งหมด"
                    fill="#94A3B8"
                    radius={[4, 4, 0, 0]}
                    barSize={14}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                ไม่มีข้อมูลที่ตรงกับตัวกรอง
              </div>
            )}
          </div>
        </div>

        {/* Lead Status Breakdown (1 Column) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              สัดส่วนสถานะของ Lead
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              จำแนกตามขั้นตอนการติดตามงานของทีมขาย
            </p>
          </div>

          <div className="h-56 w-full relative">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [`${value} ราย`, name]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
            {/* Center Summary */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-slate-800">{stats.totalLeads}</span>
              <span className="text-[10px] uppercase text-slate-400 font-semibold">Leads</span>
            </div>
          </div>

          {/* Mini Legend List */}
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
            {statusData.slice(0, 5).map((item, idx) => {
              const percent = stats.totalLeads > 0 ? ((item.value / stats.totalLeads) * 100).toFixed(1) : '0';
              return (
                <div
                  key={item.name}
                  onDoubleClick={() =>
                    setDrilldownModal({
                      title: `เจาะลึกสถานะ Lead: ${item.name}`,
                      subtitle: `จำนวน ${item.value.toLocaleString()} ราย (${percent}%)`,
                      leads: leads.filter((l) => (l.status || 'ไม่ระบุ') === item.name),
                    })
                  }
                  className="flex items-center justify-between text-slate-600 hover:bg-slate-100 p-1 rounded-md cursor-pointer transition-colors"
                  title="ดับเบิ้ลคลิกเพื่อดูรายการ Lead ในสถานะนี้"
                >
                  <div className="flex items-center gap-2 truncate max-w-[180px]">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>
                  <span className="font-semibold text-slate-800 shrink-0">
                    {item.value} ({percent}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: Ads Performance & Branch Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ads Performance with Group toggle */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                ยอดขายตาม Ads ที่ดึงดูด Lead เข้ามา
              </h3>
              <p className="text-xs text-slate-500">
                สกัดจาก Col Y ของไฟล์ Main เพื่อดูความคุ้มค่าของการตลาด
              </p>
            </div>

            {/* Toggle view mode: Group vs Individual Ads */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs self-start">
              <button
                id="btn-view-ads-group"
                onClick={() => setAdsViewMode('group')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  adsViewMode === 'group'
                    ? 'bg-white text-indigo-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ดูตามกลุ่ม Ads
              </button>
              <button
                id="btn-view-ads-item"
                onClick={() => setAdsViewMode('individual')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  adsViewMode === 'individual'
                    ? 'bg-white text-indigo-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ดูตามชื่อ Ads
              </button>
            </div>
          </div>

          <div className="h-72 w-full">
            {adsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={adsData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 30, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#334155' }}
                    width={110}
                    tickFormatter={(name) => (name.length > 16 ? `${name.substring(0, 16)}...` : name)}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), 'ยอดขายจริง']}
                    labelFormatter={(label) => `Ads: ${label}`}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                  />
                  <Bar dataKey="sales" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false}>
                    {adsData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                ไม่มีข้อมูล Ads
              </div>
            )}
          </div>
        </div>

        {/* Branch & Source Leaderboard */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              ยอดขายและผลงานแยกตามสาขา (Branches)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              ประสิทธิภาพการปิดการขายของแต่ละสาขาและพื้นที่
            </p>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {branchData.map((b, idx) => {
              const maxSales = branchData[0]?.sales || 1;
              const percentBar = Math.min(100, (b.sales / maxSales) * 100);
              const convRate = b.leads > 0 ? ((b.won / b.leads) * 100).toFixed(1) : '0';

              return (
                <div
                  key={b.name}
                  onDoubleClick={() =>
                    setDrilldownModal({
                      title: `เจาะลึก Lead สาขา: ${b.name}`,
                      subtitle: `จำนวน ${b.leads.toLocaleString()} ราย, ปิดการขายได้ ${b.won} ราย, ยอดขายจริง ${formatCurrency(b.sales)}`,
                      leads: leads.filter((l) => (l.branch || 'สำนักงานใหญ่') === b.name),
                    })
                  }
                  className="p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer transition-all group select-none"
                  title="ดับเบิ้ลคลิกเพื่อดูรายการ Lead ของสาขานี้"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5 group-hover:text-blue-700">
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-[10px] flex items-center justify-center font-bold text-slate-600">
                        {idx + 1}
                      </span>
                      {b.name}
                    </span>
                    <span className="font-bold text-blue-700">{formatCurrency(b.sales)}</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden my-1.5">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${percentBar}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {b.leads} Leads ({b.won} รายปิดการขาย)
                    </span>
                    <span className="text-emerald-600 font-semibold">Win Rate: {convRate}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {onNavigateToDetail && (
            <button
              onClick={onNavigateToDetail}
              className="mt-4 w-full py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>ดูรายงานและเจาะลึกมิติข้อมูลทั้งหมด</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Drilldown Lead List Modal */}
      {drilldownModal && (
        <DrilldownLeadListModal
          title={drilldownModal.title}
          subtitle={drilldownModal.subtitle}
          leads={drilldownModal.leads}
          onClose={() => setDrilldownModal(null)}
        />
      )}
    </div>
  );
};
