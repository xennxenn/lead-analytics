export interface RawMainRow {
  leadNo: string;
  rawAds: string;
  extractedAds: string;
}

export interface RawStatusRow {
  leadNo: string;
  status: string;
  customerName: string;
  phone: string;
  source: string;
  jobType: string;
  staff: string;
  branch: string;
  district: string;
  province: string;
}

export interface RawSalesRow {
  leadNo: string;
  paymentDate: string;
  amount: number;
  salesStatus: string; // 'N' only counts
}

export interface SalesTransaction {
  date: string;
  amount: number;
  status: string;
  formattedDateThai?: string;
  daysFromLeadCreation?: number | null;
}

export interface JoinedLead {
  id: string; // Lead No
  leadNo: string;
  createdYear: number;
  createdMonth: string;
  createdDay: string;
  createdDateStr: string;
  createdDateFormattedThai: string;
  status: string;
  customerName: string;
  phone: string;
  source: string;
  jobType: string;
  staff: string;
  branch: string;
  district: string;
  province: string;
  extractedAds: string;
  adsGroup: string;
  rawAds: string;
  totalSales: number;
  salesCount: number;
  hasSales: boolean;
  salesTransactions: SalesTransaction[];
  firstPaymentDate?: string;
  lastPaymentDate?: string;
  daysToFirstPayment?: number | null;
  daysToLastPayment?: number | null;
  avgDaysToPayment?: number | null;
}

export interface AdsGroup {
  id: string;
  name: string;
  color: string;
  assignedAds: string[];
  keywords?: string[];
}

export interface FilterState {
  search: string;
  years: string[];
  months: string[];
  dateStart: string;
  dateEnd: string;
  statuses: string[];
  branches: string[];
  provinces: string[];
  staffs: string[];
  sources: string[];
  jobTypes: string[];
  adsGroups: string[];
  adsList: string[];
  salesFilter: 'all' | 'with_sales' | 'no_sales';
}

export type SortField = 'count' | 'sales' | 'conversionRate' | 'createdDate' | 'leadNo' | 'customerName' | 'avgDeal';
export type SortDirection = 'asc' | 'desc';

export interface DimensionMetric {
  key: string;
  label: string;
  leadCount: number;
  salesLeadCount: number;
  conversionRate: number;
  totalSales: number;
  avgDealSize: number;
  percentOfTotalLeads: number;
  percentOfTotalSales: number;
}

export interface DatasetSummary {
  totalLeads: number;
  leadsWithSales: number;
  totalSalesAmount: number;
  conversionRate: number;
  avgDealSize: number;
  totalTransactions: number;
  fileStats: {
    mainCount: number;
    statusCount: number;
    salesCount: number;
    validSalesCount: number;
  };
  lastUpdated: string | null;
}
