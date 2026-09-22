import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  Layers,
  Phone,
  CheckCircle2,
} from 'lucide-react';
import { JoinedLead } from '../types';
import { LeadDetailModal } from './LeadDetailModal';

interface DataTableProps {
  leads: JoinedLead[];
  onExportExcel: () => void;
  onExportCSV: () => void;
}

type SortField = 'leadNo' | 'createdDateStr' | 'customerName' | 'status' | 'totalSales' | 'branch' | 'staff' | 'extractedAds';

export const DataTable: React.FC<DataTableProps> = ({ leads, onExportExcel, onExportCSV }) => {
  const [sortField, setSortField] = useState<SortField>('leadNo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedLead, setSelectedLead] = useState<JoinedLead | null>(null);
  const [tableSalesFilter, setTableSalesFilter] = useState<'all' | 'with_sales' | 'no_sales'>('all');

  // Filter leads based on tableSalesFilter
  const filteredByTableSales = useMemo(() => {
    if (tableSalesFilter === 'with_sales') {
      return leads.filter((l) => l.hasSales);
    }
    if (tableSalesFilter === 'no_sales') {
      return leads.filter((l) => !l.hasSales);
    }
    return leads;
  }, [leads, tableSalesFilter]);

  // Counts for tabs
  const withSalesCount = useMemo(() => leads.filter((l) => l.hasSales).length, [leads]);
  const noSalesCount = leads.length - withSalesCount;

  // Sorting
  const sortedLeads = useMemo(() => {
    const copy = [...filteredByTableSales];
    copy.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });
    return copy;
  }, [filteredByTableSales, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedLeads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedLeads.slice(start, start + pageSize);
  }, [sortedLeads, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-4">
      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                ฐานข้อมูลและตารางรายละเอียด Lead ({filteredByTableSales.length.toLocaleString()} รายการ)
              </h3>
              <span className="text-[11px] text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                ดับเบิ้ลคลิกแถวเพื่อดูรายละเอียด
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ข้อมูลหลักจาก Status เสริมด้วยชื่อ Ads จาก Main และยอดเงินจริง (Status N) จาก Sales
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Toggle: All vs Only with Sales vs No Sales */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                id="btn-table-view-all"
                onClick={() => {
                  setTableSalesFilter('all');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  tableSalesFilter === 'all'
                    ? 'bg-white text-slate-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ดูทั้งหมด ({leads.length.toLocaleString()})
              </button>
              <button
                type="button"
                id="btn-table-view-sales-only"
                onClick={() => {
                  setTableSalesFilter('with_sales');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  tableSalesFilter === 'with_sales'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                เฉพาะที่มียอดขาย ({withSalesCount.toLocaleString()})
              </button>
              <button
                type="button"
                id="btn-table-view-no-sales"
                onClick={() => {
                  setTableSalesFilter('no_sales');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  tableSalesFilter === 'no_sales'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ยังไม่มียอดขาย ({noSalesCount.toLocaleString()})
              </button>
            </div>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700"
            >
              <option value={15}>แสดง 15 แถว</option>
              <option value={25}>แสดง 25 แถว</option>
              <option value={50}>แสดง 50 แถว</option>
              <option value={100}>แสดง 100 แถว</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold select-none">
              <tr>
                <th className="py-3 px-3 w-10 text-center text-slate-400">#</th>
                <th
                  className="py-3 px-3 cursor-pointer hover:bg-slate-200/50 transition-colors"
                  onClick={() => handleSort('leadNo')}
                >
                  <div className="flex items-center gap-1">
                    <span>รหัส Lead (Lead No)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-3 px-3 cursor-pointer hover:bg-slate-200/50 transition-colors"
                  onClick={() => handleSort('createdDateStr')}
                >
                  <div className="flex items-center gap-1">
                    <span>วันที่สร้าง (จากรหัส L)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-3 px-3 cursor-pointer hover:bg-slate-200/50 transition-colors"
                  onClick={() => handleSort('customerName')}
                >
                  <div className="flex items-center gap-1">
                    <span>ชื่อลูกค้า / เบอร์โทร</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-3 px-3 cursor-pointer hover:bg-slate-200/50 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    <span>สถานะ Lead</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-200/50 transition-colors"
                  onClick={() => handleSort('totalSales')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ยอดขายจริง (Status N)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-3 px-3 cursor-pointer hover:bg-slate-200/50 transition-colors"
                  onClick={() => handleSort('staff')}
                >
                  <div className="flex items-center gap-1">
                    <span>พนักงาน</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-3 px-3 cursor-pointer hover:bg-slate-200/50 transition-colors"
                  onClick={() => handleSort('branch')}
                >
                  <div className="flex items-center gap-1">
                    <span>สาขา / จังหวัด</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-3 px-3 cursor-pointer hover:bg-slate-200/50 transition-colors"
                  onClick={() => handleSort('extractedAds')}
                >
                  <div className="flex items-center gap-1">
                    <span>Ads ที่ดึงดูด & กลุ่ม</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center w-16">จัดการ</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedLeads.map((item, index) => {
                const rowNum = (currentPage - 1) * pageSize + index + 1;
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-blue-50/60 transition-colors cursor-pointer select-none group"
                    onClick={() => setSelectedLead(item)}
                    onDoubleClick={() => setSelectedLead(item)}
                    title="ดับเบิ้ลคลิกเพื่อดูรายละเอียดเจาะลึกของ Lead นี้"
                  >
                    <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {rowNum}
                    </td>

                    {/* Lead No */}
                    <td className="py-3 px-3 font-mono font-bold text-blue-700">
                      <div className="flex items-center gap-1.5">
                        <span>{item.leadNo}</span>
                        {item.hasSales && (
                          <span title="มียอดขายเกิดขึ้นจริง">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                      <div>{item.createdDateFormattedThai}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ปี {item.createdYear} ด.{item.createdMonth}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{item.customerName}</div>
                      <div className="text-slate-500 text-[11px] flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {item.phone}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        item.status.includes('ปิดการขาย') || item.status.includes('ชำระเงิน')
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : item.status.includes('ยกเลิก')
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    {/* Total Sales */}
                    <td className="py-3 px-3 text-right">
                      {item.hasSales ? (
                        <div>
                          <span className="font-mono font-bold text-emerald-700 text-sm">
                            {formatCurrency(item.totalSales)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {item.salesCount} บิลชำระ
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono">-</span>
                      )}
                    </td>

                    {/* Staff */}
                    <td className="py-3 px-3 text-slate-800 font-medium">
                      {item.staff}
                    </td>

                    {/* Branch & Province */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800 truncate max-w-[140px]">{item.branch}</div>
                      <div className="text-[11px] text-slate-500">{item.province}</div>
                    </td>

                    {/* Ads & Group */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-indigo-900 truncate max-w-[160px]" title={item.extractedAds}>
                        {item.extractedAds}
                      </div>
                      <span className="inline-block text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-medium mt-0.5">
                        {item.adsGroup}
                      </span>
                    </td>

                    {/* Action Button */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLead(item);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 transition-colors cursor-pointer"
                        title="ดูรายละเอียดเจาะลึก"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {paginatedLeads.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 text-sm">
                    ไม่พบรายการที่ตรงตามเงื่อนไข
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 text-xs">
          <span className="text-slate-500">
            แสดงแถวที่ {(currentPage - 1) * pageSize + 1} ถึง{' '}
            {Math.min(currentPage * pageSize, sortedLeads.length)} จากทั้งหมด{' '}
            {sortedLeads.length.toLocaleString()} รายการ
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-semibold text-slate-700">
              หน้า {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLead && (
        <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
};
