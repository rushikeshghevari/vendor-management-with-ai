import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Wraps a cell in quotes and escapes embedded quotes only when needed — keeps plain values readable. */
function toCsvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(toCsvCell).join(','));
  return lines.join('\n');
}

/** Writes `csv` to the app cache dir and opens the native share/save sheet. Throws if sharing
 *  isn't available on the device (e.g. some emulators) — callers should catch and surface it. */
export async function shareCsv(fileName: string, csv: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) throw new Error('Sharing is not available on this device');

  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(csv);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: fileName });
}
