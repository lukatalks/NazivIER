// Helpers for parsing SICRIS researcher URLs / IDs.

const ID_PATTERN = /(?:researcher\/|id=|mstid=)?(\d{4,6})/i;

/** Extracts the numeric researcher ID from a pasted SICRIS URL or returns it if already numeric. */
export function extractSicrisId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^\d{4,6}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(ID_PATTERN);
  return m ? m[1] : null;
}
