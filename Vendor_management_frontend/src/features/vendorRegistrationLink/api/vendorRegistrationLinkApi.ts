import { apiClient } from '@/services/apiClient';
import { normalizeApiError } from '@/services/apiError';
import { toVendor, type RawVendor } from '@/features/vendors/api/vendorsApi';
import { toRequirement, type RawRequirement } from '@/features/requirements/api/requirementsApi';
import type { Requirement } from '@/features/requirements/types';
import type { Vendor } from '@/features/vendors/types';
import type { VendorRegistrationLink } from '@/features/vendorRegistrationLink/types';
import { baseApi } from '@/store/baseApi';

interface RawLink {
  _id: string;
  requirement: string;
  token: string;
  status: VendorRegistrationLink['status'];
  expiresAt: string;
  submittedData?: VendorRegistrationLink['submittedData'];
  submittedDocuments: VendorRegistrationLink['submittedDocuments'];
  submittedAt?: string;
  verifiedAt?: string;
  createdAt: string;
}

function toLink(raw: RawLink): VendorRegistrationLink {
  return {
    id: raw._id,
    requirementId: raw.requirement,
    token: raw.token,
    status: raw.status,
    expiresAt: raw.expiresAt,
    submittedData: raw.submittedData,
    submittedDocuments: raw.submittedDocuments ?? [],
    submittedAt: raw.submittedAt,
    verifiedAt: raw.verifiedAt,
    createdAt: raw.createdAt,
  };
}

export const vendorRegistrationLinkApi = baseApi.injectEndpoints({
  overrideExisting: process.env.NODE_ENV !== 'production',
  endpoints: (builder) => ({
    generateVendorRegistrationLink: builder.mutation<VendorRegistrationLink, string>({
      query: (requirementId) => ({ url: `/requirements/${requirementId}/vendor-registration-link`, method: 'POST' }),
      transformResponse: (raw: RawLink) => toLink(raw),
      invalidatesTags: (_result, _error, requirementId) => [{ type: 'Requirement', id: `LINK:${requirementId}` }],
    }),

    // 404 here just means "no link generated yet" — the normal starting state, not an error.
    getVendorRegistrationLinkStatus: builder.query<VendorRegistrationLink | null, string>({
      queryFn: async (requirementId) => {
        try {
          const res = await apiClient.request<{ success: boolean; message: string; data: RawLink }>({
            url: `/requirements/${requirementId}/vendor-registration-link`,
          });
          return { data: toLink(res.data.data) };
        } catch (err) {
          const normalized = normalizeApiError(err);
          if (normalized.status === 404) return { data: null };
          return { error: normalized };
        }
      },
      providesTags: (_result, _error, requirementId) => [{ type: 'Requirement', id: `LINK:${requirementId}` }],
    }),

    verifyVendorRegistrationLink: builder.mutation<{ vendor: Vendor; requirement: Requirement }, string>({
      query: (requirementId) => ({ url: `/requirements/${requirementId}/vendor-registration-link/verify`, method: 'POST' }),
      transformResponse: (raw: { vendor: RawVendor; requirement: RawRequirement }) => ({
        vendor: toVendor(raw.vendor),
        requirement: toRequirement(raw.requirement),
      }),
      invalidatesTags: (_result, _error, requirementId) => [
        { type: 'Requirement', id: requirementId },
        { type: 'Requirement', id: `LINK:${requirementId}` },
        { type: 'Vendor', id: `REQ:${requirementId}` },
        { type: 'Vendor', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGenerateVendorRegistrationLinkMutation,
  useGetVendorRegistrationLinkStatusQuery,
  useVerifyVendorRegistrationLinkMutation,
} = vendorRegistrationLinkApi;
