import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  RotateCcw,
  Calendar,
  ChevronDown,
  Building2,
  MapPin,
  UserCheck,
  Target,
  Sparkles,
  Layers,
  X,
  Check,
  Briefcase,
} from 'lucide-react';
import { FilterState, JoinedLead, AdsGroup } from '../types';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  leads: JoinedLead[];
  adsGroups: AdsGroup[];
  totalFilteredCount: number;
}

export interface OptionItem {
  label: string;
  value?: string;
  count?: number;
}

export const MONTH_DEFINITIONS = [
  { num: '01', name: 'ม.ค. (01)' },
  { num: '02', name: 'ก.พ. (02)' },
  { num: '03', name: 'มี.ค. (03)' },
  { num: '04', name: 'เม.ย. (04)' },
  { num: '05', name: 'พ.ค. (05)' },
  { num: '06', name: 'มิ.ย. (06)' },
  { num: '07', name: 'ก.ค. (07)' },
  { num: '08', name: 'ส.ค. (08)' },
  { num: '09', name: 'ก.ย. (09)' },
  { num: '10', name: 'ต.ค. (10)' },
  { num: '11', name: 'พ.ย. (11)' },
  { num: '12', name: 'ธ.ค. (12)' },
];

// Reusable Multi-Select Popover Component
interface MultiSelectDropdownProps {
  label: string;
  icon: React.ReactNode;
  options: OptionItem[];
  selectedValues: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
  dropdownWidth?: string;
  compactButton?: boolean;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  icon,
  options,
  selectedValues,
  onChange,
  placeholder = 'ทั้งหมด',
  dropdownWidth = 'w-64',
  compactButton = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getOptVal = (opt: OptionItem) => (opt.value !== undefined ? opt.value : opt.label);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const selectAll = () => {
    onChange(options.map(getOptVal));
  };

  const clearAll = () => {
    onChange([]);
  };

