/**
 * Risk banding. The thresholds 80 / 60 / 40 were previously inline literals in
 * ~10 components, which is why the same score could render as a different band
 * depending on the screen. They live here now.
 *
 * These match the `risk_level` values the prediction artifact already carries
 * (neev_predictions_for_optimizer.csv -> risk_level), so `bandOf` prefers the
 * artifact's own label when a record has one and only falls back to the score.
 */

export const RISK_BANDS = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];

/** Band a raw 0-100 risk score. Returns null for a missing/unparseable score. */
export const riskBand = (score) => {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return null;
  const s = Number(score);
  if (s >= 80) return 'CRITICAL';
  if (s >= 60) return 'HIGH';
  if (s >= 40) return 'MODERATE';
  return 'LOW';
};

/**
 * Band a record, trusting its own `risk_level` when present. Records from
 * tasks_inventory.json and completed_work.json carry it; scheduled_tasks in
 * optimized_block_plan.json carry only `risk_score`.
 */
export const bandOf = (record) => {
  if (!record) return null;
  const declared = record.risk_level;
  if (typeof declared === 'string' && RISK_BANDS.includes(declared.toUpperCase())) {
    return declared.toUpperCase();
  }
  return riskBand(record.risk_score);
};

/** Semantic status token for a band, matching the tailwind `status.*` colours. */
export const bandTone = (band) => {
  switch (band) {
    case 'CRITICAL':
      return 'critical';
    case 'HIGH':
      return 'warn';
    case 'MODERATE':
      return 'info';
    case 'LOW':
      return 'ok';
    default:
      return 'idle';
  }
};
