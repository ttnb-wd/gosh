/** Admin business schedules use Myanmar wall time, never the device timezone. */
export const BUSINESS_TIME_ZONE = "Asia/Yangon";
const MYANMAR_OFFSET_MS = 390 * 60_000;
const pad = (value: number) => String(value).padStart(2, "0");

/** Also accepts explicit ISO offsets for compatibility with existing API clients. */
export function parseBusinessSchedule(value: unknown): Date | null {
  if (typeof value !== "string" || value.length > 40) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?$/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi, s = "0", fraction = "", zone] = match;
  const [year, month, day, hour, minute, second] = [y, mo, d, h, mi, s].map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return null;
  // Numeric UTC setters avoid string parsing and Date.UTC's special years 0–99.
  const wall = new Date(0);
  wall.setUTCFullYear(year, month - 1, day);
  wall.setUTCHours(hour, minute, second, Number(fraction.padEnd(3, "0")));
  if (wall.getUTCFullYear() !== year || wall.getUTCMonth() !== month - 1 || wall.getUTCDate() !== day) return null;
  let offset = MYANMAR_OFFSET_MS;
  if (zone === "Z") offset = 0;
  else if (zone) {
    const hours = Number(zone.slice(1, 3)), minutes = Number(zone.slice(4, 6));
    if (hours > 23 || minutes > 59) return null;
    offset = (zone[0] === "+" ? 1 : -1) * (hours * 60 + minutes) * 60_000;
  }
  const instant = new Date(wall.getTime() - offset);
  return instant.getUTCFullYear() >= 1 && instant.getUTCFullYear() <= 9999 ? instant : null;
}

export function formatBusinessSchedule(date: Date): string {
  if (!Number.isFinite(date.getTime())) return "";
  const wall = new Date(date.getTime() + MYANMAR_OFFSET_MS);
  return `${String(wall.getUTCFullYear()).padStart(4, "0")}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}T${pad(wall.getUTCHours())}:${pad(wall.getUTCMinutes())}`;
}

/** Only the calendar day is represented in browser time. Hours stay as strings.
 * Noon avoids device DST gaps; this Date must never be submitted as an instant. */
export function businessCalendarDate(date: Date): Date {
  const wall = formatBusinessSchedule(date);
  const calendar = new Date(0);
  calendar.setFullYear(Number(wall.slice(0, 4)), Number(wall.slice(5, 7)) - 1, Number(wall.slice(8, 10)));
  calendar.setHours(12, 0, 0, 0);
  return calendar;
}

export function businessCalendarSelection(day: Date, time: string): Date | null {
  return parseBusinessSchedule(`${String(day.getFullYear()).padStart(4, "0")}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T${time}`);
}

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function formatBusinessPicker(date: Date): string {
  const wall = formatBusinessSchedule(date);
  if (!wall) return "";
  const hour = Number(wall.slice(11, 13));
  return `${months[Number(wall.slice(5, 7)) - 1]} ${Number(wall.slice(8, 10))}, ${wall.slice(0, 4)} ${hour % 12 || 12}:${wall.slice(14, 16)} ${hour >= 12 ? "PM" : "AM"}`;
}

/** Match the existing picker input format without browser/date-fns parsing. */
export function parseBusinessPicker(value: string): Date | null {
  const match = /^([A-Za-z]+) (\d{1,2}), (\d{4}) (\d{1,2}):(\d{2}) (AM|PM)$/i.exec(value.trim());
  if (!match) return null;
  const [, month, day, year, h, minute, period] = match;
  const monthIndex = months.findIndex(name => name.toLowerCase() === month.toLowerCase());
  const hour = Number(h);
  if (monthIndex < 0 || hour < 1 || hour > 12) return null;
  return parseBusinessSchedule(`${year}-${pad(monthIndex + 1)}-${pad(Number(day))}T${pad(hour % 12 + (period.toUpperCase() === "PM" ? 12 : 0))}:${minute}`);
}

export function isBusinessScheduleRangeInvalid(start: string, end: string): boolean {
  const startDate = parseBusinessSchedule(start), endDate = parseBusinessSchedule(end);
  return !!(start && end && (!startDate || !endDate || endDate.getTime() <= startDate.getTime()));
}

// API boundary messages are curated server-side; provider errors stay private.
export function scheduleSaveError(result: unknown): string {
  if (result && typeof result === "object" && "error" in result && typeof result.error === "string" && result.error.length <= 300) return result.error;
  return "Unable to save your changes. Please try again.";
}
