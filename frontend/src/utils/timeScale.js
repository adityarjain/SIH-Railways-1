/**
 * Minute-of-day → percentage positioning for timeline surfaces.
 *
 * The old Gantt hardcoded `start / 1440` inline, which locked it to a full-day
 * domain with no zoom. BundlingView independently implemented a better,
 * window-relative version. This is that maths, promoted so both consume it.
 */

export const DAY_MINUTES = 1440;

/**
 * Build a scale over an arbitrary [start, end] minute domain.
 * Domains may exceed 1440 (a night window wraps past midnight).
 */
export const makeScale = (domainStart = 0, domainEnd = DAY_MINUTES) => {
  const span = Math.max(1, domainEnd - domainStart);

  const toPercent = (minute) => ((minute - domainStart) / span) * 100;

  /** Width of [a,b] as a percentage, floored so a 3-minute bar stays visible. */
  const toWidth = (a, b, minPercent = 0.35) =>
    Math.max(((b - a) / span) * 100, minPercent);

  /** True when [a,b] intersects the domain at all. */
  const intersects = (a, b) => b > domainStart && a < domainEnd;

  /** Clamp an interval into the domain so bars never overflow their track. */
  const clamp = (a, b) => [Math.max(a, domainStart), Math.min(b, domainEnd)];

  return { domainStart, domainEnd, span, toPercent, toWidth, intersects, clamp };
};

/**
 * Tick positions for the ruler. Returned as {minute, percent, label} so labels
 * can be absolutely positioned — the previous implementation centred them in
 * grid columns, which put every label half a column off its own gridline.
 */
export const ticksFor = (scale, stepMinutes = 180) => {
  const out = [];
  const first = Math.ceil(scale.domainStart / stepMinutes) * stepMinutes;
  for (let m = first; m <= scale.domainEnd; m += stepMinutes) {
    // End-of-day reads as 24:00, not 00:00 — the previous ruler wrapped it and
    // showed midnight twice.
    const h = m === DAY_MINUTES ? 24 : Math.floor(m / 60) % 24;
    const mm = m % 60;
    out.push({
      minute: m,
      percent: scale.toPercent(m),
      label: `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
    });
  }
  return out;
};

/** Named domains offered by the Gantt. */
export const DOMAIN_PRESETS = {
  day: { id: 'day', label: 'Full day', start: 0, end: DAY_MINUTES },
  night: { id: 'night', label: 'Night 22:00–06:00', start: 1320, end: 1800 },
};

/**
 * Domain framing a possession with padding either side. Used by the
 * "Possession ±2h" preset; returns null when there is nothing to frame.
 */
export const possessionDomain = (blocks, padMinutes = 120) => {
  if (!blocks || blocks.length === 0) return null;
  const starts = blocks.map((b) => b.start_minute).filter((n) => n != null);
  const ends = blocks.map((b) => b.end_minute).filter((n) => n != null);
  if (starts.length === 0 || ends.length === 0) return null;
  return {
    id: 'possession',
    label: 'Possession ±2h',
    start: Math.max(0, Math.min(...starts) - padMinutes),
    end: Math.min(DAY_MINUTES, Math.max(...ends) + padMinutes),
  };
};

/**
 * Pack intervals into lanes so overlapping items stack instead of painting on
 * top of each other. Greedy first-fit; returns a lane index per item.
 */
export const packLanes = (items, getStart, getEnd) => {
  const laneEnds = [];
  return items.map((item) => {
    const s = getStart(item);
    const e = getEnd(item);
    let lane = laneEnds.findIndex((end) => s >= end);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(e);
    } else {
      laneEnds[lane] = e;
    }
    return { item, lane };
  });
};
