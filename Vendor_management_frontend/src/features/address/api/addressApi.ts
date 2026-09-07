import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { secureStorage } from '@/utils/secureStorage';

export interface StateResponse {
  uuid4: string;
  state_name: string;
  name: string;
}

export interface DistrictResponse {
  uuid4: string;
  district_name: string;
  name: string;
  frgn_state_uuid4: string;
}

export interface TalukaResponse {
  uuid4: string;
  sub_district_name: string;
  taluka_name: string;
  name: string;
  frgn_district_uuid4: string;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5007/api/v1';

export const addressApi = createApi({
  reducerPath: 'addressApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL.endsWith('/api/v1')
      ? API_BASE_URL.replace('/api/v1', '/api/address')
      : `${API_BASE_URL}/address`,
    prepareHeaders: async (headers) => {
      const token = await secureStorage.getAccessToken();
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getStates: builder.query<StateResponse[], void>({
      query: () => '/state',
      transformResponse: (response: { data: StateResponse[] } | StateResponse[]) =>
        Array.isArray(response) ? response : response.data || [],
    }),
    getDistricts: builder.query<DistrictResponse[], string>({
      query: (stateId) => `/districts/${encodeURIComponent(stateId)}`,
      transformResponse: (response: { data: DistrictResponse[] } | DistrictResponse[]) =>
        Array.isArray(response) ? response : response.data || [],
    }),
    getAllDistricts: builder.query<DistrictResponse[], void>({
      query: () => '/all-districts',
      transformResponse: (response: { data: DistrictResponse[] } | DistrictResponse[]) =>
        Array.isArray(response) ? response : response.data || [],
    }),
    getTalukas: builder.query<TalukaResponse[], string>({
      query: (districtId) => `/taluka/${encodeURIComponent(districtId)}`,
      transformResponse: (response: { data: TalukaResponse[] } | TalukaResponse[]) =>
        Array.isArray(response) ? response : response.data || [],
    }),
  }),
});

export const {
  useGetStatesQuery,
  useGetDistrictsQuery,
  useGetAllDistrictsQuery,
  useGetTalukasQuery,
} = addressApi;
