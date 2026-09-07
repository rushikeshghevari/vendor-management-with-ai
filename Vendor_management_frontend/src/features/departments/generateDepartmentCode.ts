/**
 * Derives the code prefix from a department name:
 *  - "Purchase Department" -> "PUR" (first 3 letters of the one remaining word)
 *  - "Human Resources"     -> "HR"  (initials, when more than one word remains)
 */
function buildCodePrefix(name: string): string {
  const cleaned = name.replace(/department/gi, '').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'DPT';
  if (words.length > 1) {
    return words.map((word) => word.charAt(0).toUpperCase()).join('');
  }
  return (words[0] ?? '').slice(0, 3).toUpperCase();
}

/**
 * Auto-generates a department code from its name, e.g. "Quality Department" -> "QUA006".
 * Increments the sequence until it no longer collides with `existingCodes`.
 */
export function generateDepartmentCode(name: string, existingCodes: string[]): string {
  const prefix = buildCodePrefix(name);
  let sequence = existingCodes.length + 1;
  let code = `${prefix}${String(sequence).padStart(3, '0')}`;
  while (existingCodes.includes(code)) {
    sequence += 1;
    code = `${prefix}${String(sequence).padStart(3, '0')}`;
  }
  return code;
}
