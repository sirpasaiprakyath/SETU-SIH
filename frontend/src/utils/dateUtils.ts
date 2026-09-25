/**
 * ============================================================================
 * REAL-TIME TIMESTAMP & DATE UTILITY (SETU / DHVANI)
 * ============================================================================
 * Defense-grade real-time timestamp normalization and localized formatting.
 * Solves UTC-to-IST offset discrepancy so that every timestamp displayed in
 * the application reflects the REAL physical time of the event (no fake dates,
 * no static mock years, and no 5.5-hour UTC interpretation drift).
 */

export function parseUtcIsoToLocalDate(input: string | number | Date | null | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input === "number") {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  let str = String(input).trim();
  if (!str) return null;

  // If the string contains space instead of T (e.g. SQLite datetime: '2026-09-21 17:37:48')
  if (str.includes(" ") && !str.includes("T")) {
    str = str.replace(" ", "T");
  }

  // If string has no timezone offset (no Z, no +HH:MM, no -HH:MM), treat as UTC ISO
  if (!str.endsWith("Z") && !str.includes("+") && !/[+-]\d{2}:\d{2}$/.test(str)) {
    str = str + "Z";
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formats a timestamp into a full real-world date and time (e.g. "21 Sep 2026, 11:35 PM")
 */
export function formatRealDateTime(input: string | number | Date | null | undefined): string {
  const d = parseUtcIsoToLocalDate(input);
  if (!d) return "—";

  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}

/**
 * Formats a timestamp relative to today (e.g. "Today at 11:35 PM", "Yesterday at 4:20 PM", or "21 Sep, 11:35 PM")
 */
export function formatRelativeRealTime(input: string | number | Date | null | undefined): string {
  const d = parseUtcIsoToLocalDate(input);
  if (!d) return "—";

  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  const timeStr = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });

  if (isToday) {
    return `Today at ${timeStr}`;
  }
  if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  }

  const dateStr = d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short"
  });
  return `${dateStr}, ${timeStr}`;
}

/**
 * Formats just the time (e.g. "11:35:42 PM")
 */
export function formatRealTimeOnly(input: string | number | Date | null | undefined): string {
  const d = parseUtcIsoToLocalDate(input);
  if (!d) return "—";

  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}

/**
 * Returns current real UTC ISO-8601 string with trailing 'Z'
 */
export function getRealNowIso(): string {
  return new Date().toISOString();
}
