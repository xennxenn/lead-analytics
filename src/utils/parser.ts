import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  JoinedLead,
  RawMainRow,
  RawStatusRow,
  RawSalesRow,
  AdsGroup,
  SalesTransaction,
} from '../types';

const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

/**
 * Clean & normalize a Lead Number for 100% reliable matching across files:
 * Removes whitespace, quotes, invisible chars, and makes uppercase.
 */
export function cleanLeadKey(raw: any): string {
  if (raw === null || raw === undefined) return '';
  return String(raw)
    .replace(/["'\r\n\t\u00A0]/g, '')
    .trim()
    .toUpperCase();
}

/**
 * Get the numeric base of a lead number (stripping leading letters like 'L')
 * e.g. "L260921144635764" -> "260921144635764"
 */
export function getLeadNumericBase(cleanKey: string): string {
  return cleanKey.replace(/^[A-Z]+/, '');
}

/**
 * Check if a string looks like a Lead Number (e.g. L260921... or long digits)
 */
export function looksLikeLeadNo(val: string): boolean {
  const c = cleanLeadKey(val);
  if (!c || c.length < 5) return false;
  // Match L + digits (e.g. L260921144635764)
  if (/^L\d{6,}/i.test(c)) return true;
  // Match pure numeric long ID (e.g. 260921144635764)
  if (/^\d{8,}/.test(c)) return true;
  // Match general lead code (e.g. LEAD-..., LD...)
  if (/^(LEAD|LD)[-_]?\d+/i.test(c)) return true;
  return false;
}

export function extractAdsName(rawText: string | undefined | null): string {
  if (!rawText) return 'ไม่ระบุ Ads';
  const text = String(rawText).trim();
  if (!text || text === 'ไม่ระบุ Ads') return 'ไม่ระบุ Ads';

  // Ignore RTF clipboard / export artifacts
  if (text.includes('{\\rtf') || text.startsWith('{\\rtf') || text.startsWith('"{\\rtf')) {
    return 'ไม่ระบุ Ads';
  }

  // Strict user requirement:
  // "กรณีที่ไม่มีทััง Ads และ Opportunity ไม่ต้องดึงข้อมูลนั้นๆ"
  // Must contain Ads: (or Ads :) pattern
  const adsPrefixRegex = /Ads\s*:\s*([\s\S]*)/i;
  const adsPrefixMatch = text.match(adsPrefixRegex);

  if (!adsPrefixMatch) {
    // If there is NO 'Ads:' prefix, it is NOT an Ads field (could be remarks, customer note, budget, cause, etc.)
    return 'ไม่ระบุ Ads';
  }

  const afterAds = adsPrefixMatch[1];
  let candidate = '';

  // Case A: If Opportunity: exists -> strictly take between Ads: and Opportunity:
  const oppMatch = afterAds.match(/([\s\S]*?)\s*Opportunity\s*:/i);
  if (oppMatch) {
    candidate = oppMatch[1];
  } else {
    // Case B: If Opportunity: does not exist -> stop before other CRM fields (Cause:, Remark:, Quotation:) or newline
    const nextFieldMatch = afterAds.match(
      /([\s\S]*?)\s*(?:Cause|Remark|Quotation|Quotation\s+Amount)\s*:/i
    );
    if (nextFieldMatch) {
      candidate = nextFieldMatch[1];
    } else {
      // Take up to first line break if multi-line
      candidate = afterAds.split(/\r?\n/)[0] || '';
    }
  }

  if (!candidate) return 'ไม่ระบุ Ads';

  // Remove quotes ("", '', “”, ‘’, `) as requested: "และไม่เอา """
  let cleaned = candidate.replace(/[""״''`]/g, '');

  // Normalize whitespace & newlines: collapse multiple spaces/newlines into a single clean space
  cleaned = cleaned.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  // Strip leading/trailing dashes, colons, or punctuation if any
  cleaned = cleaned.replace(/^[-–—:,.\s]+|[-–—:,.\s]+$/g, '').trim();

  // Strict validation: Must not be empty, just 'Ads', dash, 'ไม่ระบุ Ads', or pure numbers / percentages (e.g. '10%')
  if (
    !cleaned ||
    /^ads[:\s]*$/i.test(cleaned) ||
    cleaned === '-' ||
    cleaned === 'ไม่ระบุ Ads' ||
    /^\d+\s*[%％]$/.test(cleaned) ||
    /^\d+$/.test(cleaned)
  ) {
    return 'ไม่ระบุ Ads';
  }

  return cleaned;
}

export function parseLeadDate(leadNo: string): {
  year: number;
  month: string;
  day: string;
  dateStr: string;
  formattedThai: string;
} {
  const clean = cleanLeadKey(leadNo);
  // Format: L260921144635764 or 260921144635764 (YYMMDD)
  const match = clean.match(/^L?(\d{2})(\d{2})(\d{2})/i);
  if (match) {
    const yy = parseInt(match[1], 10);
    const mm = match[2];
    const dd = match[3];
    // In Thailand context, 26 usually means 2026
    const year = 2000 + yy;
    const dateStr = `${year}-${mm}-${dd}`;
    const monthIndex = parseInt(mm, 10) - 1;
    const monthThai = THAI_MONTHS[monthIndex] || mm;
    const formattedThai = `${parseInt(dd, 10)} ${monthThai} ${year + 543}`;
    return { year, month: mm, day: dd, dateStr, formattedThai };
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return {
    year,
    month,
    day,
    dateStr: `${year}-${month}-${day}`,
    formattedThai: 'ไม่ระบุวันที่',
  };
}

/**
 * Parse various payment date formats (e.g. "08/12/2024 12:37:35.986", "24/10/2025", "2024-12-08")
 * into a valid Date object.
 */
export function parsePaymentDateToDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (!s) return null;

  // Case 1: DD/MM/YYYY or DD/MM/YYYY HH:mm:ss (.sss)
  const dmMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmMatch) {
    let year = parseInt(dmMatch[3], 10);
    if (year > 2400) year -= 543;
    const month = parseInt(dmMatch[2], 10) - 1;
    const day = parseInt(dmMatch[1], 10);
    const hour = dmMatch[4] ? parseInt(dmMatch[4], 10) : 0;
    const min = dmMatch[5] ? parseInt(dmMatch[5], 10) : 0;
    const sec = dmMatch[6] ? parseInt(dmMatch[6], 10) : 0;
    return new Date(year, month, day, hour, min, sec);
  }

  // Case 2: YYYY-MM-DD or YYYY-MM-DD HH:mm:ss
  const ymMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (ymMatch) {
    let year = parseInt(ymMatch[1], 10);
    if (year > 2400) year -= 543;
    const month = parseInt(ymMatch[2], 10) - 1;
    const day = parseInt(ymMatch[3], 10);
    const hour = ymMatch[4] ? parseInt(ymMatch[4], 10) : 0;
    const min = ymMatch[5] ? parseInt(ymMatch[5], 10) : 0;
    const sec = ymMatch[6] ? parseInt(ymMatch[6], 10) : 0;
    return new Date(year, month, day, hour, min, sec);
  }

  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format a Date object into readable Thai format with optional time
 */
export function formatThaiDateTime(date: Date | null, includeTime = true): string {
  if (!date || isNaN(date.getTime())) return '-';
  const day = date.getDate();
  const month = THAI_MONTHS[date.getMonth()] || `${date.getMonth() + 1}`;
  const yearThai = date.getFullYear() + 543;
  if (!includeTime) {
    return `${day} ${month} ${yearThai}`;
  }
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${yearThai} ${hours}:${minutes} น.`;
}

/**
 * Calculate the difference in calendar days between Lead created date and Payment date.
 * If paid on the exact same day, returns 0.
 */
export function calcDaysBetween(leadCreatedDateStr: string, paymentDateStr: string): number | null {
  if (!leadCreatedDateStr || !paymentDateStr) return null;
  const [ly, lm, ld] = leadCreatedDateStr.split('-').map(Number);
  if (!ly || !lm || !ld) return null;
  const leadDate = new Date(ly, lm - 1, ld, 0, 0, 0);

  const payDate = parsePaymentDateToDate(paymentDateStr);
  if (!payDate) return null;

  const payMidnight = new Date(payDate.getFullYear(), payDate.getMonth(), payDate.getDate(), 0, 0, 0);
  const diffMs = payMidnight.getTime() - leadDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Intelligent delimiter detector analyzing first 30 non-empty lines
 */
function detectDelimiter(text: string): string {
  const lines = text.split(/\r?\n/).slice(0, 30).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return ',';

  let tabCount = 0;
  let commaCount = 0;
  let semiCount = 0;
  let pipeCount = 0;

  for (const line of lines) {
    tabCount += (line.match(/\t/g) || []).length;
    commaCount += (line.match(/,/g) || []).length;
    semiCount += (line.match(/;/g) || []).length;
    pipeCount += (line.match(/\|/g) || []).length;
  }

  // If tabs are significantly present per line, it's tab-delimited
  if (tabCount >= lines.length && tabCount > commaCount) return '\t';
  if (commaCount > tabCount && commaCount >= semiCount) return ',';
  if (semiCount > commaCount && semiCount > tabCount) return ';';
  if (pipeCount > commaCount && pipeCount > tabCount) return '|';
  if (tabCount > 0) return '\t';
  return ',';
}

/**
 * Robust matrix parser for text/CSV/TSV files:
 * 1. Removes BOM & null bytes
 * 2. Autodetects delimiters (\t, ,, ;, |)
 * 3. Handles unmatched quotes (which often swallow hundreds of rows in Thai TSV/Excel exports)
 */
export function parseFileMatrix(content: string): string[][] {
  if (!content) return [];
  // Remove BOM and null bytes
  const cleanContent = content.replace(/^\uFEFF/, '').replace(/\0/g, '');

  const delimiter = detectDelimiter(cleanContent);

  // Standard PapaParse
  const parsedNormal = Papa.parse<string[]>(cleanContent, {
    delimiter,
    skipEmptyLines: 'greedy',
  });

  const normalRows = (parsedNormal.data || []) as string[][];

  // If TSV or if there are errors or unclosed quotes:
  // Try relaxed quote mode (quotes treated as literal characters so they never swallow rows)
  const parsedRelaxed = Papa.parse<string[]>(cleanContent, {
    delimiter,
    quoteChar: '', // disables quote parsing
    skipEmptyLines: 'greedy',
  });

  const relaxedRows = (parsedRelaxed.data || []) as string[][];

  // If relaxed parse yielded significantly more rows (> 15% more), PapaParse swallowed lines due to quotes!
  if (relaxedRows.length > normalRows.length * 1.15) {
    return relaxedRows;
  }

  // If normal rows has rows, return it
  if (normalRows.length > 0) {
    return normalRows;
  }

  // Fallback: Line-by-line split
  const rawLines = cleanContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return rawLines.map((line) => line.split(delimiter));
}

/**
 * Robust Excel (.xlsx / .xls) buffer parser:
 * Automatically selects the sheet with the most data (not just sheet 0!)
 */
export function parseExcelBuffer(buffer: ArrayBuffer): string[][] {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) return [];

    let bestSheetName = workbook.SheetNames[0];
    let maxCellCount = 0;

    // Pick sheet with maximum rows/cells
    for (const name of workbook.SheetNames) {
      const ws = workbook.Sheets[name];
      if (ws && ws['!ref']) {
        const range = XLSX.utils.decode_range(ws['!ref']);
        const count = (range.e.r - range.s.r + 1) * (range.e.c - range.s.c + 1);
        if (count > maxCellCount) {
          maxCellCount = count;
          bestSheetName = name;
        }
      }
    }

    const worksheet = workbook.Sheets[bestSheetName];
    if (!worksheet) return [];

    const sheetData = XLSX.utils.sheet_to_json<any[]>(worksheet, {
      header: 1,
      defval: '',
      raw: false,
    });
    return (sheetData || []) as string[][];
  } catch (err) {
    console.error('Excel parse error:', err);
    return [];
  }
}

function toMatrix(input: string | string[][]): string[][] {
  if (Array.isArray(input)) return input;
  return parseFileMatrix(input);
}

/**
 * Scan first 10 rows to locate the real header row index
 */
function findHeaderRow(
  rows: string[][],
  matchKeywords: (rowStr: string) => boolean
): number {
  const maxScan = Math.min(rows.length, 10);
  for (let i = 0; i < maxScan; i++) {
    const rowStr = (rows[i] || []).join(' ').toLowerCase();
    if (matchKeywords(rowStr)) {
      return i;
    }
  }
  return -1;
}

// ----------------------------------------------------
// 1. FILE 1: MAIN (Col A: Lead No, Col Y: Ads)
// ----------------------------------------------------
export function parseMainContent(input: string | string[][]): RawMainRow[] {
  const rows = toMatrix(input);
  if (rows.length === 0) return [];

  let leadCol = 0; // Col A default
  let adsCol = 24; // Col Y default
  let startIndex = 0;

  // Search for header row in top 10 rows
  const headerIdx = findHeaderRow(rows, (str) =>
    (str.includes('lead') || str.includes('รหัส') || str.includes('cust')) &&
    (str.includes('ads') || str.includes('โฆษณา') || str.includes('opp') || str.includes('ที่มา') || str.includes('แคมเปญ'))
  );

  if (headerIdx !== -1) {
    startIndex = headerIdx + 1;
    const headerRow = rows[headerIdx];
    headerRow.forEach((col, idx) => {
      const c = String(col || '').trim().toLowerCase();
      if (
        c.includes('lead') ||
        c.includes('รหัสลูกค้า') ||
        c.includes('รหัสลีด') ||
        c.includes('cust_id') ||
        c === 'รหัส' ||
        c === 'id' ||
        c === 'no'
      ) {
        leadCol = idx;
      }
      if (
        c.includes('ads') ||
        c.includes('โฆษณา') ||
        c.includes('campaign') ||
        c.includes('แคมเปญ') ||
        c.includes('utm') ||
        c.includes('ช่องทาง')
      ) {
        adsCol = idx;
      }
    });
  } else {
    // If no explicit dual header, check if row 0 has lead or ads
    const firstRowStr = (rows[0] || []).join(' ').toLowerCase();
    if (firstRowStr.includes('lead') || firstRowStr.includes('รหัส') || firstRowStr.includes('ads')) {
      startIndex = 1;
      (rows[0] || []).forEach((col, idx) => {
        const c = String(col || '').trim().toLowerCase();
        if (c.includes('lead') || c.includes('รหัสลูกค้า') || c.includes('รหัสลีด') || c === 'รหัส') leadCol = idx;
        if (c.includes('ads') || c.includes('โฆษณา') || c.includes('แคมเปญ')) adsCol = idx;
      });
    }
  }

  const result: RawMainRow[] = [];

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    // 1. Extract Lead No
    let leadNo = cleanLeadKey(row[leadCol]);

    // Fallback: If leadCol cell is blank or doesn't look like a lead, scan other columns
    if (!leadNo || !looksLikeLeadNo(leadNo)) {
      for (let c = 0; c < row.length; c++) {
        const val = cleanLeadKey(row[c]);
        if (looksLikeLeadNo(val)) {
          leadNo = val;
          break;
        }
      }
    }

    // Skip only if row completely has no identifier
    if (!leadNo) continue;

    // 2. Extract Ads text
    // Check Col Y (index 24) or adsCol
    let rawAds = (row.length > 24 ? String(row[24] || '') : '') || String(row[adsCol] || '');

    // Check if rawAds contains Ads:
    let hasAds = /Ads\s*:/i.test(rawAds);

    // If rawAds doesn't have Ads:, check other cells in this row
    if (!hasAds) {
      // First try to find any cell in this row that contains BOTH Ads: and Opportunity:
      let found = false;
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] || '');
        if (/Ads\s*:/i.test(cell) && /Opportunity\s*:/i.test(cell)) {
          rawAds = cell;
          found = true;
          hasAds = true;
          break;
        }
      }

      // If no cell contains both, check if any cell contains Ads:
      if (!found) {
        for (let c = 0; c < row.length; c++) {
          const cell = String(row[c] || '');
          if (/Ads\s*:/i.test(cell)) {
            rawAds = cell;
            hasAds = true;
            break;
          }
        }
      }

      // If still no cell contains Ads:, clear rawAds so customer remarks/causes do not leak
      if (!hasAds) {
        rawAds = '';
      }
    }

    result.push({
      leadNo,
      rawAds,
      extractedAds: extractAdsName(rawAds),
    });
  }

  return result;
}

