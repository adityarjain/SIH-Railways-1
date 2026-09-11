import React from 'react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
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
  const { t: tx } = useI18n();
  const prov = baselineMetrics.provenance || {};

  const artifacts = [
    { name: 'optimized_block_plan.json', scope: tx('systemVerification.scopeDemo'), detail: tx('systemVerification.detailScheduledOf', { scheduled: metrics.summary.total_scheduled, considered: metrics.summary.total_tasks_considered }), cmd: 'PYTHONPATH=. python demo.py' },
    { name: 'benchmarks/full_run_metrics.json', scope: tx('systemVerification.scopeBaseline'), detail: tx('systemVerification.detailScheduledOf', { scheduled: baselineMetrics.summary.total_scheduled.toLocaleString(), considered: baselineMetrics.summary.total_tasks_considered.toLocaleString() }), cmd: 'PYTHONPATH=. python -m optimizer.main' },
    { name: 'decision_trace.json', scope: tx('systemVerification.scopeOneTask'), detail: tx('systemVerification.detailWindows', { windows: decisionTrace.candidate_summary.block_windows_considered, rejected: decisionTrace.candidate_summary.rejected }), cmd: 'PYTHONPATH=. python scripts/generate_decision_trace.py TASK-000005' },
    { name: 'section_trains.json', scope: tx('systemVerification.scopeGantt'), detail: tx('systemVerification.detailRecords', { records: sectionTrains.provenance.records_emitted, sections: sectionTrains.provenance.sections }), cmd: sectionTrains.provenance.command },
    { name: 'bundling.json', scope: tx('systemVerification.scopePairs'), detail: tx('systemVerification.detailPairs', { count: bundling.concurrent_bundle_pairs.length }), cmd: 'PYTHONPATH=. python scripts/generate_bundling.py' },
    { name: 'ritvik_scenarios.json', scope: tx('systemVerification.scopeScenarios'), detail: tx('systemVerification.detailScenarios'), cmd: 'PYTHONPATH=. python scripts/generate_ritvik_scenarios.py' },
  ];

  const coverage = Object.entries(criteriaCoverage || {});

  return (
    <div className="space-y-4">
      <div>
        <h2 className="t-section-title">{tx('systemVerification.title')}</h2>
        <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
          {tx('systemVerification.subtitle')}
        </p>
      </div>

      <Alert tone="warn" title={tx('systemVerification.demoWarningTitle')}>
        {tx('systemVerification.demoWarningBody')}
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel>
          <PanelHeader title={tx('systemVerification.postSolve')} scope={tx('systemVerification.postSolveScope')} />
          <Row label={tx('systemVerification.validatorResult')} value={prov.post_solve_validation || tx('header.notRecorded')} tone="ok" />
          <Row label={tx('systemVerification.hardConstraints')} value="C001–C007" sub={tx('systemVerification.hardSub')} />
          <Row label={tx('systemVerification.softConstraints')} value="C008–C012" sub={tx('systemVerification.softSub')} />
          <Row label={tx('systemVerification.structuralRules')} value="S001–S011" sub={tx('systemVerification.structuralSub')} />
          <Row label={tx('systemVerification.datasetTasks')} value={(prov.dataset_tasks ?? 0).toLocaleString()} />
          <Row label={tx('systemVerification.datasetBlocks')} value={(prov.dataset_blocks ?? 0).toLocaleString()} />
        </Panel>

        <Panel>
          <PanelHeader title={tx('systemVerification.networkCoverage')} scope="blocks.csv · corridors_sections.csv" />
          <Row label={tx('systemVerification.trackAvailability')} value={`${networkStats.track_availability_percent}%`} tone="ok" sub={`${networkStats.track_available_block_windows.toLocaleString()} ${tx('common.of')} ${networkStats.total_block_windows.toLocaleString()}`} />
          <Row label={tx('systemVerification.sectionsCorridors')} value={`${networkStats.sections} / ${networkStats.corridors}`} />
          <Row label={tx('systemVerification.horizon')} value={tx('systemVerification.horizonDays', { count: networkStats.horizon_days })} />
          <Row label={tx('systemVerification.trainRecords')} value={sectionTrains.provenance.records_emitted.toLocaleString()} sub={tx('systemVerification.trainRecordsSub', { count: sectionTrains.provenance.source_rows.toLocaleString() })} />
          <Row label={tx('systemVerification.droppedTiming')} value={sectionTrains.provenance.rows_dropped_missing_timing} tone="ok" sub={tx('systemVerification.droppedSub')} />
        </Panel>
      </div>

      <Panel>
        <PanelHeader title={tx('systemVerification.artifactProvenance')} scope={tx('systemVerification.artifactScope')} />
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
          <PanelHeader title={tx('systemVerification.criteriaCoverage')} scope={tx('systemVerification.criteriaScope')} />
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
        <PanelHeader title={tx('systemVerification.claimsTitle')} />
        <div className="divide-y divide-line-subtle">
          {['claim1', 'claim2', 'claim3', 'claim4', 'claim5', 'claim6', 'claim7', 'claim8', 'claim9'].map((key) => (
            <div key={key} className="px-3 py-2 text-[11px] text-rail-600 leading-relaxed">— {tx(`systemVerification.${key}`)}</div>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelBody>
          <ProvenanceNote
            generatedBy={prov.scope}
            command={prov.command}
            dataset={prov.dataset}
            note={scenarioProvenance?.dataset ? tx('systemVerification.scenarioDataset', { value: scenarioProvenance.dataset }) : undefined}
            defaultOpen
          />
        </PanelBody>
      </Panel>
    </div>
  );
};
