/** Wraps a payload in the backend's standard response envelope (see backend/src/utils/ApiResponse.ts),
 * matching what axiosBaseQuery actually receives from `apiClient.request` before unwrapping it. */
export function apiEnvelope<T>(data: T) {
  return { success: true, message: 'OK', data };
}
