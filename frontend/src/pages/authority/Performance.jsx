import React from 'react';
import { usePlan } from '../../context/PlanContext';
import { Panel, PanelHeader, PanelBody, MetricRow, Metric, Alert, ProvenanceNote, DataTable, StatusBadge } from '../../components/ui';

const REASON_LABEL = {
  batch_limit_excluded_on_deadline: 'Reached deadline outside the daily candidate batch',
  team_capacity_exhausted: 'No crew hours remained',
  no_qualifying_team_shift: 'No crew shift covered the window',
  block_capacity_exhausted: 'Block possession at capacity',
  solver_objective_outranked: 'Outranked by the objective',
  not_in_demo_subset: 'Not evaluated in this scenario',
};

const GENUINE_EXHAUSTION = new Set([
  'team_capacity_exhausted',
  'no_qualifying_team_shift',
  'block_capacity_exhausted',
]);

/** Solver performance and the deferral audit for the full baseline run. */
export const Performance = () => {
  const { baselineMetrics, metrics } = usePlan();
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
        <h2 className="t-section-title">Optimizer Performance</h2>
        <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
          Solver behaviour and the deferral audit for the complete run over the clean dataset.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Panel><PanelBody><Metric label="Solver status" value={s.solver_status} tone={s.solver_status === 'OPTIMAL' ? 'ok' : 'warn'} scope="Full run" mono={false} /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="Wall time" value={`${s.runtime_seconds}s`} sub="machine-dependent" scope="Full run" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="Tasks scheduled" value={s.total_scheduled.toLocaleString()} sub={`${s.scheduled_percentage}% of ${s.total_tasks_considered.toLocaleString()}`} scope="Full run" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="Possessions used" value={(op.unique_blocks_utilized ?? 0).toLocaleString()} scope="Full run" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="Crew hours" value={(op.total_team_maintenance_hours ?? 0).toLocaleString()} scope="Full run" /></PanelBody></Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel>
          <PanelHeader title="Deferral audit" scope={`${totalDeferred.toLocaleString()} deferred · full run`} />
          <DataTable
            getKey={(r) => r.key}
            columns={[
              { key: 'key', header: 'Reason', render: (r) => (
                <div>
                  <div className="text-xs text-rail-900">{REASON_LABEL[r.key] || r.key}</div>
                  <div className="font-mono text-[9px] text-rail-400 mt-0.5">{r.key}</div>
                </div>
              ) },
              { key: 'kind', header: 'Kind', render: (r) => (
                GENUINE_EXHAUSTION.has(r.key)
                  ? <StatusBadge tone="critical" size="sm">resource</StatusBadge>
                  : r.key === 'solver_objective_outranked'
                    ? <StatusBadge tone="info" size="sm">objective</StatusBadge>
                    : <StatusBadge tone="idle" size="sm">batch</StatusBadge>
              ) },
              { key: 'count', header: 'Count', align: 'right', render: (r) => (
                <span className="font-mono font-semibold">{r.count.toLocaleString()}</span>
              ) },
            ]}
            rows={rows}
          />
          <PanelBody className="border-t border-line">
            <p className="text-[10px] text-rail-500 leading-relaxed">
              <strong className="text-rail-700">{genuine.toLocaleString()}</strong> deferrals are
              genuine resource exhaustion. The remainder reached their deadline while outside the
              daily CP-SAT candidate batch — a throughput limit of the rolling-horizon
              configuration, not an infeasibility.
            </p>
          </PanelBody>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Solver configuration" scope="optimizer/config.py" />
            <MetricRow label="Max daily candidate pool" value={(prov.max_daily_candidate_pool ?? '—').toLocaleString?.() ?? prov.max_daily_candidate_pool} />
            <MetricRow label="Time limit per day batch" value={`${prov.solver_time_limit_seconds_per_day ?? '—'}s`} />
            <MetricRow label="Planning horizon" value={prov.planning_horizon || '—'} />
            <MetricRow label="Post-solve validation" value={prov.post_solve_validation || 'not recorded'} tone="ok" />
          </Panel>

          <Alert tone="idle" title="Widening the candidate pool is not free throughput">
            A measured sweep over an identical 3-day window found 700 → 424 scheduled, 2,000 → 452,
            and 5,000 → 136: past roughly 2,000 the per-day model outgrows the solver budget and
            CP-SAT returns a worse incumbent.
          </Alert>

          <Panel>
            <PanelHeader title="Scenario comparison" scope="Demo subset, for contrast" />
            <MetricRow label="Tasks considered" value={metrics.summary.total_tasks_considered.toLocaleString()} sub="the subset the planning screen renders" />
            <MetricRow label="Scheduled" value={`${metrics.summary.total_scheduled} (${metrics.summary.scheduled_percentage}%)`} tone="ok" />
            <MetricRow label="Runtime" value={`${metrics.summary.runtime_seconds}s`} />
          </Panel>
        </div>
      </div>

      <Panel>
        <PanelBody>
          <ProvenanceNote
            generatedBy={prov.scope}
            command={prov.command}
            dataset={prov.dataset}
            note="Wall time varies between machines; every other figure on this screen is deterministic."
          />
        </PanelBody>
      </Panel>
    </div>
  );
};
