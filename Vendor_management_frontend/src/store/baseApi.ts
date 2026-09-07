import { createApi } from '@reduxjs/toolkit/query/react';

import { axiosBaseQuery } from '@/store/axiosBaseQuery';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Auth', 'User', 'Department', 'Users', 'Vendor', 'Requirement', 'Quotation', 'Comparison', 'Bill', 'Notification', 'Setting', 'Payment', 'PurchaseOrder', 'AuditLog', 'GoodsReceipt', 'RecurringExpense'],
  // Keep cached data for 5 minutes (default is 60s). Without this, navigating away from
  // a screen for >60s expires the cache and triggers a fresh request on return — well
  // within a normal session, this contributed to the 429 burst.
  keepUnusedDataFor: 300,
  endpoints: () => ({}),
});
