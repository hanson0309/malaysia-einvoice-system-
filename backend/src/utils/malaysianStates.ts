export const MALAYSIAN_STATES = [
  { code: '01', name: 'Johor' },
  { code: '02', name: 'Kedah' },
  { code: '03', name: 'Kelantan' },
  { code: '04', name: 'Melaka' },
  { code: '05', name: 'Negeri Sembilan' },
  { code: '06', name: 'Pahang' },
  { code: '07', name: 'Pulau Pinang' },
  { code: '08', name: 'Perak' },
  { code: '09', name: 'Perlis' },
  { code: '10', name: 'Selangor' },
  { code: '11', name: 'Terengganu' },
  { code: '12', name: 'Sabah' },
  { code: '13', name: 'Sarawak' },
  { code: '14', name: 'Kuala Lumpur' },
  { code: '15', name: 'Labuan' },
  { code: '16', name: 'Putrajaya' },
] as const;

const STATE_ALIASES: Record<string, string> = {
  penang: '07',
  'pulau pinang': '07',
  'wilayah persekutuan kuala lumpur': '14',
  'wilayah persekutuan labuan': '15',
  'wilayah persekutuan putrajaya': '16',
};

/** Accepts LHDN 2-digit code or common state name; returns 2-digit code. */
export function normalizeMalaysianStateCode(input: string): string {
  const trimmed = input.trim();
  if (/^\d{2}$/.test(trimmed)) return trimmed;

  const lower = trimmed.toLowerCase();
  if (STATE_ALIASES[lower]) return STATE_ALIASES[lower];

  const match = MALAYSIAN_STATES.find((s) => s.name.toLowerCase() === lower);
  if (match) return match.code;

  return trimmed.length >= 2 ? trimmed.substring(0, 2) : trimmed;
}

export function malaysianStateName(code: string): string {
  return MALAYSIAN_STATES.find((s) => s.code === code)?.name ?? code;
}
