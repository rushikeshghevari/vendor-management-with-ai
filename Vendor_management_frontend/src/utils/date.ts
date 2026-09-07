/** `YYYY-MM-DD` <-> `Date`/`DD/MM/YYYY` helpers for the native date picker fields.
 *  Always built from local Y/M/D components (never `toISOString()`/`Date.parse`) so a
 *  selected calendar day can never shift by a day due to UTC conversion. */

export function parseIsoDate(value: string | undefined): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parts = value.split('-').map(Number) as [number, number, number];
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date();
}

export function toIsoDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(value: string | undefined): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}
