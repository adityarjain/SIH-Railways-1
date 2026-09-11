import React from 'react';
import { usePlan } from '../../context/PlanContext';
import { Panel, PanelHeader, PanelBody, MetricRow, StatusBadge, Alert, ProvenanceNote } from '../../components/ui';
import networkStats from '../../data/network_stats.json';
import sectionTrains from '../../data/section_trains.json';
import decisionTrace from '../../data/decision_trace.json';
import bundling from '../../data/bundling.json';

const Row = ({ label, value, tone, sub }) => <MetricRow label={label} value={value} tone={tone} sub={sub} />;

/**
 * What the system checks, what it measures, and what it explicitly does not do.
 * The limitations panel is as important as the metrics: it is what makes the
 * rest of the numbers trustworthy.
 */
export const SystemVerification = () => {
  const { baselineMetrics, metrics, criteriaCoverage, scenarioProvenance } = usePlan();
  const prov = baselineMetrics.provenance || {};

  const artifacts = [
    { name: 'optimized_block_plan.json', scope: 'Demo scenario', detail: `${metrics.summary.total_scheduled} scheduled of ${metrics.summary.total_tasks_considered} considered`, cmd: 'PYTHONPATH=. python demo.py' },
    { name: 'benchmarks/full_run_metrics.json', scope: 'Baseline full run', detail: `${baselineMetrics.summary.total_scheduled.toLocaleString()} scheduled of ${baselineMetrics.summary.total_tasks_considered.toLocaleString()}`, cmd: 'PYTHONPATH=. python -m optimizer.main' },
    { name: 'decision_trace.json', scope: 'One task', detail: `${decisionTrace.candidate_summary.block_windows_considered} windows, ${decisionTrace.candidate_summary.rejected} rejected`, cmd: 'PYTHONPATH=. python scripts/generate_decision_trace.py TASK-000005' },
    { name: 'section_trains.json', scope: 'Gantt train projection', detail: `${sectionTrains.provenance.records_emitted} records across ${sectionTrains.provenance.sections} sections`, cmd: sectionTrains.provenance.command },
    { name: 'bundling.json', scope: 'Concurrent pairs', detail: `${bundling.concurrent_bundle_pairs.length} pairs`, cmd: 'PYTHONPATH=. python scripts/generate_bundling.py' },
    { name: 'ritvik_scenarios.json', scope: 'Replanning scenarios', detail: '4 scenarios, each a real engine run', cmd: 'PYTHONPATH=. python scripts/generate_ritvik_scenarios.py' },
  ];

  const coverage = Object.entries(criteriaCoverage || {});

  return (
    <div className="space-y-4">
      <div>
        <h2 className="t-section-title">System Verification</h2>
        <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
          Which artifact backs each screen, what the post-solve validator checks, and which
          capabilities are deliberately not implemented.
        </p>
      </div>

      <Alert tone="warn" title="This is a demonstration on a synthetic dataset">
        There is no connection to any railway signalling, dispatch or asset-management system,
        and no live data feed. Dates, assets, trains, crews and corridors are generated. The
        browser reads committed JSON artifacts; it does not run the solver.
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel>
          <PanelHeader title="Post-solve validation" scope="Independent of the solver" />
          <Row label="Validator result" value={prov.post_solve_validation || 'not recorded'} tone="ok" />
          <Row label="Hard constraints" value="C001–C007" sub="duration, train conflict, infrastructure, crew, deadline, bundling, capacity" />
          <Row label="Soft constraints" value="C008–C012" sub="passenger impact, congestion, night preference, priority, bundling reward" />
          <Row label="Structural rules" value="S001–S011" sub="single placement, contiguity, shift window, skill match, team non-overlap" />
          <Row label="Dataset tasks" value={(prov.dataset_tasks ?? 0).toLocaleString()} />
          <Row label="Dataset block windows" value={(prov.dataset_blocks ?? 0).toLocaleString()} />
        </Panel>

        <Panel>
          <PanelHeader title="Network coverage" scope="blocks.csv · corridors_sections.csv" />
          <Row label="Track availability" value={`${networkStats.track_availability_percent}%`} tone="ok" sub={`${networkStats.track_available_block_windows.toLocaleString()} of ${networkStats.total_block_windows.toLocaleString()} windows`} />
          <Row label="Sections / corridors" value={`${networkStats.sections} / ${networkStats.corridors}`} />
          <Row label="Horizon" value={`${networkStats.horizon_days} days`} />
          <Row label="Train records projected" value={sectionTrains.provenance.records_emitted.toLocaleString()} sub={`from ${sectionTrains.provenance.source_rows.toLocaleString()} source rows`} />
          <Row label="Dropped for missing timing" value={sectionTrains.provenance.rows_dropped_missing_timing} tone="ok" sub="dropped, never imputed" />
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="Artifact provenance" scope="Every screen traces to one of these" />
        <div className="divide-y divide-line-subtle">
          {artifacts.map((a) => (
            <div key={a.name} className="px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-[11px] text-rail-900">{a.name}</div>
                  <div className="text-[10px] text-rail-400 mt-0.5">{a.detail}</div>
                </div>
                <StatusBadge tone="idle" size="sm">{a.scope}</StatusBadge>
              </div>
              <div className="font-mono text-[9px] text-rail-400 mt-1 break-all">$ {a.cmd}</div>
            </div>
          ))}
        </div>
      </Panel>

      {coverage.length > 0 && (
        <Panel>
          <PanelHeader title="Dynamic allocation — criteria coverage" scope="Reported by the replanning engine" />
          <div className="divide-y divide-line-subtle">
            {coverage.map(([key, entry]) => {
              const status = entry?.status || 'UNKNOWN';
              const implemented = status !== 'NOT_IMPLEMENTED';
              return (
                <div key={key} className={`px-3 py-2.5 ${implemented ? '' : 'bg-surface-sunken'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={`text-xs font-medium ${implemented ? 'text-rail-900' : 'text-status-idle'}`}>
                        {key.replace(/_/g, ' ')}
                      </div>
                      {entry?.basis && (
                        <div className="text-[10px] text-rail-500 mt-0.5 leading-relaxed">{entry.basis}</div>
                      )}
                      {entry?.limitation && (
                        <div className="text-[10px] text-status-warn mt-0.5 leading-relaxed">{entry.limitation}</div>
                      )}
                    </div>
                    <StatusBadge tone={implemented ? 'ok' : 'idle'} size="sm">{status}</StatusBadge>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      <Panel>
        <PanelHeader title="Claims this system does not make" />
        <div className="divide-y divide-line-subtle">
          {[
            'No live or real-time railway data; operational events are simulated.',
            'No REST API or backend service. The frontend reads committed JSON artifacts.',
            'No integration with any railway operator system.',
            'No train sequencing or precedence logic.',
            'No downstream (knock-on) delay propagation — trains.csv has no onward itinerary.',
            'No equipment or machine identifiers exist in the dataset, so no equipment allocation is claimed.',
            'No bundling saving or "disruption avoided" figure — that needs an unbundled counterfactual plan.',
            'Controller decisions and verification actions are session state only.',
            'Risk-model training is not reproducible here; only evaluation is.',
          ].map((claim) => (
            <div key={claim} className="px-3 py-2 text-[11px] text-rail-600 leading-relaxed">— {claim}</div>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelBody>
          <ProvenanceNote
            generatedBy={prov.scope}
            command={prov.command}
            dataset={prov.dataset}
            note={scenarioProvenance?.dataset ? `Scenario dataset: ${scenarioProvenance.dataset}` : undefined}
            defaultOpen
          />
        </PanelBody>
      </Panel>
    </div>
  );
};
