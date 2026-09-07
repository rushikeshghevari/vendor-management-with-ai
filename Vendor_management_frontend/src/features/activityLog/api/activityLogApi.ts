import { baseApi } from '@/store/baseApi';
import type { ActivityAction, ActivityLogEntry } from '@/features/activityLog/types';
import type { Paged, PaginationMeta } from '@/types/pagination';

interface RawDepartmentRef {
  _id: string;
  name: string;
  code: string;
}

interface RawActivityLog {
  _id: string;
  action: ActivityAction;
  performedBy?: string;
  performedByName: string;
  performedByRole: string;
  department?: RawDepartmentRef | null;
  targetId?: string;
  targetType?: string;
  ipAddress?: string;
  createdAt: string;
}

function toActivityLogEntry(raw: RawActivityLog): ActivityLogEntry {
  return {
    id: raw._id,
    action: raw.action,
    performedBy: raw.performedBy,
    performedByName: raw.performedByName,
    performedByRole: raw.performedByRole,
    departmentId: raw.department?._id,
    departmentName: raw.department?.name,
    targetId: raw.targetId,
    targetType: raw.targetType,
    ipAddress: raw.ipAddress,
    createdAt: raw.createdAt,
  };
}

export interface ActivityLogPageParams {
  page: number;
  limit: number;
  action?: ActivityAction;
  department?: string;
  from?: string;
  to?: string;
}

export const activityLogApi = baseApi.injectEndpoints({
  overrideExisting: process.env.NODE_ENV !== 'production',
  endpoints: (builder) => ({
    getActivityLogsPage: builder.query<Paged<ActivityLogEntry>, ActivityLogPageParams>({
      query: (params) => ({ url: '/activity-logs', method: 'GET', params }),
      transformResponse: (raw: RawActivityLog[], meta): Paged<ActivityLogEntry> => ({
        items: raw.map(toActivityLogEntry),
        meta: meta as PaginationMeta,
      }),
      providesTags: [{ type: 'AuditLog' as const, id: 'ACTIVITY_LIST' }],
    }),
  }),
});

export const { useGetActivityLogsPageQuery } = activityLogApi;
