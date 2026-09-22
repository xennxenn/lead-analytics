import React from 'react';
import {
  X,
  User,
  Phone,
  Building2,
  MapPin,
  Calendar,
  Layers,
  Receipt,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Sparkles,
  Tag,
} from 'lucide-react';
import { JoinedLead } from '../types';

interface LeadDetailModalProps {
  lead: JoinedLead | null;
  onClose: () => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ lead, onClose }) => {
  if (!lead) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              ID
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 font-mono">
                  {lead.leadNo}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  lead.hasSales
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {lead.hasSales ? '✓ ปิดการขายมียอด' : 'ยังไม่มียอดขาย'}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                สร้างเมื่อ: {lead.createdDateFormattedThai} (ปี {lead.createdYear} เดือน {lead.createdMonth} วันที่ {lead.createdDay})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Status & Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
              <span className="text-[10px] text-blue-600 font-semibold uppercase block">สถานะ Lead</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{lead.status}</span>
            </div>
            <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
              <span className="text-[10px] text-emerald-600 font-semibold uppercase block">ยอดขายจริง (Status N)</span>
              <span className="font-bold text-emerald-700 text-sm mt-0.5 block font-mono">
                {formatCurrency(lead.totalSales)}
              </span>
            </div>
            <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl">
              <span className="text-[10px] text-purple-600 font-semibold uppercase block">สาขา</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block truncate">{lead.branch}</span>
            </div>
            <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl">
              <span className="text-[10px] text-amber-600 font-semibold uppercase block">พนักงานผู้ดูแล</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block truncate">{lead.staff}</span>
            </div>
          </div>

          {/* Customer & Location Details */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <User className="w-3.5 h-3.5 text-blue-600" /> ข้อมูลลูกค้าและพื้นที่
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block text-[11px]">ชื่อลูกค้า</span>
                <span className="font-semibold text-slate-800 text-sm">{lead.customerName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">เบอร์ติดต่อ</span>
                <span className="font-semibold text-slate-800 text-sm flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {lead.phone}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">พื้นที่ (อำเภอ / จังหวัด)</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  {lead.district} / {lead.province}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">ประเภทหน้างาน & แหล่งที่มา</span>
                <span className="font-semibold text-slate-800">
                  {lead.jobType} (จาก: {lead.source})
                </span>
              </div>
            </div>
          </div>

          {/* Ads & Campaign extraction details */}
          <div className="border border-slate-200 rounded-xl p-4 bg-indigo-50/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <Layers className="w-3.5 h-3.5 text-indigo-600" /> ข้อมูล Ads (Col Y ไฟล์ Main)
              </h4>
              <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-semibold text-[11px]">
                กลุ่ม: {lead.adsGroup}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] mb-0.5">
                ชื่อ Ads ที่สกัดได้ (หลังคำว่า Ads: จนถึงก่อนขึ้นบรรทัดใหม่หรือ Opportunity):
              </span>
              <div className="p-2.5 bg-white border border-indigo-200 rounded-lg font-semibold text-indigo-900 text-xs">
                {lead.extractedAds}
              </div>
            </div>
            {lead.rawAds && (
              <div>
                <span className="text-slate-500 block text-[11px] mb-0.5">ข้อความดิบต้นฉบับใน Col Y:</span>
                <pre className="p-2 bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-600 whitespace-pre-wrap font-mono">
                  {lead.rawAds}
                </pre>
              </div>
            )}
          </div>

          {/* Sales Transactions */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <Receipt className="w-3.5 h-3.5 text-emerald-600" /> รายการชำระเงิน (ไฟล์ Sales)
              </h4>
              <span className="text-xs text-slate-500">
                รวมทั้งหมด {lead.salesTransactions.length} รายการ
              </span>
            </div>

            {lead.salesTransactions.length > 0 ? (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-2.5">วันที่ชำระเงิน (Col B)</th>
                      <th className="p-2.5 text-right">ยอดเงิน (Col F)</th>
                      <th className="p-2.5 text-center">สถานะ (Col I)</th>
                      <th className="p-2.5 text-center">การนับรวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lead.salesTransactions.map((tx, idx) => {
                      const isValid = tx.status === 'N';
                      return (
                        <tr key={idx} className={isValid ? 'bg-emerald-50/30' : 'bg-slate-50/50'}>
                          <td className="p-2.5 font-mono text-slate-800">{tx.date || '-'}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(tx.amount)}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              isValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {tx.status || '-'}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            {isValid ? (
                              <span className="text-emerald-700 font-semibold flex items-center justify-center gap-1 text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" /> นับเป็นยอดขาย
                              </span>
                            ) : (
                              <span className="text-slate-400 flex items-center justify-center gap-1 text-[11px]">
                                <XCircle className="w-3.5 h-3.5 text-slate-400" /> ไม่นับ (ต้องเป็น N)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-lg text-center text-slate-400 text-xs">
                ไม่พบรายการชำระเงินในไฟล์ Sales สำหรับ Lead No นี้
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg text-xs transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
