import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Sparkles,
  CloudCheck,
  RefreshCw,
  Download,
  Info,
  X,
  Database,
  Eye,
  Languages,
} from 'lucide-react';
import {
  parseMainContent,
  parseStatusContent,
  parseSalesContent,
  parseExcelBuffer,
} from '../utils/parser';
import { decodeFileSmart, SupportedEncoding } from '../utils/encoding';
import { RawMainRow, RawStatusRow, RawSalesRow } from '../types';

interface DataImportExportProps {
  onUploadAndSync: (
    main: RawMainRow[] | null,
    status: RawStatusRow[] | null,
    sales: RawSalesRow[] | null
  ) => Promise<void>;
  onClearData: () => Promise<void>;
  onLoadDemoData?: () => Promise<void>;
  isSyncing: boolean;
  fileStats: {
    mainCount: number;
    statusCount: number;
    salesCount: number;
    validSalesCount: number;
  };
  lastUpdated: string | null;
}

interface FileMetaInfo {
  file: File;
  encodingInfo: string;
  thaiCount: number;
}

export const DataImportExport: React.FC<DataImportExportProps> = ({
  onUploadAndSync,
  onClearData,
  onLoadDemoData,
  isSyncing,
  fileStats,
  lastUpdated,
}) => {
  // Parsed state for the 3 files
  const [mainParsed, setMainParsed] = useState<RawMainRow[] | null>(null);
  const [statusParsed, setStatusParsed] = useState<RawStatusRow[] | null>(null);
  const [salesParsed, setSalesParsed] = useState<RawSalesRow[] | null>(null);

  // File names and meta
  const [mainFileMeta, setMainFileMeta] = useState<FileMetaInfo | null>(null);
  const [statusFileMeta, setStatusFileMeta] = useState<FileMetaInfo | null>(null);
  const [salesFileMeta, setSalesFileMeta] = useState<FileMetaInfo | null>(null);

  // Encoding selection (Defaults to auto-detect which tests UTF-8 vs Windows-874 vs UTF-16)
  const [selectedEncoding, setSelectedEncoding] = useState<SupportedEncoding>('auto');

  // Preview modals / cards
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // File Input Refs for direct resetting
  const mainInputRef = useRef<HTMLInputElement>(null);
  const statusInputRef = useRef<HTMLInputElement>(null);
  const salesInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 6000);
  };

  // Helper to process a file with given or current encoding
  const processSingleFile = async (
    file: File,
    type: 'main' | 'status' | 'sales',
    encoding: SupportedEncoding
  ) => {
    try {
      const fileNameLower = file.name.toLowerCase();
      const isExcel = fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls');

      let parsedRows: any[] = [];
      let encodingLabel = '';
      let thaiCharCount = 0;

      if (isExcel) {
        // Excel binary file
        const buffer = await file.arrayBuffer();
        const matrix = parseExcelBuffer(buffer);
        encodingLabel = 'Excel XLSX (Unicode ภาษาไทยสมบูรณ์)';
        thaiCharCount = 100;

        if (type === 'main') {
          parsedRows = parseMainContent(matrix);
        } else if (type === 'status') {
          parsedRows = parseStatusContent(matrix);
        } else if (type === 'sales') {
          parsedRows = parseSalesContent(matrix);
        }
      } else {
        // Text / CSV / TSV with smart Thai encoding detection
        const decoded = await decodeFileSmart(file, encoding);
        encodingLabel = decoded.detectedEncoding;
        thaiCharCount = decoded.thaiCharCount;

        if (type === 'main') {
          parsedRows = parseMainContent(decoded.text);
        } else if (type === 'status') {
          parsedRows = parseStatusContent(decoded.text);
        } else if (type === 'sales') {
          parsedRows = parseSalesContent(decoded.text);
        }
      }

      // Update state according to file type
      if (type === 'main') {
        setMainParsed(parsedRows as RawMainRow[]);
        setMainFileMeta({ file, encodingInfo: encodingLabel, thaiCount: thaiCharCount });
        showNotification(
          'success',
          `อ่านไฟล์ Main (${file.name}) สำเร็จ: พบ ${parsedRows.length.toLocaleString()} แถว (${encodingLabel})`
        );
      } else if (type === 'status') {
        setStatusParsed(parsedRows as RawStatusRow[]);
        setStatusFileMeta({ file, encodingInfo: encodingLabel, thaiCount: thaiCharCount });
        showNotification(
          'success',
          `อ่านไฟล์ Status (${file.name}) สำเร็จ: พบ ${parsedRows.length.toLocaleString()} แถว (${encodingLabel})`
        );
      } else if (type === 'sales') {
        const sales = parsedRows as RawSalesRow[];
        setSalesParsed(sales);
        setSalesFileMeta({ file, encodingInfo: encodingLabel, thaiCount: thaiCharCount });
        const validN = sales.filter((s) => s.salesStatus === 'N').length;
        showNotification(
          'success',
          `อ่านไฟล์ Sales (${file.name}) สำเร็จ: พบ ${sales.length.toLocaleString()} แถว (Status N: ${validN.toLocaleString()} รายการ) (${encodingLabel})`
        );
      }
    } catch (err: any) {
      showNotification('error', `เกิดข้อผิดพลาดในการอ่านไฟล์ ${file.name}: ${err.message || 'ไม่สามารถเปิดไฟล์ได้'}`);
    }
  };

  // When user changes the encoding dropdown, automatically re-decode any currently selected files!
  const handleEncodingChange = async (newEncoding: SupportedEncoding) => {
    setSelectedEncoding(newEncoding);
    if (mainFileMeta) {
      await processSingleFile(mainFileMeta.file, 'main', newEncoding);
    }
    if (statusFileMeta) {
      await processSingleFile(statusFileMeta.file, 'status', newEncoding);
    }
    if (salesFileMeta) {
      await processSingleFile(salesFileMeta.file, 'sales', newEncoding);
    }
    showNotification('info', `ปรับเปลี่ยนการถอดรหัสภาษาเป็น: ${
      newEncoding === 'auto'
        ? 'ตรวจจับภาษาไทยอัตโนมัติ'
        : newEncoding === 'windows-874'
        ? 'Windows-874 / TIS-620 (ภาษาไทย Windows/Excel)'
        : newEncoding === 'utf-8'
        ? 'UTF-8 (Unicode)'
        : 'UTF-16 LE'
    }`);
  };

  const handleFileInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'main' | 'status' | 'sales'
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      processSingleFile(file, type, selectedEncoding);
    }
  };

  // Drag & drop handlers
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>, type: 'main' | 'status' | 'sales') => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSingleFile(file, type, selectedEncoding);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Clear single file
  const handleClearSingleFile = (type: 'main' | 'status' | 'sales') => {
    if (type === 'main') {
      setMainParsed(null);
      setMainFileMeta(null);
      if (mainInputRef.current) mainInputRef.current.value = '';
    } else if (type === 'status') {
      setStatusParsed(null);
      setStatusFileMeta(null);
      if (statusInputRef.current) statusInputRef.current.value = '';
    } else if (type === 'sales') {
      setSalesParsed(null);
      setSalesFileMeta(null);
      if (salesInputRef.current) salesInputRef.current.value = '';
    }
  };

  // Execute Clear All (No blocking browser confirm!)
  const executeClearAll = async () => {
    try {
      await onClearData();

      // Clear local states
      setMainParsed(null);
      setStatusParsed(null);
      setSalesParsed(null);
      setMainFileMeta(null);
      setStatusFileMeta(null);
      setSalesFileMeta(null);

      // Clear HTML inputs
      if (mainInputRef.current) mainInputRef.current.value = '';
      if (statusInputRef.current) statusInputRef.current.value = '';
      if (salesInputRef.current) salesInputRef.current.value = '';

      setShowClearModal(false);
      showNotification(
        'success',
        'ล้างข้อมูลบนเซิร์ฟเวอร์เรียบร้อยแล้ว! ฐานข้อมูลว่างเปล่า (0 รายการ) พร้อมสำหรับการอัปโหลดไฟล์จริงของคุณ'
      );
    } catch (err: any) {
      showNotification('error', `เกิดข้อผิดพลาดในการล้างข้อมูล: ${err.message}`);
    }
  };

  const handleSyncNow = async () => {
    if (!mainParsed && !statusParsed && !salesParsed) {
      showNotification(
        'error',
        'กรุณาเลือกไฟล์อย่างน้อย 1 ไฟล์ (Main, Status หรือ Sales) ก่อนกดบันทึกและซิงค์'
      );
      return;
    }
    try {
      await onUploadAndSync(mainParsed, statusParsed, salesParsed);
      showNotification(
        'success',
        'บันทึกและซิงค์ข้อมูลจริงขึ้นเซิร์ฟเวอร์ Online เรียบร้อยแล้ว! สามารถเปิดดูรายงานได้ทันที'
      );
    } catch (err: any) {
      showNotification('error', `เกิดข้อผิดพลาดในการซิงค์: ${err.message}`);
    }
  };

  // Download sample templates in UTF-8 BOM
  const downloadSampleTemplate = (type: 'main' | 'status' | 'sales') => {
    let filename = '';
    let header = '';
    let rows = '';

    if (type === 'main') {
      filename = 'sample_main.csv';
      header = 'Lead_No,,,,,,,,,,,,,,,,,,,,,,,,Ads_Info\n';
      rows =
        'L260921144635764,,,,,,,,,,,,,,,,,,,,,,,,Ads: Vdoม่านมอเตอร์บ้านคุณกอล์ฟ\n' +
        'L260922153022119,,,,,,,,,,,,,,,,,,,,,,,,Ads: โปรโมชั่นผ้าม่านกัน UV สไตล์มินิมอล\n' +
        'L260923164500987,,,,,,,,,,,,,,,,,,,,,,,,Ads: รีวิวม่านม้วนและม่านปรับแสงคอนโดหรู\n';
    } else if (type === 'status') {
      filename = 'sample_status.csv';
      header = ',Status,Lead_No,,,,Customer_Name,Phone,,,,,Source,,Job_Type,Staff,,,,,,Branch,,,District,Province\n';
      rows =
        ',ปิดการขาย (ชำระเงินแล้ว),L260921144635764,,,,คุณกานต์ เจริญสุข,0812345678,,,,,Facebook Ads,,บ้านเดี่ยว,กิตติพงษ์ เจริญทรัพย์,,,,,,สาขาสุขุมวิท (กทม.),,,วัฒนา,กรุงเทพมหานคร\n' +
        ',เสนอราคาเรียบร้อย,L260922153022119,,,,คุณวิภาดา มั่นเจริญ,0898765432,,,,,Google Search,,คอนโดมิเนียม,ณัฐริกา ศรีสุข,,,,,,สาขารามอินทรา (กทม.),,,บางเขน,กรุงเทพมหานคร\n' +
        ',นัดวัดพื้นที่หน้างาน,L260923164500987,,,,คุณธนากร ศิริพงษ์,0865551234,,,,,Line Official,,ทาวน์โฮม,สมชาย ใจดี,,,,,,สาขานนทบุรี,,,ปากเกร็ด,นนทบุรี\n';
    } else if (type === 'sales') {
      filename = 'sample_sales.csv';
      header = ',Payment_Date,,,,Amount,,,Sales_Status,Lead_No\n';
      rows =
        ',2026-09-21,,,,45000,,,N,L260921144635764\n' +
        ',2026-09-22,,,,25000,,,N,L260921144635764\n' +
        ',2026-09-22,,,,35000,,,C,L260922153022119\n';
    }

    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isDatabaseEmpty =
    fileStats.mainCount === 0 &&
    fileStats.statusCount === 0 &&
    fileStats.salesCount === 0;

  return (
    <div className="space-y-6">
      {/* Top Banner with Server Sync status */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              นำเข้าไฟล์จริง & ซิงค์ฐานข้อมูล Online
            </h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CloudCheck className="w-3.5 h-3.5 text-emerald-600" />
              Online Cloud Sync
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            รองรับไฟล์ภาษาไทย 100% จากโปรแกรมทุกรูปแบบ (TXT, CSV, XLSX, XLS) ทั้งรหัส <strong>Windows-874 / TIS-620</strong> และ <strong>UTF-8</strong>
          </p>
          {lastUpdated && (
            <p className="text-[11px] text-slate-400 mt-0.5">
              ซิงค์ล่าสุดเมื่อ: {new Date(lastUpdated).toLocaleString('th-TH')}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-load-demo-data"
            onClick={onLoadDemoData}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>โหลดชุดข้อมูลตัวอย่าง</span>
          </button>

          {/* Direct Clear All Button (Opens clean confirmation modal) */}
          <button
            id="btn-clear-all-data"
            onClick={() => setShowClearModal(true)}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-300 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            title="ล้างข้อมูลไฟล์ทั้งหมดเพื่อเริ่มต้นใหม่"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>ล้างข้อมูลทั้งหมด</span>
          </button>
        </div>
      </div>

      {/* Thai Character Encoding Control Bar */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50/40 border border-blue-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Languages className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">ระบบถอดรหัสภาษาไทย (Character Encoding)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                ฉลาด & ตรวจจับภาษาไทยอัตโนมัติ
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              แก้ปัญหาภาษาไทยเป็นภาษาต่างดาวหรือเครื่องหมายคำถาม (?) ได้อย่างสมบูรณ์แบบ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="encoding-selector" className="text-xs font-semibold text-slate-700 whitespace-nowrap">
            รหัสภาษา:
          </label>
          <select
            id="encoding-selector"
            value={selectedEncoding}
            onChange={(e) => handleEncodingChange(e.target.value as SupportedEncoding)}
            className="bg-white border border-slate-300 text-slate-800 text-xs font-medium rounded-lg px-3 py-1.5 shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
          >
            <option value="auto">🤖 ตรวจจับอัตโนมัติ (Auto-Detect ภาษาไทย)</option>
            <option value="windows-874">🇹🇭 Windows-874 / TIS-620 (ไฟล์จาก Windows Excel)</option>
            <option value="utf-8">🌐 UTF-8 (Unicode มาตรฐาน)</option>
            <option value="utf-16le">📄 UTF-16 LE (Unicode Text จาก Excel)</option>
          </select>
        </div>
      </div>

      {/* In-app Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : notification.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {notification.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
            {notification.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Database Status Alert if Empty */}
      {isDatabaseEmpty && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-900">ฐานข้อมูลว่างเปล่า (พร้อมนำเข้าไฟล์จริง)</h4>
            <p className="text-xs text-amber-800 mt-0.5">
              ขณะนี้ไม่มีข้อมูลในระบบ กรุณาเลือกหรือลากไฟล์จริงของคุณ (Main, Status, Sales) ลงในช่องด้านล่าง แล้วกดปุ่ม <strong>"บันทึกและซิงค์ข้อมูลขึ้น Online"</strong>
            </p>
          </div>
        </div>
      )}

      {/* Current Stored Database Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] text-slate-500 font-semibold uppercase block">ไฟล์ 1: Main (Ads)</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">
            {fileStats.mainCount.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">แถว</span>
          </span>
          <span className="text-[10px] text-slate-400">Col A (Lead No), Col Y (Ads)</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] text-slate-500 font-semibold uppercase block">ไฟล์ 2: Status (ลูกค้า)</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">
            {fileStats.statusCount.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">แถว</span>
          </span>
          <span className="text-[10px] text-slate-400">Col B, C, G, H, M, O, P, V, Y, Z</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] text-slate-500 font-semibold uppercase block">ไฟล์ 3: Sales ทั้งหมด</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">
            {fileStats.salesCount.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">รายการ</span>
          </span>
          <span className="text-[10px] text-slate-400">Col B, F, I, J</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] text-emerald-600 font-semibold uppercase block">Sales ที่นับ (Status N)</span>
          <span className="text-2xl font-bold text-emerald-700 mt-1 block">
            {fileStats.validSalesCount.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">รายการ</span>
          </span>
          <span className="text-[10px] text-emerald-600">เฉพาะ Col I = 'N' เท่านั้น</span>
        </div>
      </div>

      {/* 3 Upload Dropzones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Zone 1: Main */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                  1
                </span>
                ไฟล์หลักลูกค้า (Main)
              </h4>
              <button
                onClick={() => downloadSampleTemplate('main')}
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                title="ดาวน์โหลดเทมเพลตไฟล์ Main ตัวอย่าง"
              >
                <Download className="w-3 h-3" /> เทมเพลต
              </button>
            </div>

            <div className="p-2.5 bg-blue-50/60 rounded-lg text-[11px] text-slate-600 mb-3 space-y-1">
              <p>
                <strong>Col. A:</strong> รหัสลูกค้า (Lead No เช่น L260921144635764)
              </p>
              <p>
                <strong>Col. Y:</strong> Ads (สกัดหลัง Ads: หรือ Ads : จนถึงก่อนขึ้นบรรทัดใหม่หรือ Opportunity:)
              </p>
            </div>

            <label
              onDrop={(e) => handleDrop(e, 'main')}
              onDragOver={handleDragOver}
              className={`block border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                mainParsed
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-blue-500 bg-slate-50/50'
              }`}
            >
              <input
                ref={mainInputRef}
                type="file"
                accept=".csv,.txt,.tsv,.xlsx,.xls"
                onClick={(e) => {
                  (e.target as HTMLInputElement).value = '';
                }}
                onChange={(e) => handleFileInputChange(e, 'main')}
                className="hidden"
              />
              <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${mainParsed ? 'text-emerald-600' : 'text-blue-600'}`} />
              <span className="text-xs font-semibold text-slate-800 block truncate">
                {mainFileMeta?.file.name || 'คลิกหรือลากไฟล์ Main (.txt / .csv / .xlsx) มาวางที่นี่'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">
                รองรับไฟล์ TXT, CSV, TSV และ Excel
              </span>
            </label>
          </div>

          {mainParsed && (
            <div className="mt-3 space-y-2">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between">
                <div>
                  <span className="font-bold block">อ่านข้อมูลได้ {mainParsed.length.toLocaleString()} แถว</span>
                  <span className="text-[10px] text-emerald-700 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {mainFileMeta?.encodingInfo}
                  </span>
                </div>
                <button
                  onClick={() => handleClearSingleFile('main')}
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="ยกเลิกไฟล์นี้"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sample Live Thai Text Preview */}
              {mainParsed.length > 0 && (
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600">
                  <span className="font-bold text-slate-700 block mb-1 text-[10px] flex items-center gap-1">
                    <Eye className="w-3 h-3 text-blue-600" />
                    ตัวอย่างข้อความภาษาไทยที่อ่านได้:
                  </span>
                  <div className="space-y-0.5 truncate">
                    <p className="truncate text-slate-800">
                      • {mainParsed[0].leadNo}: <span className="font-medium text-blue-700">{mainParsed[0].extractedAds}</span>
                    </p>
                    {mainParsed[1] && (
                      <p className="truncate text-slate-800">
                        • {mainParsed[1].leadNo}: <span className="font-medium text-blue-700">{mainParsed[1].extractedAds}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upload Zone 2: Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
                  2
                </span>
                ไฟล์สถานะของ Lead (Status)
              </h4>
              <button
                onClick={() => downloadSampleTemplate('status')}
                className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                title="ดาวน์โหลดเทมเพลตไฟล์ Status ตัวอย่าง"
              >
                <Download className="w-3 h-3" /> เทมเพลต
              </button>
            </div>

            <div className="p-2.5 bg-indigo-50/60 rounded-lg text-[11px] text-slate-600 mb-3 space-y-1">
              <p>
                <strong>Col. B:</strong> สถานะ Lead &nbsp;|&nbsp; <strong>Col. C:</strong> รหัสลูกค้า (Lead No)
              </p>
              <p>
                <strong className="text-indigo-700">Col. G:</strong> <span className="font-semibold text-indigo-900">ชื่อลูกค้า</span> &nbsp;|&nbsp; <strong>Col. H:</strong> เบอร์โทรศัพท์
              </p>
              <p>
                <strong>Col. M, O:</strong> แหล่งที่มา, หน้างาน &nbsp;|&nbsp; <strong>Col. P, V, Y, Z:</strong> พนักงาน, สาขา, อำเภอ, จังหวัด
              </p>
            </div>

            <label
              onDrop={(e) => handleDrop(e, 'status')}
              onDragOver={handleDragOver}
              className={`block border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                statusParsed
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-indigo-500 bg-slate-50/50'
              }`}
            >
              <input
                ref={statusInputRef}
                type="file"
                accept=".csv,.txt,.tsv,.xlsx,.xls"
                onClick={(e) => {
                  (e.target as HTMLInputElement).value = '';
                }}
                onChange={(e) => handleFileInputChange(e, 'status')}
                className="hidden"
              />
              <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${statusParsed ? 'text-emerald-600' : 'text-indigo-600'}`} />
              <span className="text-xs font-semibold text-slate-800 block truncate">
                {statusFileMeta?.file.name || 'คลิกหรือลากไฟล์ Status (.txt / .csv / .xlsx) มาวางที่นี่'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">
                รองรับไฟล์ TXT, CSV, TSV และ Excel
              </span>
            </label>
          </div>

          {statusParsed && (
            <div className="mt-3 space-y-2">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between">
                <div>
                  <span className="font-bold block">อ่านข้อมูลได้ {statusParsed.length.toLocaleString()} แถว</span>
                  <span className="text-[10px] text-emerald-700 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {statusFileMeta?.encodingInfo}
                  </span>
                </div>
                <button
                  onClick={() => handleClearSingleFile('status')}
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="ยกเลิกไฟล์นี้"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sample Live Thai Text Preview */}
              {statusParsed.length > 0 && (
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600">
                  <span className="font-bold text-slate-700 block mb-1 text-[10px] flex items-center gap-1">
                    <Eye className="w-3 h-3 text-indigo-600" />
                    ตัวอย่างข้อความภาษาไทยที่อ่านได้:
                  </span>
                  <div className="space-y-0.5 truncate">
                    <p className="truncate text-slate-800">
                      • {statusParsed[0].customerName} ({statusParsed[0].status}) - {statusParsed[0].branch} {statusParsed[0].province}
                    </p>
                    {statusParsed[1] && (
                      <p className="truncate text-slate-800">
                        • {statusParsed[1].customerName} ({statusParsed[1].status}) - {statusParsed[1].branch} {statusParsed[1].province}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upload Zone 3: Sales */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">
                  3
                </span>
                ไฟล์รายการการขาย (Sales)
              </h4>
              <button
                onClick={() => downloadSampleTemplate('sales')}
                className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                title="ดาวน์โหลดเทมเพลตไฟล์ Sales ตัวอย่าง"
              >
                <Download className="w-3 h-3" /> เทมเพลต
              </button>
            </div>

            <div className="p-2.5 bg-emerald-50/60 rounded-lg text-[11px] text-slate-600 mb-3 space-y-1">
              <p>
                <strong>Col. B:</strong> วันที่ชำระเงิน &nbsp;|&nbsp; <strong>Col. F:</strong> ยอดขาย (บาท)
              </p>
              <p>
                <strong>Col. I:</strong> สถานะยอดขาย (<strong>ต้องเป็น 'N' เท่านั้น</strong>)
              </p>
              <p>
                <strong>Col. J:</strong> รหัสลูกค้า (เชื่อมโยงกับ Lead No)
              </p>
            </div>

            <label
              onDrop={(e) => handleDrop(e, 'sales')}
              onDragOver={handleDragOver}
              className={`block border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                salesParsed
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-emerald-500 bg-slate-50/50'
              }`}
            >
              <input
                ref={salesInputRef}
                type="file"
                accept=".csv,.txt,.tsv,.xlsx,.xls"
                onClick={(e) => {
                  (e.target as HTMLInputElement).value = '';
                }}
                onChange={(e) => handleFileInputChange(e, 'sales')}
                className="hidden"
              />
              <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${salesParsed ? 'text-emerald-600' : 'text-emerald-600'}`} />
              <span className="text-xs font-semibold text-slate-800 block truncate">
                {salesFileMeta?.file.name || 'คลิกหรือลากไฟล์ Sales (.txt / .csv / .xlsx) มาวางที่นี่'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">
                รองรับไฟล์ TXT, CSV, TSV และ Excel
              </span>
            </label>
          </div>

          {salesParsed && (
            <div className="mt-3 space-y-2">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between">
                <div>
                  <span className="font-bold block">
                    อ่านได้ {salesParsed.length.toLocaleString()} แถว (Status N:{' '}
                    {salesParsed.filter((s) => s.salesStatus === 'N').length.toLocaleString()})
                  </span>
                  <span className="text-[10px] text-emerald-700 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {salesFileMeta?.encodingInfo}
                  </span>
                </div>
                <button
                  onClick={() => handleClearSingleFile('sales')}
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="ยกเลิกไฟล์นี้"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sample Live Thai Text Preview */}
              {salesParsed.length > 0 && (
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600">
                  <span className="font-bold text-slate-700 block mb-1 text-[10px] flex items-center gap-1">
                    <Eye className="w-3 h-3 text-emerald-600" />
                    ตัวอย่างยอดเงินและสถานะ:
                  </span>
                  <div className="space-y-0.5 truncate">
                    <p className="truncate text-slate-800">
                      • {salesParsed[0].leadNo}: {salesParsed[0].amount.toLocaleString()} ฿ (สถานะ:{' '}
                      <span className={salesParsed[0].salesStatus === 'N' ? 'font-bold text-emerald-600' : 'text-slate-500'}>
                        {salesParsed[0].salesStatus}
                      </span>
                      )
                    </p>
                    {salesParsed[1] && (
                      <p className="truncate text-slate-800">
                        • {salesParsed[1].leadNo}: {salesParsed[1].amount.toLocaleString()} ฿ (สถานะ:{' '}
                        <span className={salesParsed[1].salesStatus === 'N' ? 'font-bold text-emerald-600' : 'text-slate-500'}>
                          {salesParsed[1].salesStatus}
                        </span>
                        )
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Action Bar: Save & Sync Button */}
      <div className="p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-blue-600/15">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs text-white flex items-center justify-center shrink-0">
            <CloudCheck className="w-7 h-7" />
          </div>
          <div>
            <h4 className="font-bold text-white text-base">
              ประมวลผลเชื่อมโยง 3 ไฟล์ และซิงค์ขึ้น Online Database
            </h4>
            <p className="text-xs text-blue-100">
              ระบบจะจับคู่รหัสลูกค้าอัตโนมัติ ถอดรหัสภาษาไทยคมชัด 100% สกัดข้อความ Ads และกรองยอดขายเฉพาะ Status N
            </p>
          </div>
        </div>

        <button
          id="btn-process-and-sync"
          onClick={handleSyncNow}
          disabled={isSyncing || (!mainParsed && !statusParsed && !salesParsed)}
          className="w-full sm:w-auto px-6 py-3 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-blue-700" />
              <span>กำลังประมวลผลและซิงค์...</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4 text-blue-700" />
              <span>บันทึกและซิงค์ข้อมูลขึ้น Online ทันที</span>
            </>
          )}
        </button>
      </div>

      {/* In-App Confirmation Modal for "ล้างข้อมูลทั้งหมด" */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-2">
              ยืนยันการล้างข้อมูลทั้ง 3 ส่วน?
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              ระบบจะล้างข้อมูล Main, Status และ Sales ออกจากฐานข้อมูลเซิร์ฟเวอร์ทั้งหมด เพื่อให้ฐานข้อมูลว่างเปล่า (0 รายการ) พร้อมสำหรับการอัปโหลดไฟล์จริงชุดใหม่ของคุณ
            </p>

            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                id="btn-confirm-execute-clear"
                onClick={executeClearAll}
                disabled={isSyncing}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSyncing ? 'กำลังล้าง...' : 'ยืนยันล้างข้อมูลทันที'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
