/**
 * Minute-of-day (0-1440) to HH:MM, matching the convention used throughout the
 * generated artifacts (optimized_block_plan.json, decision_trace.json).
 */
export const minToHhmm = (m) => {
  if (m === null || m === undefined || Number.isNaN(Number(m))) return '—';
  const total = Number(m);
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
};
