/** `director_approved` -> `Director Approved` — used to render raw backend status/enum
 *  values (quotation/bill status breakdowns) as human-readable chart labels. */
export function formatStatusLabel(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
