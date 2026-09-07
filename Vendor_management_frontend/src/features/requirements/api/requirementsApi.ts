import { baseApi } from '@/store/baseApi';
import type { Requirement, RequirementItem, RequirementPriority, RequirementStatus } from '@/features/requirements/types';
import type { Paged, PaginationMeta } from '@/types/pagination';

interface RawRef {
  _id: string;
  name: string;
}

interface RawCreatedBy extends RawRef {
  department?: RawRef | string;
}

export interface RawRequirement {
  _id: string;
  requirementNumber: string;
  department: RawRef | string;
  /** The requester's own department id at creation time — always a plain (unpopulated)
   *  ObjectId string, never equal to `department` unless this requirement was never routed.
   *  See requirement.model.ts's own doc comment. */
  requestedByDepartment: string;
  createdBy: RawCreatedBy | string;
  submittedBy?: RawRef | string;
  title: string;
  description?: string;
  priority: RequirementPriority;
  budget: number;
  requiredDate: string;
  status: RequirementStatus;
  remarks?: string;
  approvalStatus: Requirement['approvalStatus'];
  items: RequirementItem[];
  // Only populated by GET /requirements (list) — getById doesn't return it, hence optional.
  quotationCount?: number;
  preparedQuotation?: string;
  createdAt: string;
  updatedAt: string;
}