  const getDisplayLabel = (val: string) => {
    const found = options.find((o) => getOptVal(o) === val);
    return found ? found.label : val;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {!compactButton && (
        <label className="block font-semibold text-slate-600 mb-1 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1">
            {icon} {label}
          </span>
          {selectedValues.length > 0 && (
            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-200">
              เลือก {selectedValues.length}
            </span>
          )}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`bg-slate-50 border text-left rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
          compactButton ? 'px-2.5 py-2 font-medium min-w-[110px]' : 'w-full p-2'
        } ${
          selectedValues.length > 0
            ? 'border-blue-400 bg-blue-50/50 text-blue-900 font-semibold'
            : 'border-slate-300 text-slate-700 hover:bg-slate-100/60'
        }`}
      >
        <span className="truncate flex items-center gap-1.5 mr-1">
          {compactButton && icon}
          {selectedValues.length === 0
            ? `${placeholder} ${compactButton ? '' : `(${options.length})`}`
            : selectedValues.length === 1
            ? getDisplayLabel(selectedValues[0])
            : `${getDisplayLabel(selectedValues[0])} +อีก ${selectedValues.length - 1}`}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute z-40 mt-1 ${dropdownWidth} bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 text-xs animate-in fade-in zoom-in-95 duration-100`}
        >
          {options.length > 5 && (
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`ค้นหา${label}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 text-[11px]">
            <button
              type="button"
              onClick={selectAll}
              className="text-blue-600 hover:underline cursor-pointer font-medium"
            >
              เลือกทั้งหมด ({options.length})
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-slate-400 hover:text-rose-600 hover:underline cursor-pointer"
            >
              ล้างค่า
            </button>
          </div>

          <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const val = getOptVal(opt);
                const isSelected = selectedValues.includes(val);
                return (
                  <div
                    key={val}
                    onClick={() => toggleOption(val)}
                    className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors select-none ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {opt.count !== undefined && (
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                        {opt.count}
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center text-slate-400 text-xs">ไม่พบตัวเลือก</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  leads,
  adsGroups,
  totalFilteredCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search);

  // Sync external filter search changes if reset
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  // Debounce search input to make typing instantaneous and prevent app lag
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        onFilterChange({ ...filters, search: localSearch });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [localSearch, filters, onFilterChange]);

  // Extract unique filter options with counts from loaded leads (Optimized: single-pass with useMemo)
  const {
    yearOptions,
    monthOptions,
    statusOptions,
    branchOptions,
    provinceOptions,
    staffOptions,
    sourceOptions,
    jobTypeOptions,
    adsGroupOptions,
  } = useMemo(() => {
    const uniqueYears = Array.from(
      new Set(leads.map((l) => String(l.createdYear)).filter((y) => y && y !== '0' && y !== 'NaN'))
    )
      .sort()
      .reverse();

    const yearCounts = new Map<string, number>();
    const monthCounts = new Map<string, number>();
    const statusCounts = new Map<string, number>();
    const branchCounts = new Map<string, number>();
    const provinceCounts = new Map<string, number>();
    const staffCounts = new Map<string, number>();
    const sourceCounts = new Map<string, number>();
    const jobTypeCounts = new Map<string, number>();
    const adsGroupCounts = new Map<string, number>();

    leads.forEach((l) => {
      const yr = String(l.createdYear || '');
      if (yr) yearCounts.set(yr, (yearCounts.get(yr) || 0) + 1);

      if (l.createdMonth) monthCounts.set(l.createdMonth, (monthCounts.get(l.createdMonth) || 0) + 1);
      if (l.status) statusCounts.set(l.status, (statusCounts.get(l.status) || 0) + 1);
      if (l.branch) branchCounts.set(l.branch, (branchCounts.get(l.branch) || 0) + 1);
      if (l.province) provinceCounts.set(l.province, (provinceCounts.get(l.province) || 0) + 1);
      if (l.staff) staffCounts.set(l.staff, (staffCounts.get(l.staff) || 0) + 1);
      if (l.source) sourceCounts.set(l.source, (sourceCounts.get(l.source) || 0) + 1);
      if (l.jobType) jobTypeCounts.set(l.jobType, (jobTypeCounts.get(l.jobType) || 0) + 1);
      if (l.adsGroup) adsGroupCounts.set(l.adsGroup, (adsGroupCounts.get(l.adsGroup) || 0) + 1);
    });

    const yOptions: OptionItem[] = uniqueYears.map((yr) => ({
      label: `ปี ${yr}`,
      value: yr,
      count: yearCounts.get(yr) || 0,
    }));

    const mOptions: OptionItem[] = MONTH_DEFINITIONS.map((m) => ({
      label: m.name,
      value: m.num,
      count: monthCounts.get(m.num) || 0,
    }));

    const mapToSortedOptions = (counts: Map<string, number>): OptionItem[] => {
      return Array.from(counts.entries())
        .map(([label, count]) => ({ label, value: label, count }))
        .sort((a, b) => b.count - a.count);
    };

    return {
      yearOptions: yOptions,
      monthOptions: mOptions,
      statusOptions: mapToSortedOptions(statusCounts),
      branchOptions: mapToSortedOptions(branchCounts),
      provinceOptions: mapToSortedOptions(provinceCounts),
      staffOptions: mapToSortedOptions(staffCounts),
      sourceOptions: mapToSortedOptions(sourceCounts),
      jobTypeOptions: mapToSortedOptions(jobTypeCounts),
      adsGroupOptions: mapToSortedOptions(adsGroupCounts),
    };
  }, [leads]);

  const handleReset = () => {
    setLocalSearch('');
    onFilterChange({
      search: '',
      years: [],
      months: [],
      dateStart: '',
      dateEnd: '',
      statuses: [],
      branches: [],
      provinces: [],
      staffs: [],
      sources: [],
      jobTypes: [],
      adsGroups: [],
      adsList: [],
      salesFilter: 'all',
    });
  };

  const activeFiltersCount =
    (filters.search ? 1 : 0) +
    filters.years.length +
    filters.months.length +
    (filters.salesFilter !== 'all' ? 1 : 0) +
    filters.statuses.length +
    filters.branches.length +
    filters.provinces.length +
    filters.staffs.length +
    filters.sources.length +
    filters.jobTypes.length +
    filters.adsGroups.length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-4 mb-6">
      {/* Primary Bar: Search, Sales Toggle, Multi-Select Month/Year, Filter Expand Button */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search input with instant local typing */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-leads"
            type="text"
            placeholder="ค้นหารหัส Lead, ชื่อลูกค้า, เบอร์โทร, Ads, พนักงาน, สาขา..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onFilterChange({ ...filters, search: localSearch });
              }
            }}
            className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch('');
                onFilterChange({ ...filters, search: '' });
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Quick Sales Status Filter */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 self-start lg:self-auto text-xs font-semibold">
          <button
            id="filter-sales-all"
            type="button"
            onClick={() => onFilterChange({ ...filters, salesFilter: 'all' })}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              filters.salesFilter === 'all'
                ? 'bg-white text-slate-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ทั้งหมด ({leads.length.toLocaleString()})
          </button>
          <button
            id="filter-sales-only"
            type="button"
            onClick={() => onFilterChange({ ...filters, salesFilter: 'with_sales' })}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              filters.salesFilter === 'with_sales'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            มียอดขาย ({leads.filter((l) => l.hasSales).length.toLocaleString()})
          </button>
          <button
            id="filter-sales-none"
            type="button"
            onClick={() => onFilterChange({ ...filters, salesFilter: 'no_sales' })}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              filters.salesFilter === 'no_sales'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ยังไม่มียอดขาย ({leads.filter((l) => !l.hasSales).length.toLocaleString()})
          </button>
        </div>

        {/* Multi-Select Year & Month Quick Selectors */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Multi-Select Year */}
          <MultiSelectDropdown
            label="ปี"
            icon={<Calendar className="w-3.5 h-3.5 text-blue-600" />}
            options={yearOptions}
            selectedValues={filters.years}
            onChange={(vals) => onFilterChange({ ...filters, years: vals })}
            placeholder="ปีทั้งหมด"
            compactButton={true}
            dropdownWidth="w-48"
          />

          {/* Multi-Select Month */}
          <MultiSelectDropdown
            label="เดือน"
            icon={<Calendar className="w-3.5 h-3.5 text-indigo-600" />}
            options={monthOptions}
            selectedValues={filters.months}
            onChange={(vals) => onFilterChange({ ...filters, months: vals })}
            placeholder="เดือนทั้งหมด"
            compactButton={true}
            dropdownWidth="w-56"
          />

          {/* Toggle More Filters Button */}
          <button
            id="btn-toggle-filters"
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer shrink-0 ${
              isExpanded || activeFiltersCount > 0
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>ตัวกรองมิติอื่น</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Reset Filters */}
          {activeFiltersCount > 0 && (
            <button
              id="btn-reset-filters"
              type="button"
              onClick={handleReset}
              title="ล้างตัวกรองทั้งหมด"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Multi-dimension Filters with Multi-select */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Status (Multi-select) */}
          <MultiSelectDropdown
            label="สถานะ Lead"
            icon={<Sparkles className="w-3.5 h-3.5 text-amber-500" />}
            options={statusOptions}
            selectedValues={filters.statuses}
            onChange={(vals) => onFilterChange({ ...filters, statuses: vals })}
            placeholder="ทุกสถานะ"
          />

          {/* Branch (Multi-select) */}
          <MultiSelectDropdown
            label="สาขา"
            icon={<Building2 className="w-3.5 h-3.5 text-blue-500" />}
            options={branchOptions}
            selectedValues={filters.branches}
            onChange={(vals) => onFilterChange({ ...filters, branches: vals })}
            placeholder="ทุกสาขา"
          />

          {/* Province (Multi-select) */}
          <MultiSelectDropdown
            label="จังหวัด"
            icon={<MapPin className="w-3.5 h-3.5 text-emerald-500" />}
            options={provinceOptions}
            selectedValues={filters.provinces}
            onChange={(vals) => onFilterChange({ ...filters, provinces: vals })}
            placeholder="ทุกจังหวัด"
          />

          {/* Staff (Multi-select) */}
          <MultiSelectDropdown
            label="พนักงาน"
            icon={<UserCheck className="w-3.5 h-3.5 text-purple-500" />}
            options={staffOptions}
            selectedValues={filters.staffs}
            onChange={(vals) => onFilterChange({ ...filters, staffs: vals })}
            placeholder="ทุกคน"
          />

          {/* Source (Multi-select) */}
          <MultiSelectDropdown
            label="แหล่งที่มา"
            icon={<Target className="w-3.5 h-3.5 text-rose-500" />}
            options={sourceOptions}
            selectedValues={filters.sources}
            onChange={(vals) => onFilterChange({ ...filters, sources: vals })}
            placeholder="ทุกแหล่งที่มา"
          />

          {/* Ads Group (Multi-select) */}
          <MultiSelectDropdown
            label="กลุ่ม Ads"
            icon={<Layers className="w-3.5 h-3.5 text-indigo-500" />}
            options={adsGroupOptions}
            selectedValues={filters.adsGroups}
            onChange={(vals) => onFilterChange({ ...filters, adsGroups: vals })}
            placeholder="ทุกกลุ่ม Ads"
          />
        </div>
      )}

