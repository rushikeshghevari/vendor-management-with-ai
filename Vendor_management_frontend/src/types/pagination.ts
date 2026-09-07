/** Mirrors the backend's `buildPaginationMeta()` shape (see `Vendor_management_backend/src/utils/pagination.ts`). */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paged<T> {
  items: T[];
  meta: PaginationMeta;
}
