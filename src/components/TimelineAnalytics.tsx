import React, { useState, useMemo } from 'react';
import {
  Calendar,
  TrendingUp,
  LineChart as LineChartIcon,
  Table as TableIcon,
  Download,
  ArrowUpDown,
  Filter,
  DollarSign,
  Users,
  Percent,
  CheckCircle2,
  ExternalLink,
  Clock,
  ChevronDown,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { JoinedLead } from '../types';
import { DrilldownLeadListModal } from './DrilldownLeadListModal';

interface TimelineAnalyticsProps {
  leads: JoinedLead[];
}

type Granularity = 'day' | 'month' | 'year';
type MetricFocus = 'combined' | 'sales' | 'leads';
type DateBasis = 'lead_created' | 'payment_date';
type SortField = 'dateKey' | 'leadsCount' | 'wonCount' | 'totalSales' | 'convRate' | 'avgDeal' | 'avgDaysToPayment';
type DateRangePreset = 'all' | '7d' | '30d' | '90d' | 'this_month' | 'this_quarter' | 'this_year' | 'custom';

export const TimelineAnalytics: React.FC<TimelineAnalyticsProps> = ({ leads }) => {
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [metricFocus, setMetricFocus] = useState<MetricFocus>('combined');
  const [dateBasis, setDateBasis] = useState<DateBasis>('lead_created');
  const [sortField, setSortField] = useState<SortField>('dateKey');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [chartType, setChartType] = useState<'line' | 'area'>('line');
  const [viewMode, setViewMode] = useState<'both' | 'chart' | 'table'>('both');

  // Timeline Date Range Filter State
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Drilldown state
  const [drilldownModal, setDrilldownModal] = useState<{
    title: string;
    subtitle: string;
    leads: JoinedLead[];
  } | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Filter leads based on selected timeline date range
  const filteredTimelineLeads = useMemo(() => {
    if (dateRangePreset === 'all' && !customStartDate && !customEndDate) {
      return leads;
    }

    let start = customStartDate;
    let end = customEndDate;

    if (dateRangePreset !== 'custom' && dateRangePreset !== 'all') {
      const today = new Date();
      const formatDate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      end = formatDate(today);

      if (dateRangePreset === '7d') {
        const d = new Date(today);
        d.setDate(d.getDate() - 7);
        start = formatDate(d);
      } else if (dateRangePreset === '30d') {
        const d = new Date(today);
        d.setDate(d.getDate() - 30);
        start = formatDate(d);
      } else if (dateRangePreset === '90d') {
        const d = new Date(today);
        d.setDate(d.getDate() - 90);
        start = formatDate(d);
      } else if (dateRangePreset === 'this_month') {
        start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      } else if (dateRangePreset === 'this_quarter') {
        const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3 + 1;
        start = `${today.getFullYear()}-${String(quarterStartMonth).padStart(2, '0')}-01`;
      } else if (dateRangePreset === 'this_year') {
        start = `${today.getFullYear()}-01-01`;
      }
    }

    return leads.filter((l) => {
      if (dateBasis === 'lead_created') {
        if (!l.createdDateStr) return false;
        if (start && l.createdDateStr < start) return false;
        if (end && l.createdDateStr > end) return false;
        return true;
      } else {
        if (!l.salesTransactions || l.salesTransactions.length === 0) return false;
        return l.salesTransactions.some((tx) => {
          const parts = (tx.date || '').split(' ')[0].split('/');
          if (parts.length === 3) {
            const [d, m, y] = parts;
            const txDateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            if (start && txDateStr < start) return false;
            if (end && txDateStr > end) return false;
            return true;
          }
          return false;
        });
      }
    });
  }, [leads, dateRangePreset, customStartDate, customEndDate, dateBasis]);

  // Build timeline aggregated records
  const timelineRecords = useMemo(() => {
    const map = new Map<
      string,
      {
        dateKey: string;
        displayLabel: string;
        sortTimestamp: number;
        leadsCount: number;
        wonCount: number;
        totalSales: number;
        leadsList: JoinedLead[];
      }
    >();

    if (dateBasis === 'lead_created') {
      filteredTimelineLeads.forEach((l) => {
        let key = '';
        let label = '';
        let timestamp = 0;

        if (granularity === 'day') {
          key = l.createdDateStr || 'ไม่ระบุวัน';
          label = l.createdDateFormattedThai || key;
          const [y, m, d] = key.split('-').map(Number);
          timestamp = isNaN(y) ? 0 : new Date(y, (m || 1) - 1, d || 1).getTime();
        } else if (granularity === 'month') {
          key = `${l.createdYear}-${l.createdMonth}`;
          const monthNames: Record<string, string> = {
            '01': 'ม.ค.',
            '02': 'ก.พ.',
            '03': 'มี.ค.',
            '04': 'เม.ย.',
            '05': 'พ.ค.',
            '06': 'มิ.ย.',
            '07': 'ก.ค.',
            '08': 'ส.ค.',
            '09': 'ก.ย.',
            '10': 'ต.ค.',
            '11': 'พ.ย.',
            '12': 'ธ.ค.',
          };
          const mName = monthNames[l.createdMonth] || l.createdMonth;
          label = `${mName} ${l.createdYear}`;
          timestamp = new Date(l.createdYear, parseInt(l.createdMonth, 10) - 1 || 0, 1).getTime();
        } else {
          key = String(l.createdYear || 'ไม่ระบุปี');
          label = `ปี ${key}`;
          timestamp = new Date(Number(key) || 2024, 0, 1).getTime();
        }

        if (!map.has(key)) {
          map.set(key, {
            dateKey: key,
            displayLabel: label,
            sortTimestamp: timestamp,
            leadsCount: 0,
            wonCount: 0,
            totalSales: 0,
            leadsList: [],
          });
        }

        const item = map.get(key)!;
        item.leadsCount += 1;
        item.totalSales += l.totalSales;
        if (l.hasSales) item.wonCount += 1;
        item.leadsList.push(l);
      });
    } else {
      // Cohort by actual sales payment date
      filteredTimelineLeads.forEach((l) => {
        if (l.salesTransactions && l.salesTransactions.length > 0) {
          l.salesTransactions.forEach((tx) => {
            const parts = (tx.date || '').split(' ')[0].split('/');
            let key = 'ไม่ระบุ';
            let label = 'ไม่ระบุ';
            let timestamp = 0;

            if (parts.length === 3) {
              const [d, m, y] = parts;
              if (granularity === 'day') {
                key = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                label = `${d}/${m}/${y}`;
                timestamp = new Date(Number(y), Number(m) - 1, Number(d)).getTime();
              } else if (granularity === 'month') {
                key = `${y}-${m.padStart(2, '0')}`;
                label = `ด.${m}/${y}`;
                timestamp = new Date(Number(y), Number(m) - 1, 1).getTime();
              } else {
                key = y;
                label = `ปี ${y}`;
                timestamp = new Date(Number(y), 0, 1).getTime();
              }
            }

            if (!map.has(key)) {
              map.set(key, {
                dateKey: key,
                displayLabel: label,
                sortTimestamp: timestamp,
                leadsCount: 0,
                wonCount: 0,
                totalSales: 0,
                leadsList: [],
              });
            }

            const item = map.get(key)!;
            item.totalSales += tx.amount || 0;
            if (!item.leadsList.find((x) => x.id === l.id)) {
              item.leadsList.push(l);
              item.leadsCount += 1;
              item.wonCount += 1;
            }
          });
        }
      });
    }

    const arr = Array.from(map.values()).map((row) => {
      const convRate = row.leadsCount > 0 ? (row.wonCount / row.leadsCount) * 100 : 0;
      const avgDeal = row.wonCount > 0 ? row.totalSales / row.wonCount : 0;

      // Payment duration metrics for this time bucket
      const wonLeads = row.leadsList.filter((l) => l.hasSales);
      const daysList = wonLeads
        .map((l) => l.daysToFirstPayment)
        .filter((d): d is number => d !== null && d !== undefined && !isNaN(d));

      const avgDaysToPayment =
        daysList.length > 0 ? daysList.reduce((a, b) => a + b, 0) / daysList.length : null;
      const sameDayCount = daysList.filter((d) => d === 0).length;
      const within7DaysCount = daysList.filter((d) => d <= 7).length;

      return {
        ...row,
        convRate,
        avgDeal,
        avgDaysToPayment,
        sameDayCount,
        within7DaysCount,
      };
    });

    return arr;
  }, [filteredTimelineLeads, granularity, dateBasis]);

  // Overall totals
  const overallTotalSales = useMemo(
    () => timelineRecords.reduce((sum, r) => sum + r.totalSales, 0),
    [timelineRecords]
  );
  const overallTotalLeads = useMemo(
    () => filteredTimelineLeads.length,
    [filteredTimelineLeads]
  );
  const overallWonLeads = useMemo(
    () => filteredTimelineLeads.filter((l) => l.hasSales),
    [filteredTimelineLeads]
  );

  // Overall payment duration metrics
  const { overallAvgDaysToPayment, overallSameDayCount, overallWithin7DaysCount } = useMemo(() => {
    const daysList = overallWonLeads
      .map((l) => l.daysToFirstPayment)
      .filter((d): d is number => d !== null && d !== undefined && !isNaN(d));

    const avg = daysList.length > 0 ? daysList.reduce((a, b) => a + b, 0) / daysList.length : null;
    const sameDay = daysList.filter((d) => d === 0).length;
    const within7 = daysList.filter((d) => d <= 7).length;

    return {
      overallAvgDaysToPayment: avg,
      overallSameDayCount: sameDay,
      overallWithin7DaysCount: within7,
    };
  }, [overallWonLeads]);

  // Chronologically sorted for chart (always old to new)
  const chartData = useMemo(() => {
    return [...timelineRecords].sort((a, b) => a.sortTimestamp - b.sortTimestamp);
  }, [timelineRecords]);

  // Sorted records for the table
  const sortedTableRecords = useMemo(() => {
    const copy = [...timelineRecords];
    copy.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'dateKey') {
        aVal = a.sortTimestamp;
        bVal = b.sortTimestamp;
      } else if (sortField === 'avgDaysToPayment') {
        aVal = a.avgDaysToPayment ?? -1;
        bVal = b.avgDaysToPayment ?? -1;
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return copy;
  }, [timelineRecords, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleRowDoubleClick = (row: (typeof timelineRecords)[0]) => {
    const basisText = dateBasis === 'lead_created' ? 'วันที่ Lead เข้ามา' : 'วันที่ชำระเงิน';
    setDrilldownModal({
      title: `เจาะลึก Lead: ${row.displayLabel} (${basisText})`,
      subtitle: `จำนวน ${row.leadsCount.toLocaleString()} ราย, ปิดการขายได้ ${row.wonCount} ราย, ยอดขายจริง ${formatCurrency(row.totalSales)}`,
      leads: row.leadsList,
    });
  };

  const handleExportCSV = () => {
    const headers = [
      'ช่วงเวลา',
      'จำนวน Lead ทั้งหมด',
      'ปิดการขายได้ (Won)',
      'อัตรา Win Rate (%)',
      'ยอดขายรวม (บาท)',
      'ยอดขายเฉลี่ยต่อบิล (บาท)',
      'สัดส่วนยอดขาย (%)',
      'ระยะเวลาเฉลี่ยถึงชำระเงิน (วัน)',
      'ชำระในวันเดียวกัน (ราย)',
    ];
    const rows = sortedTableRecords.map((r) => {
      const share = overallTotalSales > 0 ? ((r.totalSales / overallTotalSales) * 100).toFixed(1) : '0';
      return [
        `"${r.displayLabel}"`,
        r.leadsCount,
        r.wonCount,
        r.convRate.toFixed(1),
        r.totalSales,
        Math.round(r.avgDeal),
        share,
        r.avgDaysToPayment !== null ? r.avgDaysToPayment.toFixed(1) : '-',
        r.sameDayCount,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timeline_${granularity}_${dateBasis}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              ไทม์ไลน์ยอดขาย & Lead รายวัน / รายเดือน (Timeline Analytics)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              วิเคราะห์ช่วงเวลาที่ Lead และยอดขายจริงเข้ามา พร้อมกราฟเส้น ตารางข้อมูลเปรียบเทียบ และระยะเวลาเฉลี่ยถึงการชำระเงิน
            </p>
          </div>

          {/* Granularity & Mode Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Granularity: Day / Month / Year */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setGranularity('day')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  granularity === 'day' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                รายวัน (Daily)
              </button>
              <button
                type="button"
                onClick={() => setGranularity('month')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  granularity === 'month' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                รายเดือน (Monthly)
              </button>
              <button
                type="button"
                onClick={() => setGranularity('year')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  granularity === 'year' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                รายปี (Yearly)
              </button>
            </div>

            {/* Metric focus */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMetricFocus('combined')}
                className={`px-2.5 py-1.5 rounded-md transition-all cursor-pointer ${
                  metricFocus === 'combined' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                รวมยอดขาย & Lead
              </button>
              <button
                type="button"
                onClick={() => setMetricFocus('sales')}
                className={`px-2.5 py-1.5 rounded-md transition-all cursor-pointer ${
                  metricFocus === 'sales' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600'
                }`}
              >
                เฉพาะยอดขาย
              </button>
              <button
                type="button"
                onClick={() => setMetricFocus('leads')}
                className={`px-2.5 py-1.5 rounded-md transition-all cursor-pointer ${
                  metricFocus === 'leads' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600'
                }`}
              >
                เฉพาะจำนวน Lead
              </button>
            </div>

            {/* Date Basis toggle */}
            <select
              value={dateBasis}
              onChange={(e) => setDateBasis(e.target.value as DateBasis)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="lead_created">จัดตามวันที่ Lead เข้ามา</option>
              <option value="payment_date">จัดตามวันที่ชำระเงินจริง</option>
            </select>

            {/* View Layout Mode */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('both')}
                title="แสดงทั้งกราฟและตาราง"
                className={`p-1.5 rounded-md cursor-pointer ${viewMode === 'both' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'}`}
              >
                ทั้งคู่
              </button>
              <button
                type="button"
                onClick={() => setViewMode('chart')}
                title="แสดงเฉพาะกราฟ"
                className={`p-1.5 rounded-md cursor-pointer ${viewMode === 'chart' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'}`}
              >
                <LineChartIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="แสดงเฉพาะตาราง"
                className={`p-1.5 rounded-md cursor-pointer ${viewMode === 'table' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'}`}
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Timeline Date Range Filter Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60 p-2.5 rounded-lg">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              ช่วงวันที่ไทม์ไลน์:
            </span>
            {(
              [
                { id: 'all', label: 'ทั้งหมด' },
                { id: '7d', label: '7 วันล่าสุด' },
                { id: '30d', label: '30 วันล่าสุด' },
                { id: '90d', label: '90 วันล่าสุด' },
                { id: 'this_month', label: 'เดือนนี้' },
                { id: 'this_quarter', label: 'ไตรมาสนี้' },
                { id: 'this_year', label: 'ปีนี้' },
                { id: 'custom', label: 'กำหนดเอง' },
              ] as { id: DateRangePreset; label: string }[]
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setDateRangePreset(preset.id);
                  if (preset.id !== 'custom') {
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  dateRangePreset === preset.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs if custom is selected or active */}
          {(dateRangePreset === 'custom' || customStartDate || customEndDate) && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">ตั้งแต่วันที่:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setDateRangePreset('custom');
                }}
                className="px-2 py-1 bg-white border border-slate-300 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              />
              <span className="text-slate-500">ถึง:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setDateRangePreset('custom');
                }}
                className="px-2 py-1 bg-white border border-slate-300 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              />
              {(customStartDate || customEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomStartDate('');
                    setCustomEndDate('');
                    setDateRangePreset('all');
                  }}
                  className="px-2 py-1 text-slate-500 hover:text-slate-800 text-xs cursor-pointer"
                >
                  ✕ รีเซ็ต
                </button>
              )}
            </div>
          )}
        </div>

        {/* Summary Stat Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-400 font-medium block">ช่วงเวลาที่พบ</span>
            <span className="text-base font-bold text-slate-900">
              {timelineRecords.length} {granularity === 'day' ? 'วัน' : granularity === 'month' ? 'เดือน' : 'ปี'}
            </span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-400 font-medium block">Lead ทั้งหมดในช่วงนี้</span>
            <span className="text-base font-bold text-blue-600">{overallTotalLeads.toLocaleString()} ราย</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-400 font-medium block">ปิดการขายได้ (Won)</span>
            <span className="text-base font-bold text-emerald-600">
              {overallWonLeads.length.toLocaleString()} ราย (
              {overallTotalLeads > 0 ? ((overallWonLeads.length / overallTotalLeads) * 100).toFixed(1) : 0}%)
            </span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-400 font-medium block">ยอดขายจริง (Status N)</span>
            <span className="text-base font-bold text-emerald-700 font-mono">
              {formatCurrency(overallTotalSales)}
            </span>
          </div>
          <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
            <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              เฉลี่ยถึงชำระเงิน
            </span>
            <span className="text-base font-bold text-amber-800 font-mono block">
              {overallAvgDaysToPayment !== null ? `${overallAvgDaysToPayment.toFixed(1)} วัน` : '-'}
            </span>
            <span className="text-[10px] text-amber-600 block mt-0.5 truncate">
              {overallWonLeads.length > 0 ? (
                <>
                  วันเดียวกัน {overallSameDayCount} ราย ({((overallSameDayCount / overallWonLeads.length) * 100).toFixed(0)}%)
                </>
              ) : (
                'ไม่มีรายการชำระ'
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Double Click Hint Alert */}
      <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          <span className="font-semibold">
            ทุกแถวในตารางสามารถ Double Click เข้าไปดูข้อมูลอย่างละเอียดของแต่ละวัน/เดือนได้ทันที
          </span>
        </div>
        <span className="text-[11px] text-blue-600 bg-white px-2 py-0.5 rounded-full border border-blue-200 font-medium hidden sm:inline-block">
          💡 ดับเบิ้ลคลิกเพื่อเจาะลึก
        </span>
      </div>

      {/* 1. Line / Area Chart View */}
      {(viewMode === 'both' || viewMode === 'chart') && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                กราฟเส้นแนวโน้ม (Trend Line Chart): {metricFocus === 'combined' ? 'ยอดขายและจำนวน Lead' : metricFocus === 'sales' ? 'ยอดขายจริง (บาท)' : 'จำนวน Lead'}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                แกน X แสดงลำดับเวลา {granularity === 'day' ? 'รายวัน' : granularity === 'month' ? 'รายเดือน' : 'รายปี'} จากอดีตสู่ปัจจุบัน
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setChartType(chartType === 'line' ? 'area' : 'line')}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 font-medium text-slate-600 cursor-pointer"
              >
                สลับกราฟ: {chartType === 'line' ? 'พื้นที่ (Area)' : 'เส้น (Line)'}
              </button>
            </div>
          </div>

          <div className="h-80 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'line' ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="displayLabel"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      angle={-30}
                      textAnchor="end"
                      height={50}
                    />
                    {metricFocus === 'combined' ? (
                      <>
                        <YAxis
                          yAxisId="leadsAxis"
                          orientation="left"
                          tick={{ fontSize: 11, fill: '#3B82F6' }}
                          tickFormatter={(v) => `${v} ราย`}
                        />
                        <YAxis
                          yAxisId="salesAxis"
                          orientation="right"
                          tick={{ fontSize: 11, fill: '#10B981' }}
                          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        />
                      </>
                    ) : metricFocus === 'sales' ? (
                      <YAxis
                        tick={{ fontSize: 11, fill: '#10B981' }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      />
                    ) : (
                      <YAxis
                        tick={{ fontSize: 11, fill: '#3B82F6' }}
                        tickFormatter={(v) => `${v} ราย`}
                      />
                    )}
                    <Tooltip
                      formatter={(val: any, name: any) => {
                        const nameStr = String(name || '');
                        if (nameStr.includes('ยอดขาย')) return [formatCurrency(Number(val)), nameStr];
                        return [`${Number(val).toLocaleString()} ราย`, nameStr];
                      }}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#E2E8F0',
                        borderRadius: '0.75rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                    {/* Lines based on focus */}
                    {(metricFocus === 'combined' || metricFocus === 'leads') && (
                      <Line
                        yAxisId={metricFocus === 'combined' ? 'leadsAxis' : undefined}
                        type="monotone"
                        dataKey="leadsCount"
                        name="จำนวน Lead ทั้งหมด"
                        stroke="#2563EB"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#2563EB' }}
                        activeDot={{ r: 6 }}
                        isAnimationActive={false}
                      />
                    )}

                    {(metricFocus === 'combined' || metricFocus === 'leads') && (
                      <Line
                        yAxisId={metricFocus === 'combined' ? 'leadsAxis' : undefined}
                        type="monotone"
                        dataKey="wonCount"
                        name="Lead ที่ปิดการขายได้ (Won)"
                        stroke="#8B5CF6"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={{ r: 2.5, fill: '#8B5CF6' }}
                        isAnimationActive={false}
                      />
                    )}

                    {(metricFocus === 'combined' || metricFocus === 'sales') && (
                      <Line
                        yAxisId={metricFocus === 'combined' ? 'salesAxis' : undefined}
                        type="monotone"
                        dataKey="totalSales"
                        name="ยอดขายจริง (บาท)"
                        stroke="#10B981"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#10B981' }}
                        activeDot={{ r: 6 }}
                        isAnimationActive={false}
                      />
                    )}
                  </LineChart>
                ) : (
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 25 }}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="displayLabel" tick={{ fontSize: 11, fill: '#64748B' }} angle={-30} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, name: any) => {
                        const nameStr = String(name || '');
                        if (nameStr.includes('ยอดขาย')) return [formatCurrency(Number(val)), nameStr];
                        return [`${Number(val).toLocaleString()} ราย`, nameStr];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    {(metricFocus === 'combined' || metricFocus === 'leads') && (
                      <Area type="monotone" dataKey="leadsCount" name="จำนวน Lead ทั้งหมด" stroke="#2563EB" fill="url(#leadsGrad)" isAnimationActive={false} />
                    )}
                    {(metricFocus === 'combined' || metricFocus === 'sales') && (
                      <Area type="monotone" dataKey="totalSales" name="ยอดขายจริง (บาท)" stroke="#10B981" fill="url(#salesGrad)" isAnimationActive={false} />
                    )}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                ไม่มีข้อมูลสำหรับสร้างกราฟเส้นตามตัวกรองที่เลือก
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Detailed Data Table View */}
      {(viewMode === 'both' || viewMode === 'table') && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-slate-600" />
                ตารางข้อมูลไทม์ไลน์ราย{granularity === 'day' ? 'วัน' : granularity === 'month' ? 'เดือน' : 'ปี'}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                ดับเบิ้ลคลิกที่แถวใดก็ได้ เพื่อเปิดดูรายการ Lead และข้อมูลการขายทั้งหมดในช่วงเวลานั้น
              </p>
            </div>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>ส่งออกข้อมูลตาราง (CSV)</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 select-none">
                <tr>
                  <th className="py-3 px-3 text-center w-10">#</th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('dateKey')}
                  >
                    <div className="flex items-center gap-1">
                      <span>ช่วงเวลา ({granularity === 'day' ? 'วันที่' : granularity === 'month' ? 'เดือน' : 'ปี'})</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('leadsCount')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>จำนวน Lead</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('wonCount')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>ปิดการขายได้ (Won)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('convRate')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Win Rate (%)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('totalSales')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>ยอดขายจริง (บาท)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('avgDeal')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>ยอดขายเฉลี่ย/Deal</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('avgDaysToPayment')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>เฉลี่ยถึงชำระ (วัน)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-right">ชำระในวันแรก</th>
                  <th className="py-3 px-3 text-right">สัดส่วนยอดขาย</th>
                  <th className="py-3 px-3 text-center w-20">เจาะลึก</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {sortedTableRecords.length > 0 ? (
                  sortedTableRecords.map((row, index) => {
                    const share = overallTotalSales > 0 ? (row.totalSales / overallTotalSales) * 100 : 0;
                    return (
                      <tr
                        key={row.dateKey}
                        onDoubleClick={() => handleRowDoubleClick(row)}
                        className="hover:bg-blue-50/70 transition-colors cursor-pointer select-none group"
                        title="ดับเบิ้ลคลิกเพื่อดูรายการ Lead ทั้งหมดของช่วงเวลานี้"
                      >
                        <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {index + 1}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span>{row.displayLabel}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-800">
                          {row.leadsCount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-emerald-600">
                          {row.wonCount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              row.convRate >= 20
                                ? 'bg-emerald-100 text-emerald-800'
                                : row.convRate >= 10
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {row.convRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                          {formatCurrency(row.totalSales)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {row.wonCount > 0 ? formatCurrency(Math.round(row.avgDeal)) : '-'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono">
                          {row.avgDaysToPayment !== null ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px]">
                              <Clock className="w-3 h-3 text-amber-600" />
                              {row.avgDaysToPayment.toFixed(1)} วัน
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {row.wonCount > 0 ? (
                            <span>
                              {row.sameDayCount} ราย ({((row.sameDayCount / row.wonCount) * 100).toFixed(0)}%)
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[11px] font-mono text-slate-500">{share.toFixed(1)}%</span>
                            <div className="w-10 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full"
                                style={{ width: `${Math.min(share, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
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
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 text-xs">
                      ไม่พบข้อมูลในช่วงเวลาและตัวกรองที่ระบุ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer stats */}
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between text-xs text-slate-600 font-medium">
            <span>
              รวม {sortedTableRecords.length} รายการ (Lead ทั้งหมด {overallTotalLeads.toLocaleString()} ราย)
            </span>
            <span className="font-bold text-emerald-800 font-mono">
              ยอดขายรวมทั้งสิ้น: {formatCurrency(overallTotalSales)}
            </span>
          </div>
        </div>
      )}

      {/* Drilldown Modal on Double Click */}
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