      {/* Active Filter Chips Bar */}
      {activeFiltersCount > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 text-[11px] font-medium mr-1">ตัวกรองที่เลือกไว้:</span>

          {filters.search && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-medium border border-slate-200">
              ค้นหา: "{filters.search}"
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, search: '' })}
                className="hover:text-rose-600 cursor-pointer ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.salesFilter !== 'all' && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                filters.salesFilter === 'with_sales'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              ยอดขาย: {filters.salesFilter === 'with_sales' ? 'เฉพาะที่มียอดขาย' : 'ยังไม่มียอดขาย'}
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, salesFilter: 'all' })}
                className="hover:text-rose-600 cursor-pointer ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Years badges */}
          {filters.years.map((yr) => (
            <span
              key={yr}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-800 rounded-lg text-xs font-medium border border-blue-200"
            >
              ปี {yr}
              <button
                type="button"
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    years: filters.years.filter((y) => y !== yr),
                  })
                }
                className="hover:text-rose-600 cursor-pointer ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {/* Months badges */}
          {filters.months.map((m) => {
            const mName = MONTH_DEFINITIONS.find((def) => def.num === m)?.name || m;
            return (
              <span
                key={m}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-800 rounded-lg text-xs font-medium border border-indigo-200"
              >
                เดือน {mName}
                <button
                  type="button"
                  onClick={() =>
                    onFilterChange({
                      ...filters,
                      months: filters.months.filter((x) => x !== m),
                    })
                  }
                  className="hover:text-rose-600 cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}

          {/* Statuses */}
          {filters.statuses.map((st) => (
            <span
              key={st}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-900 rounded-lg text-xs font-medium border border-amber-200"
            >
              สถานะ: {st}
              <button
                type="button"
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    statuses: filters.statuses.filter((s) => s !== st),
                  })
                }
                className="hover:text-rose-600 cursor-pointer ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {/* Branches */}
          {filters.branches.map((b) => (
            <span
              key={b}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-900 rounded-lg text-xs font-medium border border-blue-200"
            >
              สาขา: {b}
              <button
                type="button"
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    branches: filters.branches.filter((x) => x !== b),
                  })
                }
                className="hover:text-rose-600 cursor-pointer ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {/* Provinces */}
          {filters.provinces.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-900 rounded-lg text-xs font-medium border border-emerald-200"
            >
              จ.: {p}
              <button
                type="button"
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    provinces: filters.provinces.filter((x) => x !== p),
                  })
                }
                className="hover:text-rose-600 cursor-pointer ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {/* Staffs */}
          {filters.staffs.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-900 rounded-lg text-xs font-medium border border-purple-200"
            >
              พนักงาน: {s}
              <button
                type="button"
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    staffs: filters.staffs.filter((x) => x !== s),
                  })
                }
                className="hover:text-rose-600 cursor-pointer ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {/* Sources */}
          {filters.sources.map((src) => (
            <span
              key={src}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-900 rounded-lg text-xs font-medium border border-rose-200"
            >
              แหล่งที่มา: {src}
              <button
                type="button"
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    sources: filters.sources.filter((x) => x !== src),
                  })
                }
                className="hover:text-rose-600 cursor-pointer ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {/* Ads Groups */}
          {filters.adsGroups.map((grp) => (
            <span
              key={grp}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-900 rounded-lg text-xs font-medium border border-indigo-200"
            >
              กลุ่ม Ads: {grp}
              <button
                type="button"
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    adsGroups: filters.adsGroups.filter((x) => x !== grp),
                  })
                }
                className="hover:text-rose-600 cursor-pointer ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] text-rose-600 hover:underline font-semibold ml-2 cursor-pointer"
          >
            ล้างทั้งหมด
          </button>
        </div>
      )}
    </div>
  );
};
