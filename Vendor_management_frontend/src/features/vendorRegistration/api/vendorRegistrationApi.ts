import { baseApi } from '@/store/baseApi';
import { toVendor, type RawVendor } from '@/features/vendors/api/vendorsApi';
import type { Vendor } from '@/features/vendors/types';

export interface VendorRegistrationStatus {
  alreadyRegistered: boolean;
  vendor: Vendor | null;
  winningVendorName: string;
}

interface RawVendorRegistrationStatus {
  alreadyRegistered: boolean;
  vendor: RawVendor | null;
  winningVendorName: string;
}

export const vendorRegistrationApi = baseApi.injectEndpoints({
  overrideExisting: process.env.NODE_ENV !== 'production',
  endpoints: (builder) => ({
    // 404 here is a normal, expected result — it means no vendor has been registered for
    // this requirement yet, not a broken query. The screen checks `error?.status === 404`
    // rather than rendering an error state for it.
    getRegisteredVendor: builder.query<Vendor, string>({
      query: (requirementId) => ({ url: `/requirements/${requirementId}/vendor-registration`, method: 'GET' }),
      transformResponse: (raw: RawVendor) => toVendor(raw),
      providesTags: (_result, _error, requirementId) => [{ type: 'Vendor', id: `REQ:${requirementId}` }],
    }),

    // Checked once a requirement is Approved, before showing "Register Vendor" / "Generate
    // Vendor Link" — tells the Department User/HOD whether the winning quotation's vendor is
    // already in the system, so they never duplicate an existing vendor.
    getVendorRegistrationStatus: builder.query<VendorRegistrationStatus, string>({
      query: (requirementId) => ({ url: `/requirements/${requirementId}/vendor-registration/status`, method: 'GET' }),
      transformResponse: (raw: RawVendorRegistrationStatus) => ({
        alreadyRegistered: raw.alreadyRegistered,
        vendor: raw.vendor ? toVendor(raw.vendor) : null,
        winningVendorName: raw.winningVendorName,
      }),
      providesTags: (_result, _error, requirementId) => [{ type: 'Vendor', id: `REQ:${requirementId}` }],
    }),

    registerVendor: builder.mutation<Vendor, { requirementId: string; formData: FormData }>({
      query: ({ requirementId, formData }) => ({
        url: `/requirements/${requirementId}/vendor-registration`,
        method: 'POST',
        data: formData,
      }),
      transformResponse: (raw: { vendor: RawVendor }) => toVendor(raw.vendor),
      invalidatesTags: (_result, _error, { requirementId }) => [
        { type: 'Vendor', id: `REQ:${requirementId}` },
        { type: 'Vendor', id: 'LIST' },
        { type: 'Requirement', id: requirementId },
        { type: 'Requirement', id: 'LIST' },
      ],
    }),

    // Confirms the "Vendor Already Registered" card's match instead of registering a
    // duplicate — same effect as registerVendor (Requirement -> vendor_finalized), so it
    // invalidates the same tags.
    linkExistingVendor: builder.mutation<Vendor, { requirementId: string; vendorId: string }>({
      query: ({ requirementId, vendorId }) => ({
        url: `/requirements/${requirementId}/vendor-registration/link-existing`,
        method: 'POST',
        data: { vendorId },
      }),
      transformResponse: (raw: { vendor: RawVendor }) => toVendor(raw.vendor),
      invalidatesTags: (_result, _error, { requirementId }) => [
        { type: 'Vendor', id: `REQ:${requirementId}` },
        { type: 'Vendor', id: 'LIST' },
        { type: 'Requirement', id: requirementId },
        { type: 'Requirement', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetRegisteredVendorQuery,
  useGetVendorRegistrationStatusQuery,
  useRegisterVendorMutation,
  useLinkExistingVendorMutation,
} = vendorRegistrationApi;