// ----------------------------------------------------
// 2. FILE 2: STATUS
// Col B (1): Status, Col C (2): Lead No, Col G (6): Name, Col H (7): Phone
// Col M (12): Source, Col O (14): Job Type, Col P (15): Staff
// Col V (21): Branch, Col Y (24): District, Col Z (25): Province
// ----------------------------------------------------
export function parseStatusContent(input: string | string[][]): RawStatusRow[] {
  const rows = toMatrix(input);
  if (rows.length === 0) return [];

  let statusCol = 1;
  let leadCol = 2;
  let nameCol = 6;
  let phoneCol = 7;
  let sourceCol = 12;
  let jobCol = 14;
  let staffCol = 15;
  let branchCol = 21;
  let distCol = 24;
  let provCol = 25;
  let startIndex = 0;

  // Search top 10 rows for header
  const headerIdx = findHeaderRow(rows, (str) =>
    (str.includes('lead') || str.includes('รหัส') || str.includes('ลูกค้า') || str.includes('cust')) &&
    (str.includes('status') || str.includes('สถานะ') || str.includes('เบอร์') || str.includes('สาขา') || str.includes('จังหวัด'))
  );

  if (headerIdx !== -1) {
    startIndex = headerIdx + 1;
    const headerRow = rows[headerIdx];
    headerRow.forEach((col, idx) => {
      const c = String(col || '').trim().toLowerCase();
      if (c.includes('status') || c.includes('สถานะ') || c.includes('ขั้นตอน') || c.includes('stage')) {
        statusCol = idx;
      } else if (
        c.includes('lead') ||
        c.includes('รหัสลูกค้า') ||
        c.includes('รหัสลีด') ||
        c.includes('รหัส lead') ||
        c.includes('cust_id') ||
        c.includes('cust no') ||
        c === 'รหัส'
      ) {
        leadCol = idx;
      } else if (c.includes('name') || c.includes('ชื่อลูกค้า') || c.includes('ชื่อ-สกุล') || c.includes('ชื่อ')) {
        nameCol = idx;
      } else if (c.includes('phone') || c.includes('tel') || c.includes('mobile') || c.includes('เบอร์') || c.includes('โทร')) {
        phoneCol = idx;
      } else if (c.includes('source') || c.includes('ที่มา') || c.includes('ช่องทาง') || c.includes('media') || c.includes('channel')) {
        sourceCol = idx;
      } else if (c.includes('job') || c.includes('ประเภทงาน') || c.includes('หน้างาน') || c.includes('ประเภท') || c.includes('type')) {
        jobCol = idx;
      } else if (c.includes('staff') || c.includes('พนักงาน') || c.includes('ผู้ดูแล') || c.includes('ผู้รับผิดชอบ') || c.includes('admin') || c.includes('sales')) {
        staffCol = idx;
      } else if (c.includes('branch') || c.includes('สาขา') || c.includes('หน้าร้าน')) {
        branchCol = idx;
      } else if (c.includes('district') || c.includes('อำเภอ') || c.includes('เขต') || c.includes('amphoe')) {
        distCol = idx;
      } else if (c.includes('province') || c.includes('จังหวัด')) {
        provCol = idx;
      }
    });
  } else {
    // Check row 0
    const firstRowStr = (rows[0] || []).join(' ').toLowerCase();
    if (firstRowStr.includes('lead') || firstRowStr.includes('status') || firstRowStr.includes('สถานะ') || firstRowStr.includes('รหัส')) {
      startIndex = 1;
      (rows[0] || []).forEach((col, idx) => {
        const c = String(col || '').trim().toLowerCase();
        if (c.includes('status') || c.includes('สถานะ')) statusCol = idx;
        else if (c.includes('lead') || c.includes('รหัส')) leadCol = idx;
        else if (c.includes('name') || c.includes('ชื่อ')) nameCol = idx;
        else if (c.includes('phone') || c.includes('tel') || c.includes('เบอร์') || c.includes('โทร')) phoneCol = idx;
        else if (c.includes('source') || c.includes('ที่มา') || c.includes('ช่องทาง')) sourceCol = idx;
        else if (c.includes('job') || c.includes('ประเภท')) jobCol = idx;
        else if (c.includes('staff') || c.includes('พนักงาน') || c.includes('ผู้ดูแล')) staffCol = idx;
        else if (c.includes('branch') || c.includes('สาขา')) branchCol = idx;
        else if (c.includes('district') || c.includes('อำเภอ') || c.includes('เขต')) distCol = idx;
        else if (c.includes('province') || c.includes('จังหวัด')) provCol = idx;
      });
    }
  }

  const result: RawStatusRow[] = [];

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    // 1. Extract Lead No
    let leadNo = cleanLeadKey(row[leadCol]);

    // Fallback: If leadCol cell is empty or doesn't look like a lead, scan other columns
    if (!leadNo || !looksLikeLeadNo(leadNo)) {
      for (let c = 0; c < row.length; c++) {
        const val = cleanLeadKey(row[c]);
        if (looksLikeLeadNo(val)) {
          leadNo = val;
          break;
        }
      }
    }

    if (!leadNo) continue;

    result.push({
      status: String(row[statusCol] || '').trim() || 'ไม่ระบุสถานะ',
      leadNo,
      customerName: String(row[nameCol] || '').trim() || 'ลูกค้าทั่วไป',
      phone: String(row[phoneCol] || '').trim() || '-',
      source: String(row[sourceCol] || '').trim() || 'ไม่ระบุแหล่งที่มา',
      jobType: String(row[jobCol] || '').trim() || 'ไม่ระบุประเภท',
      staff: String(row[staffCol] || '').trim() || 'ไม่ระบุพนักงาน',
      branch: String(row[branchCol] || '').trim() || 'สำนักงานใหญ่',
      district: String(row[distCol] || '').trim() || '-',
      province: String(row[provCol] || '').trim() || 'ไม่ระบุจังหวัด',
    });
  }

  return result;
}

