import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import {
  Panel, PanelHeader, PanelBody, MetricRow, Metric, Alert, DataTable,
  StatusBadge, Select, EmptyState, ProvenanceNote,
} from '../../components/ui';
import { minToHhmm } from '../../utils/time';
import sectionTrains from '../../data/section_trains.json';
import decisionTrace from '../../data/decision_trace.json';
import corridors from '../../data/corridors_sections.json';

const SECTION_NAME = Object.fromEntries(
  corridors.sections.map((s) => [s.section_id, s.section_name]),
);

/**
 * How maintenance possessions sit against train movements.
 *
 * Everything here is projected occupancy from trains.csv or an impact figure the
 * decision trace already recorded. No delay is modelled and no conflict is
 * inferred from bar overlap.
 */
export const TrainImpact = ({ onNavigate }) => {
  const { scheduledTasks } = usePlan();

  const pairs = useMemo(() => {
    const out = [];
    for (const [section, byDate] of Object.entries(sectionTrains.sections || {})) {
      for (const date of Object.keys(byDate)) out.push(`${section}|${date}`);
    }
    return out.sort();
  }, []);

  const [pair, setPair] = useState(() => {
    const preferred = pairs.find((p) => p.startsWith('SEC-0004|2026-09-07'));
    return preferred || pairs[0] || '';
  });

  const [section, date] = pair.split('|');
  const trains = sectionTrains.sections?.[section]?.[date] || [];

  const possessions = useMemo(
    () => scheduledTasks.filter((t) => t.section_id === section && t.date === date),
    [scheduledTasks, section, date],
  );

  /**
   * A possession and a train are reported as *coincident* only in the plain
   * arithmetic sense of sharing minutes. That is a scheduling observation, not
   * a validated conflict: C002 conflicts are established by the optimizer's own
   * preprocessing, and the plan under view already satisfies them.
   */
  const coincident = useMemo(() => {
    const out = [];
    for (const p of possessions) {
      for (const tr of trains) {
        if (tr.arrival_minute < p.end_minute && tr.departure_minute > p.start_minute) {
          out.push({ possession: p, train: tr });
        }
      }
    }
    return out;
    // `trains` is a stable slice of the static section_trains import.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [possessions, section, date]);

  const impact = decisionTrace.train_impact || {};
  const traceMatches = decisionTrace.request?.section_id === section;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="t-section-title">Train Impact</h2>
          <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
            Train occupancy on a section, against the possessions planned there.
          </p>
        </div>
        <Select
          label="Section / date"
          value={pair}
          onChange={(e) => setPair(e.target.value)}
        >
          {pairs.map((p) => {
            const [s, d] = p.split('|');
            const n = sectionTrains.sections[s][d].length;
            return <option key={p} value={p}>{s} · {d} · {n} trains</option>;
          })}
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Panel><PanelBody><Metric label="Train movements" value={trains.length} sub={SECTION_NAME[section] || section} scope="trains.csv" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="Possessions planned" value={possessions.length} scope="Demo scenario" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="Coincident minutes" value={coincident.length} tone={coincident.length ? 'warn' : 'ok'} sub="possession/train pairs sharing minutes" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="Priority-1 services" value={trains.filter((t) => t.priority_class === 1).length} sub="never held" scope="trains.csv" /></PanelBody></Panel>
      </div>

      {traceMatches && (
        <Panel>
          <PanelHeader
            title="Recorded impact for the traced possession"
            scope={`${decisionTrace.request.task_id} · ${decisionTrace.selected?.window || ''}`}
          />
          <MetricRow label="Conflicting services" value={(impact.conflicting || []).length} tone={(impact.conflicting || []).length ? 'critical' : 'ok'} sub="must be zero for a valid plan (C002)" />
          <MetricRow label="Adjacent services" value={(impact.adjacent || []).length} tone="ok" sub={`within ±${impact.adjacency_buffer_minutes ?? 60} min — weighted by C008, not a conflict`} />
          <PanelBody className="border-t border-line">
            <p className="text-[10px] text-rail-500 leading-relaxed">{impact.note}</p>
          </PanelBody>
        </Panel>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel>
          <PanelHeader title="Train movements" scope={`${section} · ${date} · projected from trains.csv`} />
          {trains.length === 0 ? (
            <EmptyState title="No train timing records available for this section/date." />
          ) : (
            <DataTable
              getKey={(t) => `${t.train_id}-${t.arrival_minute}`}
              columns={[
                { key: 'train_id', header: 'Train', render: (t) => <span className="t-mono-id">{t.train_id}</span> },
                { key: 'train_type', header: 'Type', render: (t) => <span className="text-[11px]">{t.train_type || '—'}</span> },
                { key: 'window', header: 'Occupancy', render: (t) => (
                  <span className="font-mono text-[11px]">{minToHhmm(t.arrival_minute)}–{minToHhmm(t.departure_minute)}</span>
                ) },
                { key: 'priority_class', header: 'Priority', align: 'right', render: (t) => (
                  <StatusBadge tone={t.priority_class === 1 ? 'critical' : t.priority_class === 2 ? 'warn' : 'idle'} size="sm">
                    {t.priority_class ?? '—'}
                  </StatusBadge>
                ) },
                { key: 'load', header: 'Load', align: 'right', render: (t) => (
                  <span className="font-mono text-[11px]">{t.passenger_load_percent != null ? `${t.passenger_load_percent}%` : '—'}</span>
                ) },
              ]}
              rows={trains}
            />
          )}
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Possessions on this section" scope="Demo scenario" />
            {possessions.length === 0 ? (
              <EmptyState title="No possession planned here on this date." />
            ) : (
              <DataTable
                getKey={(p) => p.task_id}
                onRowClick={() => onNavigate && onNavigate('block-planning')}
                columns={[
                  { key: 'task_id', header: 'Task', render: (p) => <span className="t-mono-id">{p.task_id}</span> },
                  { key: 'maintenance_type', header: 'Type', render: (p) => <span className="text-[11px]">{p.maintenance_type}</span> },
                  { key: 'window', header: 'Window', render: (p) => (
                    <span className="font-mono text-[11px]">{minToHhmm(p.start_minute)}–{minToHhmm(p.end_minute)}</span>
                  ) },
                  { key: 'blocks', header: 'Blocks', align: 'right', render: (p) => (
                    <span className="font-mono text-[10px]">{(p.block_ids || []).join(' + ')}</span>
                  ) },
                ]}
                rows={possessions}
              />
            )}
          </Panel>

          {coincident.length > 0 ? (
            <Alert tone="warn" title={`${coincident.length} possession/train pair(s) share minutes`}>
              {coincident.slice(0, 4).map(({ possession, train }) => (
                <div key={`${possession.task_id}-${train.train_id}`} className="font-mono text-[10px] mt-0.5">
                  {possession.task_id} ∩ {train.train_id} · {minToHhmm(Math.max(possession.start_minute, train.arrival_minute))}–{minToHhmm(Math.min(possession.end_minute, train.departure_minute))}
                </div>
              ))}
              <div className="mt-1.5">
                This is arithmetic overlap on the rendered day, not a validated C002 conflict.
                Conflicts are established by the optimizer's preprocessing and by the replanning
                engine, and are the only thing the timeline hatches.
              </div>
            </Alert>
          ) : (
            <Alert tone="ok" title="No possession on this section shares minutes with a projected train">
              Which is what a plan satisfying C002 should look like.
            </Alert>
          )}

          <Alert tone="idle" title="Downstream impact is not implemented">
            trains.csv records one section occupancy per train with no onward itinerary, so
            knock-on delay cannot be derived and no figure is invented for it. Train sequencing
            is likewise not modelled.
          </Alert>
        </div>
      </div>

      <Panel>
        <PanelBody>
          <ProvenanceNote
            generatedBy={sectionTrains.provenance?.source}
            command={sectionTrains.provenance?.command}
            note={sectionTrains.provenance?.filter}
          />
        </PanelBody>
      </Panel>
    </div>
  );
};
