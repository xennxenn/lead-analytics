import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Download,
  Phone,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { JoinedLead } from '../types';
import { LeadDetailModal } from './LeadDetailModal';

interface DrilldownLeadListModalProps {
  title: string;
  subtitle?: string;
  leads: JoinedLead[];
  onClose: () => void;
  onUpdateCustomerName?: (leadNo: string, newName: string) => void;
}

export const DrilldownLeadListModal: React.FC<DrilldownLeadListModalProps> = ({
  title,
  subtitle,
  leads,
  onClose,
  onUpdateCustomerName,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<JoinedLead | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [salesOnlyFilter, setSalesOnlyFilter] = useState(false);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (salesOnlyFilter && !l.hasSales) return false;
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        l.leadNo.toLowerCase().includes(q) ||
        l.customerName.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        l.staff.toLowerCase().includes(q) ||
        l.branch.toLowerCase().includes(q) ||
        l.extractedAds.toLowerCase().includes(q) ||
        l.status.toLowerCase().includes(q)
      );
    });
  }, [leads, searchTerm, salesOnlyFilter]);

  // Statistics
  const totalCount = leads.length;
  const wonCount = leads.filter((l) => l.hasSales).length;
  const totalSales = leads.reduce((sum, l) => sum + l.totalSales, 0);
  const convRate = totalCount > 0 ? (wonCount / totalCount) * 100 : 0;

  // Pagination
  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleExportCSV = () => {
    const headers = [
      'Lead No',
      'วันที่สร้าง',
      'ชื่อลูกค้า',
      'เบอร์โทร',
      'สถานะ Lead',
      'ยอดขาย (บาท)',
      'พนักงาน',
      'สาขา',
      'จังหวัด',
      'Ads ที่ดึงดูด',
      'กลุ่ม Ads',
    ];
    const rows = filteredLeads.map((l) => [
      `"${l.leadNo}"`,
      `"${l.createdDateFormattedThai}"`,
      `"${l.customerName.replace(/"/g, '""')}"`,
      `"${l.phone}"`,
      `"${l.status.replace(/"/g, '""')}"`,
      l.totalSales,
      `"${l.staff.replace(/"/g, '""')}"`,
      `"${l.branch.replace(/"/g, '""')}"`,
      `"${l.province.replace(/"/g, '""')}"`,
      `"${l.extractedAds.replace(/"/g, '""')}"`,
      `"${l.adsGroup.replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `drilldown_leads_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900">{title}</h3>
              </div>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="px-6 py-3 bg-blue-50/40 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
              <span className="text-[11px] text-slate-500 font-medium block">จำนวน Lead ในกลุ่มนี้</span>
              <span className="text-base font-bold text-slate-900">{totalCount.toLocaleString()} ราย</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
              <span className="text-[11px] text-slate-500 font-medium block">ปิดการขายได้ (Won)</span>
              <span className="text-base font-bold text-emerald-600">{wonCount.toLocaleString()} ราย</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
              <span className="text-[11px] text-slate-500 font-medium block">อัตรา Win Rate</span>
              <span className="text-base font-bold text-indigo-600">{convRate.toFixed(1)}%</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
              <span className="text-[11px] text-slate-500 font-medium block">ยอดขายรวมจริง</span>
              <span className="text-base font-bold text-emerald-700 font-mono">{formatCurrency(totalSales)}</span>
            </div>
          </div>

          {paginatedLeads.some((l) => l.customerName === 'ลูกค้าทั่วไป') && (
            <div className="mx-6 mb-3 p-3 bg-blue-50/80 border border-blue-200/90 rounded-xl flex items-center justify-between text-xs text-blue-950 gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">💡</span>
                <span className="text-[11px] leading-relaxed">
                  <strong>ต้องการให้แสดงรายชื่อจริงของลูกค้า:</strong> ระบบอัปเกรดตัวอ่าน <strong>Col. G</strong> พร้อมแล้ว สามารถไปที่แท็บ <strong>"นำเข้า / อัปโหลดไฟล์"</strong> แล้วอัปโหลดเฉพาะ <strong>ไฟล์ที่ 2 (Status)</strong> เพื่ออัปเดตชื่อลูกค้าจริงเข้าสู่ระบบได้ทันที (ไฟล์ Main และ Sales เดิมยังอยู่ครบ ไม่ต้องอัปโหลดใหม่)
                </span>
              </div>
            </div>
          )}

          {/* Search and Action Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาในกลุ่มเจาะลึกนี้ (Lead No, ลูกค้า, เบอร์โทร, Ads...)"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setSalesOnlyFilter(!salesOnlyFilter)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
                  salesOnlyFilter
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {salesOnlyFilter ? '✓ เฉพาะมียอดขาย' : 'กรองมียอดขาย'}
              </button>
            </div>

            <div className="flex items-center gap-2 justify-end text-xs">
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ส่งออก CSV ({filteredLeads.length})</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10 border-b border-slate-200 font-semibold select-none">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12">#</th>
                  <th className="py-2.5 px-3">รหัส Lead</th>
                  <th className="py-2.5 px-3">วันที่สร้าง</th>
                  <th className="py-2.5 px-3">ลูกค้า / เบอร์</th>
                  <th className="py-2.5 px-3">สถานะ</th>
                  <th className="py-2.5 px-3 text-right">ยอดขายจริง</th>
                  <th className="py-2.5 px-3">พนักงาน / สาขา</th>
                  <th className="py-2.5 px-3">Ads ที่ดึงดูด</th>
                  <th className="py-2.5 px-3 text-center w-16">เปิดดู</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedLeads.length > 0 ? (
                  paginatedLeads.map((item, idx) => {
                    const rowNum = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr
                        key={item.id}
                        onDoubleClick={() => setSelectedLead(item)}
                        className="hover:bg-blue-50/60 transition-colors cursor-pointer group select-none"
                        title="ดับเบิ้ลคลิกเพื่อดูรายละเอียดเจาะลึก Lead นี้"
                      >
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {rowNum}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                          <div className="flex items-center gap-1">
                            <span>{item.leadNo}</span>
                            {item.hasSales && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {item.createdDateFormattedThai}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{item.customerName}</div>
                          <div className="text-slate-500 text-[11px] flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {item.phone}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              item.hasSales
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          {item.hasSales ? (
                            <span className="text-emerald-700">{formatCurrency(item.totalSales)}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <div className="font-medium text-slate-800">{item.staff}</div>
                          <div className="text-[11px] text-slate-400">
                            สาขา {item.branch} ({item.province})
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate" title={item.extractedAds}>
                          <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] truncate max-w-full">
                            {item.extractedAds}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedLead(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                            title="ดูรายละเอียดเจาะลึก"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                      ไม่พบข้อมูลที่ตรงกับเงื่อนไขค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Pagination */}
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              แสดง {filteredLeads.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
              {Math.min(currentPage * pageSize, filteredLeads.length)} จากทั้งหมด{' '}
              {filteredLeads.length.toLocaleString()} รายการ
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <span className="font-semibold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Double-click Lead Detail Modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdateCustomerName={(leadNo, newName) => {
            setSelectedLead((prev) => (prev ? { ...prev, customerName: newName } : null));
            if (onUpdateCustomerName) {
              onUpdateCustomerName(leadNo, newName);
            }
          }}
        />
      )}
    </>
  );
};