// ----------------------------------------------------
// 3. FILE 3: SALES
// Col B (1): Payment Date, Col F (5): Amount
// Col I (8): Sales Status (N), Col J (9): Lead No
// ----------------------------------------------------
export function parseSalesContent(input: string | string[][]): RawSalesRow[] {
  const rows = toMatrix(input);
  if (rows.length === 0) return [];

  let dateCol = 1;
  let amountCol = 5;
  let statusCol = 8;
  let leadCol = 9;
  let startIndex = 0;
  let hasDetectedStatusCol = false;

  // Search top 10 rows for header
  const headerIdx = findHeaderRow(rows, (str) =>
    (str.includes('lead') || str.includes('รหัส') || str.includes('cust')) &&
    (str.includes('amount') || str.includes('ยอด') || str.includes('ชำระ') || str.includes('date') || str.includes('status') || str.includes('สถานะ'))
  );

  if (headerIdx !== -1) {
    startIndex = headerIdx + 1;
    const headerRow = rows[headerIdx];
    headerRow.forEach((col, idx) => {
      const c = String(col || '').trim().toLowerCase();
      // Important: Check amount keywords before date keywords
      if (
        c.includes('amount') ||
        c.includes('ยอดเงิน') ||
        c.includes('ยอดขาย') ||
        c.includes('ราคา') ||
        c.includes('จำนวนเงิน') ||
        c.includes('บาท') ||
        c.includes('price') ||
        c.includes('total')
      ) {
        amountCol = idx;
      } else if (
        c.includes('date') ||
        c.includes('วันที่') ||
        c.includes('วันเวลา') ||
        c.includes('ชำระเมื่อ')
      ) {
        dateCol = idx;
      } else if (
        c.includes('sales_status') ||
        c.includes('sales status') ||
        c.includes('สถานะยอดขาย') ||
        c.includes('สถานะบิล') ||
        c.includes('สถานะการขาย') ||
        c.includes('สถานะ') ||
        c === 'status'
      ) {
        statusCol = idx;
        hasDetectedStatusCol = true;
      } else if (
        c.includes('lead') ||
        c.includes('รหัสลูกค้า') ||
        c.includes('รหัสลีด') ||
        c.includes('รหัส lead') ||
        c.includes('cust_id') ||
        c.includes('cust no') ||
        c === 'รหัส'
      ) {
        leadCol = idx;
      }
    });
  } else {
    // Check row 0
    const firstRowStr = (rows[0] || []).join(' ').toLowerCase();
    if (firstRowStr.includes('lead') || firstRowStr.includes('amount') || firstRowStr.includes('ยอดขาย') || firstRowStr.includes('รหัส')) {
      startIndex = 1;
      (rows[0] || []).forEach((col, idx) => {
        const c = String(col || '').trim().toLowerCase();
        if (c.includes('amount') || c.includes('ยอดเงิน') || c.includes('ยอดขาย') || c.includes('ราคา') || c.includes('บาท')) {
          amountCol = idx;
        } else if (c.includes('date') || c.includes('วันที่')) {
          dateCol = idx;
        } else if (c.includes('status') || c.includes('สถานะ')) {
          statusCol = idx;
          hasDetectedStatusCol = true;
        } else if (c.includes('lead') || c.includes('รหัส')) {
          leadCol = idx;
        }
      });
    }
  }

  const result: RawSalesRow[] = [];

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    // 1. Extract Lead No
    let leadNo = cleanLeadKey(row[leadCol]);

    // Fallback: If leadCol cell is empty or doesn't look like a lead, scan other columns
    if (!leadNo || !looksLikeLeadNo(leadNo)) {
      for (let c = 0; c < row.length; c++) {
        const val = cleanLeadKey(row[c]);
        if (looksLikeLeadNo(val)) {
          leadNo = val;
          break;
        }
      }
    }

    if (!leadNo) continue;

    const paymentDate = String(row[dateCol] || '').trim();
    const rawAmount = String(row[amountCol] || '0').replace(/[^0-9.-]+/g, '');
    const amount = parseFloat(rawAmount) || 0;

    let salesStatus = String(row[statusCol] || '').trim().toUpperCase();

    // If file doesn't have a status column or status cell was empty, default to 'N'
    if (!hasDetectedStatusCol && !salesStatus) {
      salesStatus = 'N';
    } else if (!salesStatus) {
      // If cell was empty but other rows have 'N', treat as empty
      salesStatus = '';
    }

    result.push({
      leadNo,
      paymentDate,
      amount,
      salesStatus,
    });
  }

  return result;
}

