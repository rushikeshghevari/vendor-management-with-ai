export interface DepartmentHod {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  departmentHead?: string;
  hod?: DepartmentHod;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userCount?: number;
  vendorCount?: number;
  requirementCount?: number;
  quotationCount?: number;
  purchaseOrderCount?: number;
  billCount?: number;
}

export interface ActivitySeriesPoint {
  date?: string;
  month?: string;
  quotations: number;
  bills: number;
}

export interface CountSeriesPoint {
  month: string;
  count: number;
}

export interface StatusBreakdownEntry {
  status: string;
  count: number;
}

export interface DepartmentAnalytics {
  activeUsers: number;
  inactiveUsers: number;
  pendingApprovals: number;
  rejected: number;
  completed: number;
  weeklyActivity: ActivitySeriesPoint[];
  monthlyTrend: ActivitySeriesPoint[];
  vendorGrowth: CountSeriesPoint[];
  requirementTrend: number[];
  quotationTrend: number[];
  purchaseOrderTrend: number[];
  billTrend: number[];
  quotationStatusBreakdown: StatusBreakdownEntry[];
  billStatusBreakdown: StatusBreakdownEntry[];
}
