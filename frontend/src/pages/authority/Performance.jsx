import React from 'react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import { RegionHeader, FieldRow, StatFigure, AdvisoryNote, Pill } from '../../components/ui/worksheet';

const REASON_KEY = {
  batch_limit_excluded_on_deadline: 'performance.reasonBatch',
  team_capacity_exhausted: 'performance.reasonTeamCapacity',
  no_qualifying_team_shift: 'performance.reasonNoShift',
  block_capacity_exhausted: 'performance.reasonBlockCapacity',
  solver_objective_outranked: 'performance.reasonOutranked',
  not_in_demo_subset: 'performance.reasonNotInSubset',
};

const GENUINE_EXHAUSTION = new Set([
  'team_capacity_exhausted',
  'no_qualifying_team_shift',
  'block_capacity_exhausted',
]);

/** Solver performance and the deferral audit for the full baseline run. */
export const Performance = () => {
  const { baselineMetrics, metrics } = usePlan();
  const { t, isHindi } = useI18n();
  const s = baselineMetrics.summary;
  const op = baselineMetrics.operational_metrics || {};
  const prov = baselineMetrics.provenance || {};
  const reasons = baselineMetrics.deferral_reasons || {};

  const rows = Object.entries(reasons)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
  const totalDeferred = rows.reduce((n, r) => n + r.count, 0);
  const genuine = rows.filter((r) => GENUINE_EXHAUSTION.has(r.key)).reduce((n, r) => n + r.count, 0);

  return (
    <div className="bg-ws-band min-h-full">
      <div className="bg-ws-paper border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-2.5">
        <p className="font-ws text-xs text-ws-mid max-w-3xl leading-relaxed">{t('performance.subtitle')}</p>
      </div>

      {/* 01 — solver performance */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
        <RegionHeader number="01" title={t('performance.title')} meta={t('scope.fullRun').toUpperCase()} isHindi={isHindi} />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-x-5 gap-y-3.5 border-t border-ws-rule pt-3">
          <StatFigure value={s.solver_status} label={t('performance.solverStatus')} tone={s.solver_status === 'OPTIMAL' ? 'text-ws-ok' : 'text-ws-warn'} />
          <StatFigure value={`${s.runtime_seconds}s`} label={t('performance.wallTime')} />
          <StatFigure value={s.total_scheduled.toLocaleString()} label={t('performance.tasksScheduled')} />
          <StatFigure value={(op.unique_blocks_utilized ?? 0).toLocaleString()} label={t('performance.possessionsUsed')} />
          <StatFigure value={(op.total_team_maintenance_hours ?? 0).toLocaleString()} label={t('performance.crewHours')} />
        </div>
      </div>

      {/* 02 — deferral audit + 03 — solver config / scenario */}
      <div className="grid grid-cols-1 lg:grid-cols-[60fr_40fr] bg-ws-rule gap-px border-b border-ws-rule">
        <div className="bg-ws-surface px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
          <RegionHeader number="02" title={t('performance.deferralAudit')} meta={t('performance.deferralScope', { count: totalDeferred.toLocaleString() })} isHindi={isHindi} />
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="border-b border-ws-rule">
                <tr>
                  <th className="py-1.5 font-display text-[10px] font-semibold uppercase tracking-wide text-ws-light">{t('common.reason')}</th>
                  <th className="py-1.5 font-display text-[10px] font-semibold uppercase tracking-wide text-ws-light">{t('performance.kind')}</th>
                  <th className="py-1.5 font-display text-[10px] font-semibold uppercase tracking-wide text-ws-light text-right">{t('performance.count')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-b border-ws-hairline last:border-b-0">
                    <td className="py-1.5">
                      <div className="font-ws text-xs text-ws-ink">{REASON_KEY[r.key] ? t(REASON_KEY[r.key]) : r.key}</div>
                      <div className="font-mono text-[9px] text-ws-light mt-0.5">{r.key}</div>
                    </td>
                    <td className="py-1.5">
                      {GENUINE_EXHAUSTION.has(r.key)
                        ? <Pill tone="critical" size="sm">{t('performance.kindResource')}</Pill>
                        : r.key === 'solver_objective_outranked'
                          ? <Pill tone="info" size="sm">{t('performance.kindObjective')}</Pill>
                          : <Pill tone="idle" size="sm">{t('performance.kindBatch')}</Pill>}
                    </td>
                    <td className="py-1.5 font-mono text-[11px] font-semibold text-ws-ink text-right">{r.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="font-ws text-[11px] text-ws-mid leading-relaxed pt-2.5">{t('performance.deferralNote', { count: genuine.toLocaleString() })}</p>
        </div>

        <div className="bg-ws-surface border-t border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4 space-y-3.5">
          <div>
            <RegionHeader number="03" title={t('performance.solverConfig')} meta="optimizer/config.py" isHindi={isHindi} />
            <div className="border-t border-ws-rule">
              <FieldRow label={t('performance.maxPool')} value={(prov.max_daily_candidate_pool ?? '—').toLocaleString?.() ?? prov.max_daily_candidate_pool} />
              <FieldRow label={t('performance.timeLimit')} value={`${prov.solver_time_limit_seconds_per_day ?? '—'}s`} />
              <FieldRow label={t('performance.planningHorizon')} value={prov.planning_horizon || '—'} />
              <FieldRow label={t('performance.postSolveValidation')} value={prov.post_solve_validation || t('header.notRecorded')} tone="text-ws-ok font-bold" />
            </div>
          </div>

          <AdvisoryNote tone="idle" title={t('performance.poolTitle')}>{t('performance.poolBody')}</AdvisoryNote>

          <div>
            <RegionHeader number="04" title={t('performance.scenarioComparison')} meta={t('performance.scenarioScope')} isHindi={isHindi} />
            <div className="border-t border-ws-rule">
              <FieldRow label={t('performance.tasksConsidered')} value={metrics.summary.total_tasks_considered.toLocaleString()} />
              <FieldRow label={t('status.scheduled')} value={`${metrics.summary.total_scheduled} (${metrics.summary.scheduled_percentage}%)`} tone="text-ws-ok font-bold" />
              <FieldRow label={t('performance.runtime')} value={`${metrics.summary.runtime_seconds}s`} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-ws-band px-3.5 md:px-4 xl:px-5 py-2 flex flex-wrap items-center gap-3.5">
        <span className="font-mono text-[10px] text-ws-light break-all">{prov.scope} · $ {prov.command}</span>
        <span className="flex-1 min-w-2" />
        <span className="font-ws text-xs text-ws-mid">{t('performance.provenanceNote')}</span>
      </div>
    </div>
  );
};
