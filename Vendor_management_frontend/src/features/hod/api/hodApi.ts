import { baseApi } from '@/store/baseApi';
import { toDepartment, type RawDepartment } from '@/features/departments/api/departmentsApi';
import type { Department, DepartmentAnalytics } from '@/features/departments/types';
import type { AppUser } from '@/features/users/types';
import type { Role } from '@/constants/roles';
import type { Paged, PaginationMeta } from '@/types/pagination';

interface RawDepartmentRef {
  _id: string;
  name: string;
  code: string;
}

interface RawHodUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  department?: RawDepartmentRef | string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

function toAppUser(raw: RawHodUser): AppUser {
  const department = raw.department;
  const isPopulated = typeof department === 'object' && department !== null;

  return {
    id: raw._id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    role: raw.role,
    departmentId: isPopulated ? department._id : department ?? '',
    departmentName: isPopulated ? department.name : '',
    isActive: raw.isActive,
    createdAt: raw.createdAt,
    lastLoginAt: raw.lastLoginAt,
  };
}

export interface HodCreateUserInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  isActive?: boolean;
}

export interface HodUpdateUserInput {
  name?: string;
  phone?: string;
  isActive?: boolean;
}

export const hodApi = baseApi.injectEndpoints({
  overrideExisting: process.env.NODE_ENV !== 'production',
  endpoints: (builder) => ({
    getHodDepartment: builder.query<Department, void>({
      query: () => ({ url: '/hod/department', method: 'GET' }),
      transformResponse: (raw: RawDepartment) => toDepartment(raw),
      providesTags: [{ type: 'Department', id: 'OWN' }],
    }),

    getHodAnalytics: builder.query<DepartmentAnalytics, void>({
      query: () => ({ url: '/hod/analytics', method: 'GET' }),
      providesTags: [{ type: 'Department', id: 'OWN-ANALYTICS' }],
    }),

    getHodUsers: builder.query<AppUser[], void>({
      query: () => ({ url: '/hod/users', method: 'GET', params: { limit: 100 } }),
      transformResponse: (raw: RawHodUser[]) => raw.map(toAppUser),
      providesTags: (result) => [
        ...(result ?? []).map((item) => ({ type: 'Users' as const, id: item.id })),
        { type: 'Users' as const, id: 'LIST' },
      ],
    }),

    // Real server-side pagination/filter/search — used by HodUserListScreen (not `.length`
    // over the capped-at-100 `getHodUsers` above).
    getHodUsersPage: builder.query<Paged<AppUser>, { page: number; limit: number; isActive?: boolean; search?: string }>({
      query: ({ isActive, ...rest }) => ({
        url: '/hod/users',
        method: 'GET',
        params: { ...rest, isActive: isActive === undefined ? undefined : String(isActive) },
      }),
      transformResponse: (raw: RawHodUser[], meta): Paged<AppUser> => ({
        items: raw.map(toAppUser),
        meta: meta as PaginationMeta,
      }),
      providesTags: (result) => [
        ...(result?.items ?? []).map((item) => ({ type: 'Users' as const, id: item.id })),
        { type: 'Users' as const, id: 'LIST' },
      ],
    }),

    createHodUser: builder.mutation<AppUser, HodCreateUserInput>({
      query: (body) => ({ url: '/hod/users', method: 'POST', data: body }),
      transformResponse: (raw: RawHodUser) => toAppUser(raw),
      invalidatesTags: [{ type: 'Users', id: 'LIST' }, { type: 'Department', id: 'OWN' }],
    }),

    updateHodUser: builder.mutation<AppUser, { id: string; body: HodUpdateUserInput }>({
      query: ({ id, body }) => ({ url: `/hod/users/${id}`, method: 'PUT', data: body }),
      transformResponse: (raw: RawHodUser) => toAppUser(raw),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Users', id },
        { type: 'Users', id: 'LIST' },
      ],
    }),

    setHodUserStatus: builder.mutation<AppUser, { id: string; isActive: boolean }>({
      query: ({ id, isActive }) => ({ url: `/hod/users/${id}/status`, method: 'PATCH', data: { isActive } }),
      transformResponse: (raw: RawHodUser) => toAppUser(raw),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Users', id },
        { type: 'Users', id: 'LIST' },
        { type: 'Department', id: 'OWN' },
      ],
    }),

    resetHodUserPassword: builder.mutation<void, { id: string; newPassword: string }>({
      query: ({ id, newPassword }) => ({ url: `/hod/users/${id}/reset-password`, method: 'PATCH', data: { newPassword } }),
    }),

    deleteHodUser: builder.mutation<void, string>({
      query: (id) => ({ url: `/hod/users/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Users', id },
        { type: 'Users', id: 'LIST' },
        { type: 'Department', id: 'OWN' },
      ],
    }),

    bulkSetHodUserStatus: builder.mutation<{ updated: number }, { ids: string[]; isActive: boolean }>({
      query: (body) => ({ url: '/hod/users/bulk-status', method: 'PATCH', data: body }),
      invalidatesTags: [{ type: 'Users', id: 'LIST' }, { type: 'Department', id: 'OWN' }],
    }),
  }),
});

export const {
  useGetHodDepartmentQuery,
  useGetHodAnalyticsQuery,
  useGetHodUsersQuery,
  useGetHodUsersPageQuery,
  useCreateHodUserMutation,
  useUpdateHodUserMutation,
  useSetHodUserStatusMutation,
  useResetHodUserPasswordMutation,
  useDeleteHodUserMutation,
  useBulkSetHodUserStatusMutation,
} = hodApi;