export function matchAdsGroup(adsName: string, adsGroups: AdsGroup[], directMap?: Map<string, string>): string {
  if (!adsName || adsName === 'ไม่ระบุ Ads') return 'ทั่วไป / ไม่ระบุกลุ่ม';

  // 1. Direct assignment via fast map lookup
  if (directMap) {
    const directName = directMap.get(adsName);
    if (directName) return directName;
  } else {
    for (const group of adsGroups) {
      if (group.assignedAds && group.assignedAds.includes(adsName)) {
        return group.name;
      }
    }
  }

  // 2. Keyword matching
  const lowerName = adsName.toLowerCase();
  for (const group of adsGroups) {
    if (group.keywords && group.keywords.length > 0) {
      for (const kw of group.keywords) {
        if (kw && lowerName.includes(kw.toLowerCase())) {
          return group.name;
        }
      }
    }
  }

  return 'กลุ่มอื่นๆ / ยังไม่จัดกลุ่ม';
}

/**
 * Join all 3 datasets seamlessly:
 * Matches Lead No by exact cleaned key AND by numeric base (handling 'L' prefix discrepancies)
 */
export function joinDatasets(
  mainRows: RawMainRow[],
  statusRows: RawStatusRow[],
  salesRows: RawSalesRow[],
  adsGroups: AdsGroup[]
): JoinedLead[] {
  // Pre-build fast direct mapping for Ads Groups (O(1) lookup)
  const directAdsMap = new Map<string, string>();
  adsGroups.forEach((g) => {
    if (g.assignedAds) {
      g.assignedAds.forEach((ad) => {
        directAdsMap.set(ad, g.name);
      });
    }
  });

  // Dual-key maps: mapped by full clean key AND numeric base
  const mapMainByFull = new Map<string, RawMainRow>();
  const mapMainByNum = new Map<string, RawMainRow>();
  mainRows.forEach((r) => {
    const full = cleanLeadKey(r.leadNo);
    const num = getLeadNumericBase(full);
    mapMainByFull.set(full, r);
    if (num) mapMainByNum.set(num, r);
  });

  const mapStatusByFull = new Map<string, RawStatusRow>();
  const mapStatusByNum = new Map<string, RawStatusRow>();
  statusRows.forEach((r) => {
    const full = cleanLeadKey(r.leadNo);
    const num = getLeadNumericBase(full);
    mapStatusByFull.set(full, r);
    if (num) mapStatusByNum.set(num, r);
  });

  // Multiple sales rows per lead
  const mapSalesByFull = new Map<string, RawSalesRow[]>();
  const mapSalesByNum = new Map<string, RawSalesRow[]>();
  salesRows.forEach((r) => {
    const full = cleanLeadKey(r.leadNo);
    const num = getLeadNumericBase(full);

    const listFull = mapSalesByFull.get(full) || [];
    listFull.push(r);
    mapSalesByFull.set(full, listFull);

    if (num) {
      const listNum = mapSalesByNum.get(num) || [];
      listNum.push(r);
      mapSalesByNum.set(num, listNum);
    }
  });

  // User Explicit Rule:
  // "แสดงข้อมุล Lead เฉพาะที่มีข้อมุลในไฟล์ Status ส่วนไฟล์ Main และ Sales เอาไว้เป็นส่วนเสริมขิงข้อมูลเท่านั้น"
  // Leads list is driven EXCLUSIVELY by statusRows!
  const joinedList: JoinedLead[] = [];
  const seenStatusLeadKeys = new Set<string>();

  for (const statusRow of statusRows) {
    const rawLead = cleanLeadKey(statusRow.leadNo);
    if (!rawLead) continue;

    const numBase = getLeadNumericBase(rawLead);
    const dedupKey = numBase || rawLead;

    // Deduplicate in case Status file has duplicate entries for the exact same lead
    if (seenStatusLeadKeys.has(dedupKey)) {
      continue;
    }
    seenStatusLeadKeys.add(dedupKey);

    // 1. Get Main data (supplemental)
    const main = mapMainByFull.get(rawLead) || (numBase ? mapMainByNum.get(numBase) : undefined);

    // 2. Get Sales data (supplemental)
    const salesList =
      mapSalesByFull.get(rawLead) || (numBase ? mapSalesByNum.get(numBase) : undefined) || [];

    const dateInfo = parseLeadDate(rawLead);
    const rawAds = main?.rawAds || '';
    let extractedAds = 'ไม่ระบุ Ads';
    if (main) {
      const fromRaw = extractAdsName(rawAds);
      if (fromRaw !== 'ไม่ระบุ Ads') {
        extractedAds = fromRaw;
      } else if (main.extractedAds) {
        extractedAds = extractAdsName(main.extractedAds);
      }
    }
    const adsGroupName = matchAdsGroup(extractedAds, adsGroups, directAdsMap);

    // Filter sales by status 'N' as required:
    // "Col. I คือ สถานะของยอดขาย (ต้องเป็น N เท่านั้นถึงนำมารวมเป็นยอดขาย)"
    const validSales = salesList.filter((s) => {
      const st = String(s.salesStatus || '').trim().toUpperCase();
      return st === 'N' || st === 'SUCCESS' || st === 'PAID' || st === 'ปกติ';
    });

    const totalSales = validSales.reduce((sum, s) => sum + s.amount, 0);
    const salesCount = validSales.length;
    const hasSales = totalSales > 0 || salesCount > 0;

    // Map sales transactions with pre-computed timestamps for fast sorting
    const salesTxWithMeta: Array<SalesTransaction & { _ts: number; _isValid: boolean }> = salesList.map((s) => {
      const pDate = parsePaymentDateToDate(s.paymentDate);
      const days = calcDaysBetween(dateInfo.dateStr, s.paymentDate);
      const st = String(s.salesStatus || '').trim().toUpperCase();
      const isValid = st === 'N' || st === 'SUCCESS' || st === 'PAID' || st === 'ปกติ';
      return {
        date: s.paymentDate,
        formattedDateThai: pDate ? formatThaiDateTime(pDate) : s.paymentDate,
        amount: s.amount,
        status: s.salesStatus,
        daysFromLeadCreation: days,
        _ts: pDate ? pDate.getTime() : 0,
        _isValid: isValid,
      };
    });

    // Valid sales transactions (N status) chronologically ordered (single-pass numeric sort)
    const validTransactions = salesTxWithMeta
      .filter((tx) => tx._isValid)
      .sort((a, b) => a._ts - b._ts);

    const daysToFirstPayment =
      validTransactions.length > 0 && validTransactions[0].daysFromLeadCreation !== undefined
        ? validTransactions[0].daysFromLeadCreation
        : null;

    const daysToLastPayment =
      validTransactions.length > 0 &&
      validTransactions[validTransactions.length - 1].daysFromLeadCreation !== undefined
        ? validTransactions[validTransactions.length - 1].daysFromLeadCreation
        : null;

    const paymentDates = validTransactions.map((s) => s.date).filter(Boolean);

    // Clean salesTransactions array
    const salesTransactions: SalesTransaction[] = salesTxWithMeta.map(({ _ts, _isValid, ...rest }) => rest);

    joinedList.push({
      id: rawLead,
      leadNo: rawLead,
      createdYear: dateInfo.year,
      createdMonth: dateInfo.month,
      createdDay: dateInfo.day,
      createdDateStr: dateInfo.dateStr,
      createdDateFormattedThai: dateInfo.formattedThai,
      status: statusRow.status || 'ไม่ระบุสถานะ',
      customerName: statusRow.customerName || 'ลูกค้าทั่วไป',
      phone: statusRow.phone || '-',
      source: statusRow.source || 'ไม่ระบุแหล่งที่มา',
      jobType: statusRow.jobType || 'ไม่ระบุประเภท',
      staff: statusRow.staff || 'ไม่ระบุพนักงาน',
      branch: statusRow.branch || 'สำนักงานใหญ่',
      district: statusRow.district || '-',
      province: statusRow.province || 'ไม่ระบุจังหวัด',
      extractedAds,
      adsGroup: adsGroupName,
      rawAds,
      totalSales,
      salesCount,
      hasSales,
      salesTransactions,
      firstPaymentDate: paymentDates[0],
      lastPaymentDate: paymentDates[paymentDates.length - 1],
      daysToFirstPayment,
      daysToLastPayment,
    });
  }

  // Sort by default by created date desc
  joinedList.sort((a, b) => b.leadNo.localeCompare(a.leadNo));
  return joinedList;
}

