import React from 'react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import { Panel, PanelHeader, PanelBody, MetricRow, Metric, Alert, ProvenanceNote, DataTable, StatusBadge } from '../../components/ui';

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
  const { t: tx } = useI18n();
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
    <div className="space-y-4">
      <div>
        <h2 className="t-section-title">{tx('performance.title')}</h2>
        <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
          {tx('performance.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Panel><PanelBody><Metric label={tx('performance.solverStatus')} value={s.solver_status} tone={s.solver_status === 'OPTIMAL' ? 'ok' : 'warn'} scope={tx('scope.fullRun')} mono={false} /></PanelBody></Panel>
        <Panel><PanelBody><Metric label={tx('performance.wallTime')} value={`${s.runtime_seconds}s`} sub={tx('performance.wallTimeSub')} scope={tx('scope.fullRun')} /></PanelBody></Panel>
        <Panel><PanelBody><Metric label={tx('performance.tasksScheduled')} value={s.total_scheduled.toLocaleString()} sub={tx('performance.tasksScheduledSub', { pct: s.scheduled_percentage, total: s.total_tasks_considered.toLocaleString() })} scope={tx('scope.fullRun')} /></PanelBody></Panel>
        <Panel><PanelBody><Metric label={tx('performance.possessionsUsed')} value={(op.unique_blocks_utilized ?? 0).toLocaleString()} scope={tx('scope.fullRun')} /></PanelBody></Panel>
        <Panel><PanelBody><Metric label={tx('performance.crewHours')} value={(op.total_team_maintenance_hours ?? 0).toLocaleString()} scope={tx('scope.fullRun')} /></PanelBody></Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel>
          <PanelHeader title={tx('performance.deferralAudit')} scope={tx('performance.deferralScope', { count: totalDeferred.toLocaleString() })} />
          <DataTable
            getKey={(r) => r.key}
            columns={[
              { key: 'key', header: tx('common.reason'), render: (r) => (
                <div>
                  <div className="text-xs text-rail-900">{REASON_KEY[r.key] ? tx(REASON_KEY[r.key]) : r.key}</div>
                  <div className="font-mono text-[9px] text-rail-400 mt-0.5">{r.key}</div>
                </div>
              ) },
              { key: 'kind', header: tx('performance.kind'), render: (r) => (
                GENUINE_EXHAUSTION.has(r.key)
                  ? <StatusBadge tone="critical" size="sm">{tx('performance.kindResource')}</StatusBadge>
                  : r.key === 'solver_objective_outranked'
                    ? <StatusBadge tone="info" size="sm">{tx('performance.kindObjective')}</StatusBadge>
                    : <StatusBadge tone="idle" size="sm">{tx('performance.kindBatch')}</StatusBadge>
              ) },
              { key: 'count', header: tx('performance.count'), align: 'right', render: (r) => (
                <span className="font-mono font-semibold">{r.count.toLocaleString()}</span>
              ) },
            ]}
            rows={rows}
          />
          <PanelBody className="border-t border-line">
            <p className="text-[10px] text-rail-500 leading-relaxed">
              {tx('performance.deferralNote', { count: genuine.toLocaleString() })}
            </p>
          </PanelBody>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title={tx('performance.solverConfig')} scope="optimizer/config.py" />
            <MetricRow label={tx('performance.maxPool')} value={(prov.max_daily_candidate_pool ?? '—').toLocaleString?.() ?? prov.max_daily_candidate_pool} />
            <MetricRow label={tx('performance.timeLimit')} value={`${prov.solver_time_limit_seconds_per_day ?? '—'}s`} />
            <MetricRow label={tx('performance.planningHorizon')} value={prov.planning_horizon || '—'} />
            <MetricRow label={tx('performance.postSolveValidation')} value={prov.post_solve_validation || tx('header.notRecorded')} tone="ok" />
          </Panel>

          <Alert tone="idle" title={tx('performance.poolTitle')}>
            {tx('performance.poolBody')}
          </Alert>

          <Panel>
            <PanelHeader title={tx('performance.scenarioComparison')} scope={tx('performance.scenarioScope')} />
            <MetricRow label={tx('performance.tasksConsidered')} value={metrics.summary.total_tasks_considered.toLocaleString()} sub={tx('performance.subsetNote')} />
            <MetricRow label={tx('status.scheduled')} value={`${metrics.summary.total_scheduled} (${metrics.summary.scheduled_percentage}%)`} tone="ok" />
            <MetricRow label={tx('performance.runtime')} value={`${metrics.summary.runtime_seconds}s`} />
          </Panel>
        </div>
      </div>

      <Panel>
        <PanelBody>
          <ProvenanceNote
            generatedBy={prov.scope}
            command={prov.command}
            dataset={prov.dataset}
            note={tx('performance.provenanceNote')}
          />
        </PanelBody>
      </Panel>
    </div>
  );
};
