import planJson from '../data/optimized_block_plan.json';

/**
 * The demo scenario's 14 dates are baked into the committed artifacts as
 * fixed calendar dates (2026-09-03 .. 2026-09-16). With no backend to
 * re-solve on a schedule, that window recedes into the past as real time
 * passes. This maps each of those template dates onto a live rolling
 * window that always contains today, re-presenting the same 14-day dataset
 * on a fresh set of real dates every 14 days.
 *
 * Only fields on this key whitelist are shifted, plus object keys that are
 * themselves an exact template date (section_trains.json nests records
 * under a date key). Free-text provenance/description strings are left
 * untouched -- they document what demo.py actually produced and must not
 * be rewritten into a claim about a run that never happened.
 */
const SHIFTED_KEYS = new Set([
  'date',
  'task_date',
  'scheduled_date',
  'execution_date',
  'date_evaluated',
  'deadline',
]);

const DAY_MS = 86400000;

const parseUTCDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

const formatUTCDate = (ms) => new Date(ms).toISOString().slice(0, 10);

const TEMPLATE_DATES = [...new Set(planJson.scheduled_tasks.map((t) => t.date))].sort();
const CYCLE_DAYS = TEMPLATE_DATES.length;
const anchorMs = parseUTCDate(TEMPLATE_DATES[0]);

// Today in India Standard Time (UTC+5:30, no DST), computed from a fixed
// offset rather than the host/browser's own configured timezone. This is an
// Indian Railways tool: "today" must read the same for every viewer and
// every deployment regardless of what timezone the server or the visitor's
// device happens to be set to -- relying on the host's local clock/TZ
// config (as opposed to a fixed IST offset applied to true UTC time) is
// exactly what let this drift by a day.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const istNow = new Date(Date.now() + IST_OFFSET_MS);
const todayMs = Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate());
const daysSinceAnchor = Math.round((todayMs - anchorMs) / DAY_MS);
const windowStartMs = anchorMs + Math.floor(daysSinceAnchor / CYCLE_DAYS) * CYCLE_DAYS * DAY_MS;

// Template date -> the live real-calendar date it currently displays as.
export const DATE_MAP = Object.fromEntries(
  TEMPLATE_DATES.map((templateDate, i) => [templateDate, formatUTCDate(windowStartMs + i * DAY_MS)]),
);

// The 14 live dates in order, independent of task distribution -- the
// calendar strip needs every day represented even ones with zero tasks.
export const LIVE_DATES = TEMPLATE_DATES.map((d) => DATE_MAP[d]);

// Today, in live-calendar terms -- always one of LIVE_DATES by construction.
// Pages that need to default to "what's happening now" (rather than the
// busiest day, or the earliest task in the window) should seed from this,
// not from the first item in a sorted task list.
export const TODAY = formatUTCDate(todayMs);

export const shiftDate = (dateStr) => DATE_MAP[dateStr] || dateStr;

export function shiftDatesDeep(value) {
  if (Array.isArray(value)) return value.map(shiftDatesDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, v] of Object.entries(value)) {
      const newKey = DATE_MAP[key] || key;
      out[newKey] = SHIFTED_KEYS.has(key) && typeof v === 'string' ? shiftDate(v) : shiftDatesDeep(v);
    }
    return out;
  }
  return value;
}
