import { baseApi } from '@/store/baseApi';
import type { BankDetails, Vendor, VendorDocument, VendorRegistrationStatus, VendorStatus } from '@/features/vendors/types';
import type { Paged, PaginationMeta } from '@/types/pagination';

interface RawRef {
  _id: string;
  name: string;
  code?: string;
  email?: string;
}

export interface RawVendor {
  _id: string;
  name: string;
  code: string;
  department: RawRef | string;
  createdBy: RawRef | string;
  contactPerson: string;
  phone: string;
  email: string;
  gstNumber?: string;
  panNumber?: string;
  address: string;
  state: string;
  district: string;
  city: string;
  country?: string;
  pincode: string;
  bankDetails: BankDetails;
  category: string;
  status: VendorStatus;
  // Phase 6 — absent/empty on a manually-created vendor.
  documents?: VendorDocument[];
  registrationStatus?: VendorRegistrationStatus;
  createdFromRequirement?: RawRef | string;
  createdFromQuotation?: RawRef | string;
  approvedByDirector?: RawRef | string;
  createdAt: string;
  updatedAt: string;
}

function idOf(ref?: RawRef | string): string | undefined {
  if (!ref) return undefined;
  return typeof ref === 'object' ? ref._id : ref;
}

export function toVendor(raw: RawVendor): Vendor {
  const department = raw.department;
  const createdBy = raw.createdBy;
  const isDeptPopulated = typeof department === 'object' && department !== null;
  const isCreatedByPopulated = typeof createdBy === 'object' && createdBy !== null;

  return {
    id: raw._id,
    name: raw.name,
    code: raw.code,
    departmentId: isDeptPopulated ? department._id : department,
    departmentName: isDeptPopulated ? department.name : '',
    createdById: isCreatedByPopulated ? createdBy._id : createdBy,
    createdByName: isCreatedByPopulated ? createdBy.name : '',
    contactPerson: raw.contactPerson,
    phone: raw.phone,
    email: raw.email,
    gstNumber: raw.gstNumber,
    panNumber: raw.panNumber,
    address: raw.address,
    state: raw.state,
    district: raw.district,
    city: raw.city,
    country: raw.country,
    pincode: raw.pincode,
    bankDetails: raw.bankDetails,
    category: raw.category,
    status: raw.status,
    documents: raw.documents ?? [],
    registrationStatus: raw.registrationStatus ?? 'registered',
    createdFromRequirement: idOf(raw.createdFromRequirement),
    createdFromQuotation: idOf(raw.createdFromQuotation),
    approvedByDirectorName: typeof raw.approvedByDirector === 'object' ? raw.approvedByDirector.name : undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export interface VendorFormInput {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstNumber?: string;
  panNumber?: string;
  address: string;
  state: string;
  district: string;
  city: string;
  pincode: string;
  bankDetails: BankDetails;
  category: string;
  status?: VendorStatus;
}

export interface VendorPageParams {
  page: number;
  limit: number;
  status?: VendorStatus;
  category?: string;
  search?: string;
}

export const vendorsApi = baseApi.injectEndpoints({
  overrideExisting: process.env.NODE_ENV !== 'production',
  endpoints: (builder) => ({
    getVendors: builder.query<Vendor[], void>({
      query: () => ({ url: '/vendors', method: 'GET', params: { limit: 100 } }),
      transformResponse: (raw: RawVendor[]) => raw.map(toVendor),
      providesTags: (result) => [
        ...(result ?? []).map((item) => ({ type: 'Vendor' as const, id: item.id })),
        { type: 'Vendor' as const, id: 'LIST' },
      ],
    }),

    // Fetch by id directly — used by the root-level Vendor Details view (reachable for roles,
    // like Director, who have no Vendors tab / list screen at all).
    getVendorById: builder.query<Vendor, string>({
      query: (id) => ({ url: `/vendors/${id}`, method: 'GET' }),
      transformResponse: (raw: RawVendor) => toVendor(raw),
      providesTags: (_result, _error, id) => [{ type: 'Vendor', id }],
    }),

    // Real server-side pagination/filter/search — used by VendorListScreen and by dashboard
    // KPI cards that need an accurate total (not `.length` over the capped-at-100 `getVendors`
    // above, which silently under-counts past 100 records).
    getVendorsPage: builder.query<Paged<Vendor>, VendorPageParams>({
      query: (params) => ({ url: '/vendors', method: 'GET', params }),
      transformResponse: (raw: RawVendor[], meta): Paged<Vendor> => ({
        items: raw.map(toVendor),
        meta: meta as PaginationMeta,
      }),
      providesTags: (result) => [
        ...(result?.items ?? []).map((item) => ({ type: 'Vendor' as const, id: item.id })),
        { type: 'Vendor' as const, id: 'LIST' },
      ],
    }),

    createVendor: builder.mutation<Vendor, VendorFormInput>({
      query: (body) => ({ url: '/vendors', method: 'POST', data: body }),
      transformResponse: (raw: RawVendor) => toVendor(raw),
      invalidatesTags: [{ type: 'Vendor', id: 'LIST' }],
    }),

    updateVendor: builder.mutation<Vendor, { id: string; body: Partial<VendorFormInput> }>({
      query: ({ id, body }) => ({ url: `/vendors/${id}`, method: 'PATCH', data: body }),
      transformResponse: (raw: RawVendor) => toVendor(raw),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Vendor', id },
        { type: 'Vendor', id: 'LIST' },
      ],
    }),

    setVendorStatus: builder.mutation<Vendor, { id: string; status: VendorStatus }>({
      query: ({ id, status }) => ({ url: `/vendors/${id}/status`, method: 'PATCH', data: { status } }),
      transformResponse: (raw: RawVendor) => toVendor(raw),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Vendor', id },
        { type: 'Vendor', id: 'LIST' },
      ],
    }),

    deleteVendor: builder.mutation<void, string>({
      query: (id) => ({ url: `/vendors/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Vendor', id },
        { type: 'Vendor', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetVendorsQuery,
  useGetVendorsPageQuery,
  useGetVendorByIdQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useSetVendorStatusMutation,
  useDeleteVendorMutation,
} = vendorsApi;
