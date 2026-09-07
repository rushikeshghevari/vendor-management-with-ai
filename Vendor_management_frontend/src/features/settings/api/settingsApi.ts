import { baseApi } from '@/store/baseApi';

export interface SystemSettings {
  ceoApprovalLimit: number;
}

export const settingsApi = baseApi.injectEndpoints({
  overrideExisting: process.env.NODE_ENV !== 'production',
  endpoints: (builder) => ({
    getSystemSettings: builder.query<SystemSettings, void>({
      query: () => ({ url: '/settings', method: 'GET' }),
      providesTags: [{ type: 'Setting', id: 'SYSTEM' }],
    }),

    // Super Admin only (enforced server-side) — changing this can re-route in-flight
    // Quotations between the CEO and Directors, so it also invalidates the Quotation LIST.
    updateSystemSettings: builder.mutation<SystemSettings, { ceoApprovalLimit: number }>({
      query: (body) => ({ url: '/settings', method: 'PATCH', data: body }),
      invalidatesTags: [
        { type: 'Setting', id: 'SYSTEM' },
        { type: 'Quotation', id: 'LIST' },
      ],
    }),
  }),
});

export const { useGetSystemSettingsQuery, useUpdateSystemSettingsMutation } = settingsApi;
