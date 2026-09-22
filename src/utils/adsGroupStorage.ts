import { AdsGroup } from '../types';

export const ADS_GROUPS_STORAGE_KEY = 'lead_sales_custom_ads_groups_v2';
export const ADS_GROUPS_BACKUP_KEY = 'lead_sales_ads_groups_backup_v2';

/**
 * Load ads groups from localStorage
 */
export function loadAdsGroupsFromStorage(): AdsGroup[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ADS_GROUPS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load ads groups from localStorage:', err);
  }
  return null;
}

/**
 * Save ads groups to localStorage with a safety backup
 */
export function saveAdsGroupsToStorage(groups: AdsGroup[]): void {
  if (typeof window === 'undefined' || !Array.isArray(groups)) return;
  try {
    const jsonStr = JSON.stringify(groups);
    localStorage.setItem(ADS_GROUPS_STORAGE_KEY, jsonStr);

    // Save timestamped safety backup
    const backupData = {
      savedAt: new Date().toISOString(),
      groups,
    };
    localStorage.setItem(ADS_GROUPS_BACKUP_KEY, JSON.stringify(backupData));
  } catch (err) {
    console.error('Failed to save ads groups to localStorage:', err);
  }
}

/**
 * Retrieve the latest backup from localStorage
 */
export function getAdsGroupsBackup(): { savedAt: string; groups: AdsGroup[] } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ADS_GROUPS_BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.groups)) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to read ads groups backup:', err);
  }
  return null;
}

/**
 * Export ads groups to a downloadable JSON file
 */
export function exportAdsGroupsToJsonFile(groups: AdsGroup[], filename = 'ads_groups_backup.json'): void {
  try {
    const exportObject = {
      app: 'Lead Sales Analytics',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      groupsCount: groups.length,
      groups,
    };
    const jsonStr = JSON.stringify(exportObject, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export ads groups to JSON:', err);
    throw err;
  }
}

/**
 * Parse an imported JSON file and validate ads groups structure
 */
export function parseAdsGroupsFromJson(jsonContent: string): AdsGroup[] {
  try {
    const parsed = JSON.parse(jsonContent);
    let groups: any[] = [];
    if (Array.isArray(parsed)) {
      groups = parsed;
    } else if (parsed && Array.isArray(parsed.groups)) {
      groups = parsed.groups;
    } else {
      throw new Error('โครงสร้างไฟล์ JSON ไม่ถูกต้อง (ไม่พบข้อมูลกลุ่ม Ads)');
    }

    // Validate and sanitize
    const sanitized: AdsGroup[] = groups.map((g, idx) => ({
      id: String(g.id || `grp-${Date.now()}-${idx}`),
      name: String(g.name || `กลุ่มที่ ${idx + 1}`).trim(),
      color: String(g.color || '#3B82F6'),
      assignedAds: Array.isArray(g.assignedAds) ? g.assignedAds.map(String) : [],
      keywords: Array.isArray(g.keywords) ? g.keywords.map(String) : [],
    }));

    if (sanitized.length === 0) {
      throw new Error('ไม่พบข้อมูลกลุ่ม Ads ในไฟล์ที่เลือก');
    }

    return sanitized;
  } catch (err: any) {
    throw new Error(`นำเข้าไฟล์ไม่สำเร็จ: ${err.message}`);
  }
}
