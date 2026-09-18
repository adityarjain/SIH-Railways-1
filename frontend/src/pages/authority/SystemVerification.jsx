import React from 'react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import { RegionHeader, FieldRow, AdvisoryNote, Pill } from '../../components/ui/worksheet';
import networkStats from '../../data/network_stats.json';
import sectionTrains from '../../data/live/sectionTrains';
import decisionTrace from '../../data/live/decisionTrace';
import bundling from '../../data/live/bundling';

/**
 * What the system checks, what it measures, and what it explicitly does not do.
 * The limitations section is as important as the metrics: it is what makes the
 * rest of the numbers trustworthy.
 */
export const SystemVerification = () => {
  const { baselineMetrics, metrics, criteriaCoverage, scenarioProvenance } = usePlan();
  const { t, isHindi } = useI18n();
  const prov = baselineMetrics.provenance || {};

  const artifacts = [
    { name: 'optimized_block_plan.json', scope: t('systemVerification.scopeDemo'), detail: t('systemVerification.detailScheduledOf', { scheduled: metrics.summary.total_scheduled, considered: metrics.summary.total_tasks_considered }), cmd: 'PYTHONPATH=. python demo.py' },
    { name: 'benchmarks/full_run_metrics.json', scope: t('systemVerification.scopeBaseline'), detail: t('systemVerification.detailScheduledOf', { scheduled: baselineMetrics.summary.total_scheduled.toLocaleString(), considered: baselineMetrics.summary.total_tasks_considered.toLocaleString() }), cmd: 'PYTHONPATH=. python -m optimizer.main' },
    { name: 'decision_trace.json', scope: t('systemVerification.scopeOneTask'), detail: t('systemVerification.detailWindows', { windows: decisionTrace.candidate_summary.block_windows_considered, rejected: decisionTrace.candidate_summary.rejected }), cmd: 'PYTHONPATH=. python scripts/generate_decision_trace.py TASK-000005' },
    { name: 'section_trains.json', scope: t('systemVerification.scopeGantt'), detail: t('systemVerification.detailRecords', { records: sectionTrains.provenance.records_emitted, sections: sectionTrains.provenance.sections }), cmd: sectionTrains.provenance.command },
    { name: 'bundling.json', scope: t('systemVerification.scopePairs'), detail: t('systemVerification.detailPairs', { count: bundling.concurrent_bundle_pairs.length }), cmd: 'PYTHONPATH=. python scripts/generate_bundling.py' },
    { name: 'ritvik_scenarios.json', scope: t('systemVerification.scopeScenarios'), detail: t('systemVerification.detailScenarios'), cmd: 'PYTHONPATH=. python scripts/generate_ritvik_scenarios.py' },
  ];

  const coverage = Object.entries(criteriaCoverage || {});

  return (
    <div className="bg-ws-band min-h-full">
      <div className="bg-ws-paper border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-2.5">
        <p className="font-ws text-xs text-ws-mid max-w-3xl leading-relaxed">{t('systemVerification.subtitle')}</p>
      </div>

      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-3.5">
        <AdvisoryNote tone="warn" title={t('systemVerification.demoWarningTitle')}>{t('systemVerification.demoWarningBody')}</AdvisoryNote>
      </div>

      {/* 01/02 — post-solve + network coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 bg-ws-rule gap-px border-b border-ws-rule">
        <div className="bg-ws-surface px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
          <RegionHeader number="01" title={t('systemVerification.postSolve')} meta={t('systemVerification.postSolveScope')} isHindi={isHindi} />
          <div className="border-t border-ws-rule">
            <FieldRow label={t('systemVerification.validatorResult')} value={prov.post_solve_validation || t('header.notRecorded')} tone="text-ws-ok font-bold" />
            <FieldRow label={t('systemVerification.hardConstraints')} value="C001–C007" />
            <FieldRow label={t('systemVerification.softConstraints')} value="C008–C012" />
            <FieldRow label={t('systemVerification.structuralRules')} value="S001–S011" />
            <FieldRow label={t('systemVerification.datasetTasks')} value={(prov.dataset_tasks ?? 0).toLocaleString()} />
            <FieldRow label={t('systemVerification.datasetBlocks')} value={(prov.dataset_blocks ?? 0).toLocaleString()} />
          </div>
        </div>

        <div className="bg-ws-surface border-t border-ws-rule lg:border-t-0 px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
          <RegionHeader number="02" title={t('systemVerification.networkCoverage')} meta="blocks.csv · corridors_sections.csv" isHindi={isHindi} />
          <div className="border-t border-ws-rule">
            <FieldRow label={t('systemVerification.trackAvailability')} value={`${networkStats.track_availability_percent}%`} tone="text-ws-ok font-bold" />
            <FieldRow label={t('systemVerification.sectionsCorridors')} value={`${networkStats.sections} / ${networkStats.corridors}`} />
            <FieldRow label={t('systemVerification.horizon')} value={t('systemVerification.horizonDays', { count: networkStats.horizon_days })} />
            <FieldRow label={t('systemVerification.trainRecords')} value={sectionTrains.provenance.records_emitted.toLocaleString()} />
            <FieldRow label={t('systemVerification.droppedTiming')} value={sectionTrains.provenance.rows_dropped_missing_timing} tone="text-ws-ok font-bold" />
          </div>
        </div>
      </div>

      {/* 03 — artifact provenance */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
        <RegionHeader number="03" title={t('systemVerification.artifactProvenance')} meta={t('systemVerification.artifactScope')} isHindi={isHindi} />
        <div className="border-t border-ws-rule">
          {artifacts.map((a) => (
            <div key={a.name} className="py-2.5 border-b border-ws-hairline last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-[11px] text-ws-ink">{a.name}</div>
                  <div className="font-ws text-[10px] text-ws-light mt-0.5">{a.detail}</div>
                </div>
                <Pill tone="idle" size="sm">{a.scope}</Pill>
              </div>
              <div className="font-mono text-[9px] text-ws-light mt-1 break-all">$ {a.cmd}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 04 — criteria coverage */}
      {coverage.length > 0 && (
        <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
          <RegionHeader number="04" title={t('systemVerification.criteriaCoverage')} meta={t('systemVerification.criteriaScope')} isHindi={isHindi} />
          <div className="border-t border-ws-rule">
            {coverage.map(([key, entry]) => {
              const status = entry?.status || 'UNKNOWN';
              const implemented = status !== 'NOT_IMPLEMENTED';
              return (
                <div key={key} className={`py-2.5 border-b border-ws-hairline last:border-b-0 ${implemented ? '' : 'bg-ws-paper'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={`font-ws text-xs font-medium ${implemented ? 'text-ws-ink' : 'text-ws-idle'}`}>{key.replace(/_/g, ' ')}</div>
                      {entry?.basis && <div className="font-ws text-[10px] text-ws-mid mt-0.5 leading-relaxed">{entry.basis}</div>}
                      {entry?.limitation && <div className="font-ws text-[10px] text-ws-warn mt-0.5 leading-relaxed">{entry.limitation}</div>}
                    </div>
                    <Pill tone={implemented ? 'ok' : 'idle'} size="sm">{status}</Pill>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 05 — claims */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
        <RegionHeader number="05" title={t('systemVerification.claimsTitle')} isHindi={isHindi} />
        <div className="border-t border-ws-rule">
          {['claim1', 'claim2', 'claim3', 'claim4', 'claim5', 'claim6', 'claim7', 'claim8', 'claim9'].map((key) => (
            <div key={key} className="py-2 font-ws text-[11px] text-ws-mid leading-relaxed border-b border-ws-hairline last:border-b-0">— {t(`systemVerification.${key}`)}</div>
          ))}
        </div>
      </div>

      <div className="bg-ws-band px-3.5 md:px-4 xl:px-5 py-2 flex flex-wrap items-center gap-3.5">
        <span className="font-mono text-[10px] text-ws-light break-all">{prov.scope} · $ {prov.command}</span>
        {scenarioProvenance?.dataset && (
          <>
            <span className="flex-1 min-w-2" />
            <span className="font-mono text-[10px] text-ws-mid">{t('systemVerification.scenarioDataset', { value: scenarioProvenance.dataset })}</span>
          </>
        )}
      </div>
    </div>
  );
};