export function toRequirement(raw: RawRequirement): Requirement {
  const department = raw.department;
  const createdBy = raw.createdBy;
  const submittedBy = raw.submittedBy;
  const isDeptPopulated = typeof department === 'object' && department !== null;
  const isCreatedByPopulated = typeof createdBy === 'object' && createdBy !== null;
  const isSubmittedByPopulated = typeof submittedBy === 'object' && submittedBy !== null;
  const creatorDepartment = isCreatedByPopulated ? createdBy.department : undefined;
  const isCreatorDeptPopulated = typeof creatorDepartment === 'object' && creatorDepartment !== null;

  return {
    id: raw._id,
    requirementNumber: raw.requirementNumber,
    departmentId: isDeptPopulated ? department._id : department,
    departmentName: isDeptPopulated ? department.name : '',
    requestedByDepartmentId: raw.requestedByDepartment,
    createdById: isCreatedByPopulated ? createdBy._id : createdBy,
    createdByName: isCreatedByPopulated ? createdBy.name : '',
    // The creator's own department — only meaningfully different from `departmentName` when
    // this requirement was routed to another department via targetDepartment at creation.
    createdByDepartmentName: isCreatorDeptPopulated ? creatorDepartment.name : undefined,
    submittedByName: isSubmittedByPopulated ? submittedBy.name : undefined,
    title: raw.title,
    description: raw.description,
    priority: raw.priority,
    budget: raw.budget,
    requiredDate: raw.requiredDate,
    status: raw.status,
    remarks: raw.remarks,
    approvalStatus: raw.approvalStatus,
    items: raw.items ?? [],
    quotationCount: raw.quotationCount ?? 0,
    preparedQuotationId: raw.preparedQuotation,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

/** The requester only says what's needed and how much — title/budget/required-date/unit/rate
 *  are all decided later (quotation collection) or auto-derived server-side, see
 *  requirement.service.ts's create(). */
export interface RequirementFormInput {
  items: { itemName: string; quantity: number }[];
  /** Routes the requirement to a different department than the requester's own — omit to
   *  keep the default (their own department). */
  targetDepartment?: string;
  /** ISO date string — when this is actually needed by. Omit to let the server default to
   *  30 days out (see requirement.service.ts's create()). */
  requiredDate?: string;
}

export interface RequirementPageParams {
  page: number;
  limit: number;
  status?: RequirementStatus;
  search?: string;
}

export const requirementsApi = baseApi.injectEndpoints({
  overrideExisting: process.env.NODE_ENV !== 'production',
  endpoints: (builder) => ({
    getRequirements: builder.query<Requirement[], void>({
      query: () => ({ url: '/requirements', method: 'GET', params: { limit: 100 } }),
      transformResponse: (raw: RawRequirement[]) => raw.map(toRequirement),
      providesTags: (result) => [
        ...(result ?? []).map((item) => ({ type: 'Requirement' as const, id: item.id })),
        { type: 'Requirement' as const, id: 'LIST' },
      ],
    }),

    // Real server-side pagination/filter/search — used by RequirementListScreen and by
    // dashboard KPI cards that need an accurate total (not `.length` over the capped-at-100
    // `getRequirements` above, which silently under-counts past 100 records).
    getRequirementsPage: builder.query<Paged<Requirement>, RequirementPageParams>({
      query: (params) => ({ url: '/requirements', method: 'GET', params }),
      transformResponse: (raw: RawRequirement[], meta): Paged<Requirement> => ({
        items: raw.map(toRequirement),
        meta: meta as PaginationMeta,
      }),
      providesTags: (result) => [
        ...(result?.items ?? []).map((item) => ({ type: 'Requirement' as const, id: item.id })),
        { type: 'Requirement' as const, id: 'LIST' },
      ],
    }),

    getRequirementById: builder.query<Requirement, string>({
      query: (id) => ({ url: `/requirements/${id}`, method: 'GET' }),
      transformResponse: (raw: RawRequirement) => toRequirement(raw),
      providesTags: (_result, _error, id) => [{ type: 'Requirement', id }],
    }),

    createRequirement: builder.mutation<Requirement, RequirementFormInput>({
      query: (body) => ({ url: '/requirements', method: 'POST', data: body }),
      transformResponse: (raw: RawRequirement) => toRequirement(raw),
      invalidatesTags: [{ type: 'Requirement', id: 'LIST' }],
    }),

    updateRequirement: builder.mutation<Requirement, { id: string; body: Partial<RequirementFormInput> }>({
      query: ({ id, body }) => ({ url: `/requirements/${id}`, method: 'PUT', data: body }),
      transformResponse: (raw: RawRequirement) => toRequirement(raw),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Requirement', id },
        { type: 'Requirement', id: 'LIST' },
      ],
    }),

    submitRequirement: builder.mutation<Requirement, string>({
      query: (id) => ({ url: `/requirements/${id}/submit`, method: 'PATCH' }),
      transformResponse: (raw: RawRequirement) => toRequirement(raw),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Requirement', id },
        { type: 'Requirement', id: 'LIST' },
      ],
    }),

    // Explicit hand-off to the Director — the only way a requirement enters Director Review
    // (see docs/WORKFLOW_ENHANCEMENT_DIRECTOR_SUBMISSION.md). Only reachable while status is
    // quotation_collection; reachable again after a Director's Send Back decision.
    submitRequirementToDirector: builder.mutation<Requirement, string>({
      query: (id) => ({ url: `/requirements/${id}/submit-to-director`, method: 'PATCH' }),
      transformResponse: (raw: RawRequirement) => toRequirement(raw),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Requirement', id },
        { type: 'Requirement', id: 'LIST' },
      ],
    }),

    // Department User/HOD's own recommended pick among the collected quotations — purely
    // informational, shown to the Director alongside each quotation.
    setPreparedQuotation: builder.mutation<Requirement, { requirementId: string; quotationId: string; prepared: boolean }>({
      query: ({ requirementId, quotationId, prepared }) => ({
        url: `/requirements/${requirementId}/quotations/${quotationId}/prepared`,
        method: 'PATCH',
        data: { prepared },
      }),
      transformResponse: (raw: RawRequirement) => toRequirement(raw),
      invalidatesTags: (_result, _error, { requirementId }) => [
        { type: 'Requirement', id: requirementId },
        { type: 'Requirement', id: 'LIST' },
      ],
    }),

    deleteRequirement: builder.mutation<void, string>({
      query: (id) => ({ url: `/requirements/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Requirement', id },
        { type: 'Requirement', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetRequirementsQuery,
  useGetRequirementsPageQuery,
  useGetRequirementByIdQuery,
  useCreateRequirementMutation,
  useUpdateRequirementMutation,
  useSubmitRequirementMutation,
  useSubmitRequirementToDirectorMutation,
  useSetPreparedQuotationMutation,
  useDeleteRequirementMutation,
} = requirementsApi;
