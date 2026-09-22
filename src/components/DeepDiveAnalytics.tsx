import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  PieChart as PieIcon,
  LineChart as LineIcon,
  Table as TableIcon,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Download,
  Building2,
  MapPin,
  UserCheck,
  Calendar,
  Layers,
  Sparkles,
  Target,
  Briefcase,
  SlidersHorizontal,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { JoinedLead, AdsGroup } from '../types';
import { DrilldownLeadListModal } from './DrilldownLeadListModal';

interface DeepDiveAnalyticsProps {
  leads: JoinedLead[];
  adsGroups: AdsGroup[];
}

type DimensionKey =
  | 'status'
  | 'branch'
  | 'province'
  | 'district'
  | 'createdMonth'
  | 'createdYear'
  | 'staff'
  | 'source'
  | 'jobType'
  | 'extractedAds'
  | 'adsGroup';

type SortOption =
  | 'sales_desc'
  | 'sales_asc'
  | 'count_desc'
  | 'count_asc'
  | 'rate_desc'
  | 'rate_asc'
  | 'avg_desc';

const COLORS = [
  '#2563EB', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899',
  '#06B6D4', '#6366F1', '#F97316', '#14B8A6', '#64748B'
];

export const DeepDiveAnalytics: React.FC<DeepDiveAnalyticsProps> = ({ leads, adsGroups }) => {
  const [selectedDimension, setSelectedDimension] = useState<DimensionKey>('status');
  const [sortBy, setSortBy] = useState<SortOption>('sales_desc');
  const [chartType, setChartType] = useState<'bar' | 'hbar' | 'pie' | 'line'>('hbar');
  const [viewLayout, setViewLayout] = useState<'both' | 'chart' | 'table'>('both');
  const [drilldownModal, setDrilldownModal] = useState<{
    title: string;
    subtitle: string;
    leads: JoinedLead[];
  } | null>(null);

  const dimensionOptions = [
    { key: 'status', label: 'สถานะของ Lead (Status)', icon: Sparkles },
    { key: 'branch', label: 'สาขา (Branch)', icon: Building2 },
    { key: 'province', label: 'จังหวัด (Province)', icon: MapPin },
    { key: 'district', label: 'อำเภอ (District)', icon: MapPin },
    { key: 'createdMonth', label: 'เดือนที่สร้าง Lead (Month)', icon: Calendar },
    { key: 'createdYear', label: 'ปีที่สร้าง Lead (Year)', icon: Calendar },
    { key: 'staff', label: 'ชื่อพนักงานขาย (Staff)', icon: UserCheck },
    { key: 'source', label: 'แหล่งที่มาของ Lead (Source)', icon: Target },
    { key: 'jobType', label: 'ประเภทหน้างาน (Job Type)', icon: Briefcase },
    { key: 'extractedAds', label: 'Ads ที่ดึงดูดลูกค้า (Ads Name)', icon: Layers },
    { key: 'adsGroup', label: 'กลุ่ม Ads ที่จัดกลุ่มไว้ (Ads Group)', icon: Layers },
  ];

  const totalAllSales = useMemo(() => leads.reduce((sum, l) => sum + l.totalSales, 0), [leads]);
  const totalAllLeads = leads.length;

  // Aggregate by chosen dimension
  const aggregatedData = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        label: string;
        leadCount: number;
        wonCount: number;
        totalSales: number;
        leadsList: JoinedLead[];
      }
    >();

    leads.forEach((l) => {
      let val = '';
      if (selectedDimension === 'status') val = l.status;
      else if (selectedDimension === 'branch') val = l.branch;
      else if (selectedDimension === 'province') val = l.province;
      else if (selectedDimension === 'district') val = l.district;
      else if (selectedDimension === 'createdMonth') {
        const monthNames: Record<string, string> = {
          '01': 'มกราคม (01)', '02': 'กุมภาพันธ์ (02)', '03': 'มีนาคม (03)',
          '04': 'เมษายน (04)', '05': 'พฤษภาคม (05)', '06': 'มิถุนายน (06)',
          '07': 'กรกฎาคม (07)', '08': 'สิงหาคม (08)', '09': 'กันยายน (09)',
          '10': 'ตุลาคม (10)', '11': 'พฤศจิกายน (11)', '12': 'ธันวาคม (12)'
        };
        val = monthNames[l.createdMonth] || `เดือน ${l.createdMonth}`;
      } else if (selectedDimension === 'createdYear') {
        val = `ปี ${l.createdYear}`;
      } else if (selectedDimension === 'staff') val = l.staff;
      else if (selectedDimension === 'source') val = l.source;
      else if (selectedDimension === 'jobType') val = l.jobType;
      else if (selectedDimension === 'extractedAds') val = l.extractedAds;
      else if (selectedDimension === 'adsGroup') val = l.adsGroup;

      const label = val || 'ไม่ระบุ';
      if (!map.has(label)) {
        map.set(label, {
          key: label,
          label,
          leadCount: 0,
          wonCount: 0,
          totalSales: 0,
          leadsList: [] as JoinedLead[],
        });
      }
      const entry = map.get(label)!;
      entry.leadCount += 1;
      entry.totalSales += l.totalSales;
      if (l.hasSales) entry.wonCount += 1;
      entry.leadsList.push(l);
    });

    const list = Array.from(map.values()).map((item) => {
      const conversionRate = item.leadCount > 0 ? (item.wonCount / item.leadCount) * 100 : 0;
      const avgDealSize = item.wonCount > 0 ? item.totalSales / item.wonCount : 0;
      const percentLeads = totalAllLeads > 0 ? (item.leadCount / totalAllLeads) * 100 : 0;
      const percentSales = totalAllSales > 0 ? (item.totalSales / totalAllSales) * 100 : 0;

      return {
        ...item,
        conversionRate,
        avgDealSize,
        percentLeads,
        percentSales,
      };
    });

    // Sort according to user requested SortBy
    list.sort((a, b) => {
      switch (sortBy) {
        case 'sales_desc':
          return b.totalSales - a.totalSales;
        case 'sales_asc':
          return a.totalSales - b.totalSales;
        case 'count_desc':
          return b.leadCount - a.leadCount;
        case 'count_asc':
          return a.leadCount - b.leadCount;
        case 'rate_desc':
          return b.conversionRate - a.conversionRate;
        case 'rate_asc':
          return a.conversionRate - b.conversionRate;
        case 'avg_desc':
          return b.avgDealSize - a.avgDealSize;
        default:
          return b.totalSales - a.totalSales;
      }
    });

    return list;
  }, [leads, selectedDimension, sortBy, totalAllLeads, totalAllSales]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const currentDimLabel = dimensionOptions.find((d) => d.key === selectedDimension)?.label || '';

  const handleRowDoubleClick = (row: (typeof aggregatedData)[0]) => {
    setDrilldownModal({
      title: `เจาะลึก Lead [${currentDimLabel}]: ${row.label}`,
      subtitle: `จำนวน ${row.leadCount.toLocaleString()} ราย, ปิดการขายได้ ${row.wonCount} ราย, ยอดขายจริง ${formatCurrency(row.totalSales)}`,
      leads: row.leadsList,
    });
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar: Dimension Selector & Sorting & View Modes */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Dimension Selector as Dropdown */}
          <div className="flex-1 min-w-[280px] max-w-xl">
            <label
              htmlFor="select-drilldown-dimension"
              className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              <span>เลือกมิติข้อมูลสำหรับเจาะลึก (Drill-down Dimension):</span>
            </label>
            <div className="relative">
              <select
                id="select-drilldown-dimension"
                value={selectedDimension}
                onChange={(e) => setSelectedDimension(e.target.value as DimensionKey)}
                className="w-full appearance-none bg-slate-50 hover:bg-white border-2 border-blue-200 hover:border-blue-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl px-4 py-2.5 text-xs font-bold text-blue-950 transition-all shadow-2xs pr-10 cursor-pointer"
              >
                {dimensionOptions.map((dim) => (
                  <option key={dim.key} value={dim.key} className="py-1 font-medium text-slate-800">
                    {dim.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-blue-600">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Sort By & View Controls */}
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" /> จัดเรียง:
              </span>
              <select
                id="select-sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="sales_desc">ยอดขาย: มากสุดไปน้อยสุด (Sales Desc)</option>
                <option value="sales_asc">ยอดขาย: น้อยสุดไปมากสุด (Sales Asc)</option>
                <option value="count_desc">จำนวน Lead: มากสุดไปน้อยสุด (Count Desc)</option>
                <option value="count_asc">จำนวน Lead: น้อยสุดไปมากสุด (Count Asc)</option>
                <option value="rate_desc">อัตรา Win Rate: สูงสุดไปต่ำสุด</option>
                <option value="avg_desc">ยอดขายเฉลี่ยต่อ Deal: สูงสุด</option>
              </select>
            </div>

            {/* Chart Type Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setChartType('hbar')}
                title="กราฟแท่งแนวนอน"
                className={`p-1.5 rounded-md cursor-pointer ${chartType === 'hbar' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'}`}
              >
                <BarChart3 className="w-3.5 h-3.5 rotate-90" />
              </button>
              <button
                onClick={() => setChartType('bar')}
                title="กราฟแท่งแนวตั้ง"
                className={`p-1.5 rounded-md cursor-pointer ${chartType === 'bar' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'}`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setChartType('pie')}
                title="กราฟวงกลม"
                className={`p-1.5 rounded-md cursor-pointer ${chartType === 'pie' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'}`}
              >
                <PieIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setChartType('line')}
                title="กราฟเส้น"
                className={`p-1.5 rounded-md cursor-pointer ${chartType === 'line' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'}`}
              >
                <LineIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Layout Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setViewLayout('both')}
                className={`px-2 py-1 rounded-md font-medium cursor-pointer ${viewLayout === 'both' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
              >
                กราฟ + ตาราง
              </button>
              <button
                onClick={() => setViewLayout('chart')}
                className={`px-2 py-1 rounded-md font-medium cursor-pointer ${viewLayout === 'chart' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
              >
                เฉพาะกราฟ
              </button>
              <button
                onClick={() => setViewLayout('table')}
                className={`px-2 py-1 rounded-md font-medium cursor-pointer ${viewLayout === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
              >
                เฉพาะตาราง
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      {(viewLayout === 'both' || viewLayout === 'chart') && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                กราฟเปรียบเทียบตาม: {currentDimLabel}
              </h3>
              <p className="text-xs text-slate-500">
                แสดงผลยอดขายจริงและจำนวน Lead ทั้งหมด จัดเรียงตามเงื่อนไขที่เลือก
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700">
              พบ {aggregatedData.length} กลุ่มรายการ
            </span>
          </div>

          <div className="h-80 w-full">
            {aggregatedData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'hbar' ? (
                  <BarChart
                    data={aggregatedData.slice(0, 12)}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#334155' }}
                      width={130}
                      tickFormatter={(str) => (str.length > 18 ? `${str.substring(0, 18)}...` : str)}
                    />
                    <Tooltip
                      formatter={(val: any, name?: any) => {
                        if (name === 'ยอดขายจริง (บาท)') return [formatCurrency(Number(val)), String(name)];
                        return [`${val} ราย`, String(name || '')];
                      }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="totalSales" name="ยอดขายจริง (บาท)" fill="#2563EB" radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false} />
                    <Bar dataKey="leadCount" name="จำนวน Lead ทั้งหมด" fill="#94A3B8" radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false} />
                  </BarChart>
                ) : chartType === 'bar' ? (
                  <BarChart data={aggregatedData.slice(0, 12)} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="label"
                      angle={-25}
                      textAnchor="end"
                      height={45}
                      tick={{ fontSize: 10, fill: '#64748B' }}
                    />
                    <YAxis
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                    />
                    <Tooltip
                      formatter={(val: any, name?: any) => {
                        if (name === 'ยอดขายจริง (บาท)') return [formatCurrency(Number(val)), String(name)];
                        return [`${val} ราย`, String(name || '')];
                      }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="totalSales" name="ยอดขายจริง (บาท)" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={20} isAnimationActive={false} />
                    <Bar dataKey="leadCount" name="จำนวน Lead ทั้งหมด" fill="#94A3B8" radius={[4, 4, 0, 0]} barSize={20} isAnimationActive={false} />
                  </BarChart>
                ) : chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={aggregatedData.slice(0, 8)}
                      dataKey="totalSales"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                      isAnimationActive={false}
                    >
                      {aggregatedData.slice(0, 8).map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [formatCurrency(Number(val)), 'ยอดขายจริง']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                    />
                  </PieChart>
                ) : (
                  <LineChart data={aggregatedData.slice(0, 15)} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="label"
                      angle={-25}
                      textAnchor="end"
                      height={45}
                      tick={{ fontSize: 10, fill: '#64748B' }}
                    />
                    <YAxis
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                    />
                    <Tooltip
                      formatter={(val: any, name?: any) => [formatCurrency(Number(val)), String(name || '')]}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="totalSales" name="ยอดขายจริง (บาท)" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 4 }} isAnimationActive={false} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                ไม่มีข้อมูล
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detailed Data Table Section */}
      {(viewLayout === 'both' || viewLayout === 'table') && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-slate-600" />
                ตารางสรุปข้อมูลเจาะลึก: {currentDimLabel}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                💡 สามารถ Double Click ที่แถวใดก็ได้ เพื่อดูรายการ Lead และข้อมูลการขายทั้งหมดในมิตินั้น
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-600">
              รวม {aggregatedData.length} แถวข้อมูล
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold select-none">
                <tr>
                  <th className="py-3 px-4 text-center w-12">#</th>
                  <th className="py-3 px-4">{currentDimLabel}</th>
                  <th className="py-3 px-4 text-right">จำนวน Lead ทั้งหมด</th>
                  <th className="py-3 px-4 text-right">สัดส่วน Lead (%)</th>
                  <th className="py-3 px-4 text-right">Lead ปิดการขายได้</th>
                  <th className="py-3 px-4 text-right">Win Rate (%)</th>
                  <th className="py-3 px-4 text-right">ยอดขายรวม (Status N)</th>
                  <th className="py-3 px-4 text-right">สัดส่วนยอดขาย (%)</th>
                  <th className="py-3 px-4 text-right">ยอดขายเฉลี่ย / Deal</th>
                  <th className="py-3 px-4 text-center w-24">เจาะลึก</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {aggregatedData.map((row, index) => (
                  <tr
                    key={row.key}
                    onDoubleClick={() => handleRowDoubleClick(row)}
                    className="hover:bg-blue-50/70 transition-colors cursor-pointer select-none group"
                    title="ดับเบิ้ลคลิกเพื่อดูรายการ Lead ทั้งหมดของมิตินี้"
                  >
                    <td className="py-3 px-4 text-center text-slate-400 font-mono">{index + 1}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span>{row.label}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{row.leadCount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {row.percentLeads.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                      {row.wonCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                        row.conversionRate >= 30
                          ? 'bg-emerald-50 text-emerald-700'
                          : row.conversionRate >= 15
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {row.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-blue-700 font-mono">
                      {formatCurrency(row.totalSales)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {row.percentSales.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-800">
                      {formatCurrency(row.avgDealSize)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleRowDoubleClick(row)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>ดู Lead</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-900">
                <tr>
                  <td colSpan={2} className="py-3 px-4">รวมทั้งหมด (Total)</td>
                  <td className="py-3 px-4 text-right">{totalAllLeads.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right">100.0%</td>
                  <td className="py-3 px-4 text-right text-emerald-700">
                    {leads.filter((l) => l.hasSales).length.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-700">
                    {totalAllLeads > 0
                      ? ((leads.filter((l) => l.hasSales).length / totalAllLeads) * 100).toFixed(1)
                      : '0'}
                    %
                  </td>
                  <td className="py-3 px-4 text-right text-blue-700 font-mono">
                    {formatCurrency(totalAllSales)}
                  </td>
                  <td className="py-3 px-4 text-right">100.0%</td>
                  <td className="py-3 px-4 text-right font-mono">
                    {leads.filter((l) => l.hasSales).length > 0
                      ? formatCurrency(totalAllSales / leads.filter((l) => l.hasSales).length)
                      : '0'}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Drilldown Modal */}
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