export function exportToExcel(leads: JoinedLead[], filename = 'Lead_Sales_Report') {
  const exportData = leads.map((item, index) => {
    const paymentDetails = item.salesTransactions
      .filter((t) => {
        const st = String(t.status || '').trim().toUpperCase();
        return st === 'N' || st === 'SUCCESS' || st === 'PAID' || st === 'ปกติ';
      })
      .map((t, idx) => `งวด ${idx + 1}: ${t.formattedDateThai || t.date} (${t.amount.toLocaleString()} บ. / ${t.daysFromLeadCreation ?? '-'} วัน)`)
      .join('; ');

    return {
      'ลำดับ': index + 1,
      'รหัสลูกค้า (Lead No)': item.leadNo,
      'วันที่สร้าง Lead': item.createdDateFormattedThai,
      'ปี': item.createdYear,
      'เดือน': item.createdMonth,
      'ชื่อลูกค้า': item.customerName,
      'เบอร์ติดต่อ': item.phone,
      'สถานะ Lead': item.status,
      'ยอดขายเกิดขึ้นจริง': item.hasSales ? 'มียอดขาย' : 'ยังไม่มียอดขาย',
      'ยอดขายรวม (บาท)': item.totalSales,
      'จำนวนครั้งที่ชำระ': item.salesCount,
      'ระยะเวลาถึงชำระเงินงวดแรก (วัน)': item.daysToFirstPayment !== null && item.daysToFirstPayment !== undefined ? `${item.daysToFirstPayment} วัน` : '-',
      'ระยะเวลาถึงปิดยอดล่าสุด (วัน)': item.daysToLastPayment !== null && item.daysToLastPayment !== undefined ? `${item.daysToLastPayment} วัน` : '-',
      'วันที่ชำระเงินครั้งแรก': item.firstPaymentDate || '-',
      'วันที่ชำระเงินล่าสุด': item.lastPaymentDate || '-',
      'รายละเอียดการชำระเงิน': paymentDetails || '-',
      'พนักงานผู้ดูแล': item.staff,
      'สาขา': item.branch,
      'อำเภอ': item.district,
      'จังหวัด': item.province,
      'แหล่งที่มา': item.source,
      'ประเภทหน้างาน': item.jobType,
      'Ads ที่ดึงดูด': item.extractedAds,
      'กลุ่ม Ads': item.adsGroup,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads & Sales');

  // Add Summary sheet
  const totalLeads = leads.length;
  const wonLeads = leads.filter((l) => l.hasSales).length;
  const totalSales = leads.reduce((sum, l) => sum + l.totalSales, 0);
  const convRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;
  const avgDeal = wonLeads > 0 ? totalSales / wonLeads : 0;

  const summaryData = [
    { 'รายการ': 'จำนวน Lead ทั้งหมด', 'ค่า': totalLeads, 'หน่วย': 'คน' },
    { 'รายการ': 'จำนวน Lead ที่ปิดการขายได้ (มียอดเงิน)', 'ค่า': wonLeads, 'หน่วย': 'คน' },
    { 'รายการ': 'อัตราการปิดการขาย (Conversion Rate)', 'ค่า': convRate.toFixed(2) + '%', 'หน่วย': '%' },
    { 'รายการ': 'ยอดขายรวมทั้งหมด (เฉพาะสถานะ N)', 'ค่า': totalSales.toLocaleString(), 'หน่วย': 'บาท' },
    { 'รายการ': 'ยอดขายเฉลี่ยต่อ Lead ที่ปิดได้', 'ค่า': avgDeal.toLocaleString(undefined, { maximumFractionDigits: 0 }), 'หน่วย': 'บาท' },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'สรุปภาพรวม');

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportToCSV(leads: JoinedLead[], filename = 'Lead_Sales_Report') {
  const exportData = leads.map((item, index) => ({
    'ลำดับ': index + 1,
    'รหัสลูกค้า': item.leadNo,
    'วันที่สร้าง': item.createdDateFormattedThai,
    'ชื่อลูกค้า': item.customerName,
    'เบอร์ติดต่อ': item.phone,
    'สถานะ Lead': item.status,
    'ยอดขายรวม (บาท)': item.totalSales,
    'จำนวนครั้งที่ชำระ': item.salesCount,
    'พนักงานผู้ดูแล': item.staff,
    'สาขา': item.branch,
    'อำเภอ': item.district,
    'จังหวัด': item.province,
    'แหล่งที่มา': item.source,
    'ประเภทหน้างาน': item.jobType,
    'Ads': item.extractedAds,
    'กลุ่ม Ads': item.adsGroup,
  }));

  const csv = Papa.unparse(exportData);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
