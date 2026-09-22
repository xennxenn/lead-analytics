import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Check,
  Save,
  Tag,
  Sparkles,
  FolderPlus,
  AlertCircle,
  X,
  Search,
  Filter,
  FolderKanban,
  CheckSquare,
  Square,
  ArrowRight,
  Download,
  Upload,
  RotateCcw,
} from 'lucide-react';
import { AdsGroup, JoinedLead } from '../types';
import {
  exportAdsGroupsToJsonFile,
  parseAdsGroupsFromJson,
  getAdsGroupsBackup,
  saveAdsGroupsToStorage,
} from '../utils/adsGroupStorage';

interface AdsGroupManagerProps {
  adsGroups: AdsGroup[];
  leads: JoinedLead[];
  onSaveAdsGroups: (groups: AdsGroup[]) => Promise<void>;
  isSaving: boolean;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#EF4444', // Red
  '#84CC16', // Lime
  '#64748B', // Slate
];

export const AdsGroupManager: React.FC<AdsGroupManagerProps> = ({
  adsGroups,
  leads,
  onSaveAdsGroups,
  isSaving,
}) => {
  const [localGroups, setLocalGroups] = useState<AdsGroup[]>(adsGroups);

  // Group Delete State
  const [groupToDelete, setGroupToDelete] = useState<AdsGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Group Edit State
  const [editingGroup, setEditingGroup] = useState<AdsGroup | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(PRESET_COLORS[0]);
  const [editKeywords, setEditKeywords] = useState('');
  const [editSearchAd, setEditSearchAd] = useState('');

  // Top Add Group Modal
  const [showTopAddModal, setShowTopAddModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(PRESET_COLORS[0]);
  const [newGroupKeywords, setNewGroupKeywords] = useState('');

  // Quick Create & Move State (Triggered inline from row or bulk action)
  const [quickCreateAds, setQuickCreateAds] = useState<string[] | null>(null);
  const [quickGroupName, setQuickGroupName] = useState('');
  const [quickGroupColor, setQuickGroupColor] = useState(PRESET_COLORS[0]);
  const [quickGroupKeywords, setQuickGroupKeywords] = useState('');

  // Table State
  const [selectedAds, setSelectedAds] = useState<string[]>([]);
  const [searchAds, setSearchAds] = useState('');
  const [filterGroupOption, setFilterGroupOption] = useState<string>('all');

  // Notification State
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportBackup = () => {
    exportAdsGroupsToJsonFile(localGroups);
    setSaveSuccessMessage('ดาวน์โหลดไฟล์สำรอง ads_groups_backup.json สำเร็จแล้ว');
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = parseAdsGroupsFromJson(text);
      if (imported && imported.length > 0) {
        await saveGroups(imported, `กู้คืนกลุ่ม Ads จากไฟล์ ${file.name} สำเร็จ (${imported.length} กลุ่ม)`);
      } else {
        alert('รูปแบบไฟล์ JSON ไม่ถูกต้องหรือไม่พบข้อมูลกลุ่ม Ads');
      }
    } catch (err: any) {
      alert(`ไม่สามารถอ่านไฟล์ได้: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRestoreBackup = async () => {
    const backup = getAdsGroupsBackup();
    if (!backup || !backup.groups || backup.groups.length === 0) {
      alert('ไม่พบประวัติข้อมูลสำรองล่าสุดในเบราว์เซอร์');
      return;
    }
    const timeStr = new Date(backup.savedAt).toLocaleString('th-TH');
    if (window.confirm(`พบข้อมูลสำรอง (${timeStr}) จำนวน ${backup.groups.length} กลุ่ม ต้องการกู้คืนหรือไม่?`)) {
      await saveGroups(backup.groups, `กู้คืนข้อมูลสำรองในเบราว์เซอร์สำเร็จ (${backup.groups.length} กลุ่ม)`);
    }
  };

  // Sync with incoming props
  useEffect(() => {
    setLocalGroups(adsGroups);
  }, [adsGroups]);

  // Extract all unique ads from leads
  const uniqueAdsList = useMemo(() => {
    const map = new Map<string, { name: string; leadCount: number; salesAmount: number; wonCount: number }>();
    leads.forEach((l) => {
      const name = l.extractedAds || 'ไม่ระบุ Ads';
      if (!map.has(name)) {
        map.set(name, { name, leadCount: 0, salesAmount: 0, wonCount: 0 });
      }
      const item = map.get(name)!;
      item.leadCount += 1;
      item.salesAmount += l.totalSales;
      if (l.hasSales) item.wonCount += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.salesAmount - a.salesAmount);
  }, [leads]);

  // Find which group an ad belongs to
  const getAdCurrentGroup = (adName: string): AdsGroup | undefined => {
    return localGroups.find((g) => g.assignedAds && g.assignedAds.includes(adName));
  };

  // Group stats calculation
  const groupStats = useMemo(() => {
    return localGroups.map((grp) => {
      const assigned = new Set(grp.assignedAds || []);
      const matchedLeads = leads.filter((l) => assigned.has(l.extractedAds));
      const totalSales = matchedLeads.reduce((sum, l) => sum + l.totalSales, 0);
      const wonLeads = matchedLeads.filter((l) => l.hasSales).length;
      return {
        ...grp,
        leadsCount: matchedLeads.length,
        wonCount: wonLeads,
        totalSales,
      };
    });
  }, [localGroups, leads]);

  // Core save helper (saves state and syncs online)
  const saveGroups = async (updatedGroups: AdsGroup[], message: string = 'บันทึกและซิงค์กลุ่ม Ads สำเร็จแล้ว') => {
    setLocalGroups(updatedGroups);
    try {
      await onSaveAdsGroups(updatedGroups);
      setSaveSuccessMessage(message);
      setTimeout(() => setSaveSuccessMessage(null), 3500);
    } catch (err) {
      console.error('Save groups error:', err);
    }
  };

  // Manual save trigger
  const handleManualSave = async () => {
    await saveGroups(localGroups, 'บันทึกและซิงค์กลุ่ม Ads ขึ้นเซิร์ฟเวอร์เรียบร้อยแล้ว');
  };

  // 1. ADD GROUP (Top Button)
  const handleTopAddGroup = async () => {
    if (!newGroupName.trim()) return;
    const keywords = newGroupKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const newGroup: AdsGroup = {
      id: `grp-${Date.now()}`,
      name: newGroupName.trim(),
      color: newGroupColor,
      assignedAds: [],
      keywords,
    };

    const updated = [...localGroups, newGroup];
    await saveGroups(updated, `สร้างกลุ่ม "${newGroup.name}" เรียบร้อยแล้ว`);
    setNewGroupName('');
    setNewGroupKeywords('');
    setShowTopAddModal(false);
  };

  // 2. DELETE GROUP
  const executeDeleteGroup = async () => {
    if (!groupToDelete) return;
    setIsDeleting(true);
    const updated = localGroups.filter((g) => g.id !== groupToDelete.id);
    await saveGroups(updated, `ลบกลุ่ม "${groupToDelete.name}" เรียบร้อยแล้ว`);
    setIsDeleting(false);
    setGroupToDelete(null);
  };

  // 3. EDIT GROUP
  const handleOpenEdit = (group: AdsGroup) => {
    setEditingGroup(group);
    setEditName(group.name);
    setEditColor(group.color || PRESET_COLORS[0]);
    setEditKeywords((group.keywords || []).join(', '));
    setEditSearchAd('');
  };

  const handleSaveEdit = async () => {
    if (!editingGroup || !editName.trim()) return;
    const keywords = editKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const updated = localGroups.map((g) => {
      if (g.id === editingGroup.id) {
        return {
          ...g,
          name: editName.trim(),
          color: editColor,
          keywords,
          assignedAds: editingGroup.assignedAds || [],
        };
      }
      return g;
    });

    await saveGroups(updated, `แก้ไขข้อมูลกลุ่ม "${editName.trim()}" เรียบร้อยแล้ว`);
    setEditingGroup(null);
  };

  const handleRemoveAdFromEditingGroup = (adName: string) => {
    if (!editingGroup) return;
    const updatedAssigned = (editingGroup.assignedAds || []).filter((a) => a !== adName);
    setEditingGroup({ ...editingGroup, assignedAds: updatedAssigned });
    const updated = localGroups.map((g) => {
      if (g.id === editingGroup.id) {
        return { ...g, assignedAds: updatedAssigned };
      }
      return g;
    });
    setLocalGroups(updated);
  };

  const handleClearAllAdsInEditingGroup = () => {
    if (!editingGroup) return;
    setEditingGroup({ ...editingGroup, assignedAds: [] });
    const updated = localGroups.map((g) => {
      if (g.id === editingGroup.id) {
        return { ...g, assignedAds: [] };
      }
      return g;
    });
    setLocalGroups(updated);
  };

  // 4. QUICK CREATE & ASSIGN (Directly from row or bulk action)
  const handleOpenQuickCreate = (ads: string[]) => {
    if (!ads || ads.length === 0) return;
    setQuickCreateAds(ads);
    setQuickGroupName(ads.length === 1 ? ads[0] : '');
    // Choose next distinct color
    const usedColors = new Set(localGroups.map((g) => g.color));
    const nextColor = PRESET_COLORS.find((c) => !usedColors.has(c)) || PRESET_COLORS[localGroups.length % PRESET_COLORS.length];
    setQuickGroupColor(nextColor);
    setQuickGroupKeywords('');
  };

  const handleExecuteQuickCreate = async () => {
    if (!quickCreateAds || quickCreateAds.length === 0 || !quickGroupName.trim()) return;

    const keywords = quickGroupKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const newGroupId = `grp-${Date.now()}`;
    const newGroup: AdsGroup = {
      id: newGroupId,
      name: quickGroupName.trim(),
      color: quickGroupColor,
      assignedAds: [...quickCreateAds],
      keywords,
    };

    // Remove these ads from any previously assigned groups
    const updated = localGroups.map((grp) => ({
      ...grp,
      assignedAds: (grp.assignedAds || []).filter((a) => !quickCreateAds.includes(a)),
    }));

    // Append new group
    updated.push(newGroup);

    await saveGroups(
      updated,
      `สร้างกลุ่มใหม่ "${newGroup.name}" และย้าย ${quickCreateAds.length} รายการเข้ากลุ่มทันทีเรียบร้อย!`
    );

    // Clean up modal state
    setQuickCreateAds(null);
    setQuickGroupName('');
    setQuickGroupKeywords('');
    setSelectedAds((prev) => prev.filter((a) => !quickCreateAds.includes(a)));
  };

  // 5. ASSIGN AD TO EXISTING GROUP
  const handleAssignAd = async (adName: string, targetGroupId: string) => {
    if (targetGroupId === '__NEW_GROUP__') {
      handleOpenQuickCreate([adName]);
      return;
    }

    const updated = localGroups.map((grp) => {
      // Remove from old group
      const cleanedAds = (grp.assignedAds || []).filter((name) => name !== adName);
      // Add to target group
      if (grp.id === targetGroupId) {
        return { ...grp, assignedAds: [...cleanedAds, adName] };
      }
      return { ...grp, assignedAds: cleanedAds };
    });

    const targetGroup = localGroups.find((g) => g.id === targetGroupId);
    const msg = targetGroup
      ? `ย้าย Ads "${adName}" เข้ากลุ่ม "${targetGroup.name}" แล้ว`
      : `นำ Ads "${adName}" ออกจากกลุ่มแล้ว`;

    await saveGroups(updated, msg);
  };

  // 6. BULK ASSIGN TO EXISTING GROUP
  const handleBulkAssign = async (targetGroupId: string) => {
    if (selectedAds.length === 0) return;
    if (targetGroupId === '__NEW_GROUP__') {
      handleOpenQuickCreate(selectedAds);
      return;
    }

    const updated = localGroups.map((grp) => {
      const cleanedAds = (grp.assignedAds || []).filter((name) => !selectedAds.includes(name));
      if (grp.id === targetGroupId) {
        return { ...grp, assignedAds: [...cleanedAds, ...selectedAds] };
      }
      return { ...grp, assignedAds: cleanedAds };
    });

    const targetGroup = localGroups.find((g) => g.id === targetGroupId);
    const msg = targetGroup
      ? `ย้าย Ads ${selectedAds.length} รายการเข้ากลุ่ม "${targetGroup.name}" แล้ว`
      : `นำ Ads ${selectedAds.length} รายการออกจากกลุ่มแล้ว`;

    await saveGroups(updated, msg);
    setSelectedAds([]);
  };

  // 7. AUTO-CLASSIFY KEYWORDS
  const handleAutoClassify = async () => {
    let assignedCount = 0;
    const nextGroups = localGroups.map((g) => ({ ...g, assignedAds: [...(g.assignedAds || [])] }));

    uniqueAdsList.forEach((ad) => {
      const lower = ad.name.toLowerCase();
      for (const grp of nextGroups) {
        if (grp.keywords && grp.keywords.length > 0) {
          const matches = grp.keywords.some((kw) => kw && lower.includes(kw.toLowerCase()));
          if (matches && !grp.assignedAds.includes(ad.name)) {
            // Remove from any groups first
            nextGroups.forEach((g) => {
              g.assignedAds = g.assignedAds.filter((n) => n !== ad.name);
            });
            grp.assignedAds.push(ad.name);
            assignedCount += 1;
            break;
          }
        }
      }
    });

    await saveGroups(nextGroups, `จัดกลุ่ม Ads อัตโนมัติด้วยคีย์เวิร์ดสำเร็จ (${assignedCount} รายการได้รับการจำแนก)`);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Filtered ads list for table
  const filteredAdsList = useMemo(() => {
    return uniqueAdsList.filter((a) => {
      // 1. Search text
      if (searchAds.trim() && !a.name.toLowerCase().includes(searchAds.toLowerCase())) {
        return false;
      }
      // 2. Group Filter
      if (filterGroupOption === 'unassigned') {
        const curGrp = getAdCurrentGroup(a.name);
        if (curGrp) return false;
      } else if (filterGroupOption !== 'all') {
        const curGrp = getAdCurrentGroup(a.name);
        if (!curGrp || curGrp.id !== filterGroupOption) return false;
      }
      return true;
    });
  }, [uniqueAdsList, searchAds, filterGroupOption, localGroups]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            ระบบจัดการกลุ่มข้อมูล Ads (Ads Grouping Management)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            จัดกลุ่ม Ads ย่อยจาก Col Y เพื่อวิเคราะห์ยอดขายและ ROI — สามารถ <strong>เพิ่ม ลบ แก้ไข</strong> และ <strong>สร้างกลุ่มใหม่ได้ทันทีจากตารางด้านล่าง</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden File Input for JSON import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFileChange}
            className="hidden"
          />

          <button
            id="btn-export-ads-backup"
            type="button"
            onClick={handleExportBackup}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            title="ดาวน์โหลดไฟล์สำรองกลุ่ม Ads เป็น JSON"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>สำรองข้อมูล JSON</span>
          </button>

          <button
            id="btn-import-ads-backup"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            title="นำเข้ากลุ่ม Ads จากไฟล์ JSON"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span>กู้คืนจากไฟล์</span>
          </button>

          <button
            id="btn-restore-ads-backup"
            type="button"
            onClick={handleRestoreBackup}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            title="กู้คืนกลุ่ม Ads จากประวัติสำรองในเครื่องเบราว์เซอร์"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>กู้คืนประวัติสำรอง</span>
          </button>

          <button
            id="btn-auto-classify"
            type="button"
            onClick={handleAutoClassify}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
            title="จัดกลุ่ม Ads อัตโนมัติด้วยคำค้นหาที่ระบุในแต่ละกลุ่ม"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>จัดกลุ่มอัตโนมัติด้วยคีย์เวิร์ด</span>
          </button>

          <button
            id="btn-add-ads-group"
            type="button"
            onClick={() => setShowTopAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>สร้างกลุ่มใหม่</span>
          </button>

          <button
            id="btn-save-ads-groups"
            type="button"
            onClick={handleManualSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกและซิงค์ Online'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {saveSuccessMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center justify-between gap-2 shadow-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-normal">ซิงค์กับเซิร์ฟเวอร์แล้ว</span>
        </div>
      )}

      {/* Current Ads Groups Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <FolderKanban className="w-4 h-4 text-slate-700" />
            กลุ่ม Ads ปัจจุบัน ({localGroups.length} กลุ่ม)
          </h4>
          <span className="text-xs text-slate-500">
            คลิกที่ไอคอน <strong>ดินสอ (แก้ไข)</strong> หรือ <strong>ถังขยะ (ลบ)</strong> เพื่อจัดการกลุ่ม
          </span>
        </div>

        {localGroups.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center">
            <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">ยังไม่มีกลุ่ม Ads ในระบบ</p>
            <p className="text-xs text-slate-500 mt-1">
              คลิกปุ่ม "สร้างกลุ่มใหม่" หรือเลือกเปลี่ยนกลุ่มจากตารางด้านล่างเพื่อสร้างกลุ่มทันที
            </p>
            <button
              onClick={() => setShowTopAddModal(true)}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              สร้างกลุ่มแรก
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupStats.map((group) => {
              return (
                <div
                  key={group.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <div>
                    {/* Card Header: Group Color, Name, Edit and Delete Buttons */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: group.color }}
                        />
                        <h4 className="font-bold text-slate-900 text-sm truncate" title={group.name}>
                          {group.name}
                        </h4>
                      </div>

                      {/* Action Buttons: Edit & Delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          id={`btn-edit-group-${group.id}`}
                          type="button"
                          onClick={() => handleOpenEdit(group)}
                          className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors p-1.5 cursor-pointer"
                          title="แก้ไขกลุ่มนี้ (ชื่อ, สี, คีย์เวิร์ด, หรือจัดการ Ads ภายใน)"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-delete-group-${group.id}`}
                          type="button"
                          onClick={() => setGroupToDelete(group)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors p-1.5 cursor-pointer"
                          title="ลบกลุ่มนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Keywords Tag Cloud */}
                    {group.keywords && group.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 my-2">
                        {group.keywords.map((kw, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]"
                          >
                            #{kw}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Summary Metrics */}
                    <div className="mt-3 grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-lg text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Ads ในกลุ่ม</span>
                        <span className="font-bold text-slate-800">
                          {(group.assignedAds || []).length} รายการ
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Leads</span>
                        <span className="font-bold text-blue-600">{group.leadsCount} ราย</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">ยอดขายจริง</span>
                        <span className="font-bold text-emerald-700 font-mono text-[11px]">
                          {formatCurrency(group.totalSales)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sample Ads Badge Preview */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex flex-wrap gap-1 max-w-[80%] overflow-hidden">
                      {(group.assignedAds || []).slice(0, 2).map((ad, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] truncate max-w-[120px]"
                          title={ad}
                        >
                          {ad}
                        </span>
                      ))}
                      {(group.assignedAds || []).length > 2 && (
                        <span className="text-[10px] text-slate-400 self-center">
                          +อีก {(group.assignedAds || []).length - 2}
                        </span>
                      )}
                      {(group.assignedAds || []).length === 0 && (
                        <span className="text-[10px] text-slate-400 italic">ยังไม่มี Ads ในกลุ่ม</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(group)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline shrink-0"
                    >
                      จัดการ
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ads Items Table with Assignment & Instant Creation Controls */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/70">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>รายการ Ads ทั้งหมดในระบบ ({uniqueAdsList.length} รายการ)</span>
              <span className="text-xs font-normal text-slate-500">
                (แสดง {filteredAdsList.length} รายการที่ตรงเงื่อนไข)
              </span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              💡 <strong>สร้างกลุ่มได้ทันที:</strong> สามารถเลือก <span className="text-blue-600 font-semibold">"➕ สร้างกลุ่มใหม่และย้ายทันที"</span> ในช่องเปลี่ยนกลุ่ม หรือกดปุ่ม <strong>+</strong> ด้านขวาของแต่ละแถวได้ทันที
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Group */}
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterGroupOption}
                onChange={(e) => setFilterGroupOption(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="all">แสดง Ads ทุกกลุ่ม</option>
                <option value="unassigned">⚠️ เฉพาะที่ยังไม่จัดกลุ่ม</option>
                {localGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    กลุ่ม: {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Ads */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ Ads..."
                value={searchAds}
                onChange={(e) => setSearchAds(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 w-44 sm:w-56"
              />
            </div>

            {/* Bulk Action Controls */}
            {selectedAds.length > 0 && (
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg">
                <span className="text-xs font-bold text-blue-700">
                  เลือก {selectedAds.length} รายการ:
                </span>
                <select
                  onChange={(e) => handleBulkAssign(e.target.value)}
                  defaultValue=""
                  className="text-xs bg-white border border-blue-300 rounded-md px-2 py-1 text-slate-700 font-medium"
                >
                  <option value="" disabled>
                    ย้ายไปกลุ่ม...
                  </option>
                  <option value="__NEW_GROUP__" className="font-bold text-blue-600">
                    ➕ + สร้างกลุ่มใหม่และย้ายทันที ({selectedAds.length} รายการ)...
                  </option>
                  <option value="">-- ไม่ระบุกลุ่ม (ลบออกจากกลุ่ม) --</option>
                  <optgroup label="กลุ่ม Ads ที่มีอยู่">
                    {localGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </optgroup>
                </select>

                <button
                  type="button"
                  onClick={() => handleOpenQuickCreate(selectedAds)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                  title="สร้างกลุ่ม Ads ใหม่และย้ายรายการที่เลือกทั้งหมดเข้ากลุ่มทันที"
                >
                  <Plus className="w-3 h-3" />
                  <span>สร้างกลุ่มใหม่ทันที</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredAdsList.length > 0 &&
                      selectedAds.length === filteredAdsList.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAds(filteredAdsList.map((a) => a.name));
                      } else {
                        setSelectedAds([]);
                      }
                    }}
                    className="rounded border-slate-300 text-blue-600 cursor-pointer"
                  />
                </th>
                <th className="p-3">ชื่อ Ads (สกัดจาก Col Y)</th>
                <th className="p-3">กลุ่ม Ads ปัจจุบัน</th>
                <th className="p-3 text-right">จำนวน Leads</th>
                <th className="p-3 text-right">ปิดการขายได้</th>
                <th className="p-3 text-right">ยอดขายจริง (Status N)</th>
                <th className="p-3 min-w-[240px]">เปลี่ยนกลุ่ม / สร้างกลุ่มใหม่ทันที</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredAdsList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    ไม่พบรายการ Ads ที่ตรงตามเงื่อนไข
                  </td>
                </tr>
              ) : (
                filteredAdsList.map((adItem) => {
                  const currentGrp = getAdCurrentGroup(adItem.name);
                  const isChecked = selectedAds.includes(adItem.name);

                  return (
                    <tr
                      key={adItem.name}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isChecked ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAds([...selectedAds, adItem.name]);
                            } else {
                              setSelectedAds(selectedAds.filter((n) => n !== adItem.name));
                            }
                          }}
                          className="rounded border-slate-300 text-blue-600 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-semibold text-slate-900 max-w-sm truncate" title={adItem.name}>
                        {adItem.name}
                      </td>
                      <td className="p-3">
                        {currentGrp ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                            style={{
                              backgroundColor: `${currentGrp.color}15`,
                              color: currentGrp.color,
                            }}
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: currentGrp.color }}
                            />
                            <span className="truncate max-w-[130px]">{currentGrp.name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px] px-2 py-0.5 bg-slate-100 rounded-md">
                            ยังไม่จัดกลุ่ม
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right font-medium">{adItem.leadCount}</td>
                      <td className="p-3 text-right font-semibold text-emerald-700">
                        {adItem.wonCount}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-blue-700">
                        {formatCurrency(adItem.salesAmount)}
                      </td>
                      <td className="p-3">
                        {/* Inline Group Selector with Quick-Create Option + Direct '+' Button */}
                        <div className="flex items-center gap-1.5">
                          <select
                            value={currentGrp?.id || ''}
                            onChange={(e) => handleAssignAd(adItem.name, e.target.value)}
                            className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-[180px]"
                          >
                            <option value="">-- ไม่ระบุกลุ่ม --</option>
                            <option value="__NEW_GROUP__" className="font-bold text-blue-600 bg-blue-50">
                              ➕ + สร้างกลุ่มใหม่ทันที...
                            </option>
                            <optgroup label="กลุ่ม Ads ที่มีอยู่">
                              {localGroups.map((g) => (
                                <option key={g.id} value={g.id}>
                                  {g.name}
                                </option>
                              ))}
                            </optgroup>
                          </select>

                          {/* Instant Create & Assign Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenQuickCreate([adItem.name])}
                            className="p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 rounded-lg transition-all cursor-pointer shrink-0 shadow-2xs"
                            title="คลิกเพื่อสร้างกลุ่มใหม่ และย้าย Ads นี้เข้ากลุ่มทันที"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Quick Create & Move Ads (Triggered directly from table row or bulk bar) */}
      {quickCreateAds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    {quickCreateAds.length === 1
                      ? 'สร้างกลุ่ม Ads ใหม่ และย้ายเข้าทันที'
                      : `สร้างกลุ่ม Ads ใหม่ สำหรับ ${quickCreateAds.length} รายการ`}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {quickCreateAds.length === 1
                      ? `สร้างกลุ่มแล้วจัด "${quickCreateAds[0]}" เข้ากลุ่มนี้ทันที`
                      : `สร้างกลุ่มแล้วจัด Ads ทั้งหมด ${quickCreateAds.length} รายการเข้ากลุ่มนี้ทันที`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickCreateAds(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs mt-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อกลุ่ม Ads ใหม่ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="เช่น ม่านลอน, ม่านไฟฟ้า, สมาร์ทโฮม"
                  value={quickGroupName}
                  onChange={(e) => setQuickGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && quickGroupName.trim()) {
                      handleExecuteQuickCreate();
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เลือกสีประจำกลุ่ม
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setQuickGroupColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                        quickGroupColor === c ? 'ring-2 ring-offset-2 ring-slate-900 scale-115' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  คำค้นหาอัตโนมัติ (Keywords) - ไม่บังคับ
                </label>
                <input
                  type="text"
                  placeholder="คั่นด้วยเครื่องหมายจุลภาค เช่น ไฟฟ้า, somfy, smart"
                  value={quickGroupKeywords}
                  onChange={(e) => setQuickGroupKeywords(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  หากระบุคำค้นหา ระบบจะใช้ตรวจจับชื่อ Ads ในอนาคตเพื่อจัดเข้ากลุ่มนี้ให้อัตโนมัติ
                </p>
              </div>

              {/* Preview ads being added */}
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Ads ที่จะถูกเพิ่มเข้ากลุ่มนี้ ({quickCreateAds.length} รายการ):
                </span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {quickCreateAds.slice(0, 5).map((ad, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-blue-100/70 text-blue-800 text-[10px] truncate max-w-[200px]"
                    >
                      {ad}
                    </span>
                  ))}
                  {quickCreateAds.length > 5 && (
                    <span className="text-[10px] text-slate-500 self-center">
                      +อีก {quickCreateAds.length - 5} รายการ
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setQuickCreateAds(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 cursor-pointer font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleExecuteQuickCreate}
                disabled={!quickGroupName.trim()}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>สร้างกลุ่มและย้ายทันที</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Top Add New Group Modal */}
      {showTopAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-600" />
                สร้างกลุ่ม Ads ใหม่
              </h4>
              <button
                type="button"
                onClick={() => setShowTopAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อกลุ่ม Ads <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="เช่น ม่านมอเตอร์ & สมาร์ทโฮม"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newGroupName.trim()) {
                      handleTopAddGroup();
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เลือกสีประจำกลุ่ม
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewGroupColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                        newGroupColor === c ? 'ring-2 ring-offset-2 ring-slate-900 scale-115' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  คำค้นหาอัตโนมัติ (Keywords) คั่นด้วยจุลภาค
                </label>
                <input
                  type="text"
                  placeholder="เช่น มอเตอร์, smart, ไฟฟ้า, somfy"
                  value={newGroupKeywords}
                  onChange={(e) => setNewGroupKeywords(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  ระบบจะใช้ตรวจจับชื่อ Ads ที่มีคำเหล่านี้เพื่อจัดเข้ากลุ่มนี้ให้อัตโนมัติเมื่อกด "จัดกลุ่มอัตโนมัติ"
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowTopAddModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 cursor-pointer font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleTopAddGroup}
                disabled={!newGroupName.trim()}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
              >
                สร้างกลุ่ม
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Group Modal (Name, Color, Keywords, and Manage Group Ads) */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: editColor }}
                >
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    แก้ไขกลุ่ม Ads: {editingGroup.name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    แก้ไขชื่อกลุ่ม สี คีย์เวิร์ด และจัดการรายการ Ads ที่อยู่ในกลุ่มนี้
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingGroup(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs py-4 overflow-y-auto flex-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อกลุ่ม Ads <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เลือกสีประจำกลุ่ม
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                        editColor === c ? 'ring-2 ring-offset-2 ring-slate-900 scale-115' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  คำค้นหาอัตโนมัติ (Keywords) คั่นด้วยจุลภาค
                </label>
                <input
                  type="text"
                  placeholder="เช่น มอเตอร์, smart, ไฟฟ้า"
                  value={editKeywords}
                  onChange={(e) => setEditKeywords(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Ads inside this group */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold text-slate-700 block">
                    รายการ Ads ในกลุ่มนี้ ({editingGroup.assignedAds?.length || 0} รายการ)
                  </label>
                  {(editingGroup.assignedAds?.length || 0) > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllAdsInEditingGroup}
                      className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer underline"
                    >
                      ล้าง Ads ทั้งหมดออกจากกลุ่มนี้
                    </button>
                  )}
                </div>

                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ค้นหา Ads ในกลุ่มนี้..."
                    value={editSearchAd}
                    onChange={(e) => setEditSearchAd(e.target.value)}
                    className="pl-8 pr-3 py-1.5 w-full text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="border border-slate-200 rounded-xl p-2 max-h-48 overflow-y-auto space-y-1 bg-slate-50/50">
                  {(!editingGroup.assignedAds || editingGroup.assignedAds.length === 0) ? (
                    <p className="text-center py-4 text-slate-400 text-xs">
                      ยังไม่มี Ads ในกลุ่มนี้ (สามารถเพิ่มได้จากตาราง Ads ด้านล่าง)
                    </p>
                  ) : (
                    (editingGroup.assignedAds || [])
                      .filter((a) => !editSearchAd || a.toLowerCase().includes(editSearchAd.toLowerCase()))
                      .map((adName) => (
                        <div
                          key={adName}
                          className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 text-xs hover:border-slate-300 transition-colors"
                        >
                          <span className="font-medium text-slate-800 truncate max-w-[80%]" title={adName}>
                            {adName}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAdFromEditingGroup(adName)}
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded transition-colors cursor-pointer"
                            title="นำ Ads นี้ออกจากกลุ่ม"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setEditingGroup(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 cursor-pointer font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={!editName.trim()}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>บันทึกการแก้ไข</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Delete Group Confirmation Modal */}
      {groupToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              ยืนยันการลบกลุ่ม Ads
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              คุณต้องการลบกลุ่ม <span className="font-bold text-slate-900">"{groupToDelete.name}"</span> ใช่หรือไม่?
              <br />
              <span className="text-slate-500 mt-1 block">
                (Ads ทั้ง {(groupToDelete.assignedAds || []).length} รายการในกลุ่มนี้ จะถูกย้ายไปอยู่หมวด "ยังไม่จัดกลุ่ม" ทันที โดยไม่กระทบต่อข้อมูลดิบ)
              </span>
            </p>
            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setGroupToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                id="btn-confirm-delete-group"
                type="button"
                disabled={isDeleting}
                onClick={executeDeleteGroup}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 cursor-pointer shadow-xs disabled:opacity-50 transition-colors"
              >
                {isDeleting ? 'กำลังลบและบันทึก...' : 'ยืนยันลบกลุ่มนี้'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
