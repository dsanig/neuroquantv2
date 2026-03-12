export type FilenameDateToken = {
  token: string;
  index: number;
  isoDate: string;
};

const FILENAME_DATE_TOKEN = /(\d{8})/g;

function toIsoDateUTC(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function isValidDateToken(token: string): boolean {
  if (!/^\d{8}$/.test(token)) return false;
  const year = Number(token.slice(0, 4));
  const month = Number(token.slice(4, 6));
  const day = Number(token.slice(6, 8));
  if (year < 1900 || year > 2200) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * Extract valid YYYYMMDD tokens from a filename and return the last valid token.
 * Deterministic rule: if multiple valid tokens exist, the LAST token is used.
 */
export function extractFilenameDate(filename: string): FilenameDateToken | null {
  const tokens = extractFilenameDateCandidates(filename);
  return tokens.length ? tokens[tokens.length - 1] : null;
}

export function extractFilenameDateCandidates(filename: string): FilenameDateToken[] {
  const matches = filename.matchAll(FILENAME_DATE_TOKEN);
  const valid: FilenameDateToken[] = [];

  for (const match of matches) {
    const token = match[1];
    if (!token || !isValidDateToken(token)) continue;

    valid.push({
      token,
      index: match.index ?? -1,
      isoDate: toIsoDateUTC(Number(token.slice(0, 4)), Number(token.slice(4, 6)), Number(token.slice(6, 8))),
    });
  }

  return valid;
}

export function toYYYYMMDDFromIsoDate(isoDate: string): string | null {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}
