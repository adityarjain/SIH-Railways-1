import React, { useMemo } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
import {
  Panel, PanelHeader, PanelBody, DataTable, StatusBadge, Metric,
  EmptyState, Alert, ScopeCaption,
} from '../../components/ui';
import { minToHhmm } from '../../utils/time';
import { statusTone } from '../../components/ground/WorkOrder';
import sectionTrains from '../../data/section_trains.json';
import corridors from '../../data/corridors_sections.json';

const SECTION = Object.fromEntries(corridors.sections.map((s) => [s.section_id, s]));

/**
 * Possession state for the sections this crew works, with the train movements
 * projected for the same section and date. Read-only: the crew executes blocks,
 * it does not plan them.
 */
export const BlockStatus = () => {
  const { tasksInventory } = usePlan();
  const { selectedDept } = useAuth();

  const rows = useMemo(
    () =>
      tasksInventory
        .filter((t) => t.department === selectedDept && (t.block_ids || []).length)
        .sort((a, b) =>
          (a.scheduled_date || '').localeCompare(b.scheduled_date || '') ||
          (a.start_minute ?? 0) - (b.start_minute ?? 0),
        ),
    [tasksInventory, selectedDept],
  );

  const sectionDates = useMemo(() => {
    const seen = new Map();
    for (const t of rows) {
      if (!t.scheduled_date) continue;
      const key = `${t.section_id}|${t.scheduled_date}`;
      if (!seen.has(key)) seen.set(key, { section: t.section_id, date: t.scheduled_date });
    }
    return [...seen.values()];
  }, [rows]);

  const nightCount = rows.filter((t) => t.is_night).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="t-section-title">Block Status</h2>
        <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
          Possessions allocated to {selectedDept}, and the train movements recorded on the same
          sections.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Panel><PanelBody><Metric label="Possessions" value={rows.length} scope="Your department" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="Night windows" value={nightCount} tone="info" scope="Your department" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="Sections" value={new Set(rows.map((t) => t.section_id)).size} scope="Your department" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="In progress" value={rows.filter((t) => t.status === 'In Progress').length} tone="info" scope="This session" /></PanelBody></Panel>
      </div>

      <Panel>
        <PanelHeader title="Allocated possessions" scope={`${rows.length} block windows`} />
        <DataTable
          getKey={(t) => t.task_id}
          columns={[
            { key: 'block_ids', header: 'Block', render: (t) => (
              <span className="font-mono text-[11px] font-semibold">{(t.block_ids || []).join(' + ')}</span>
            ) },
            { key: 'scheduled_date', header: 'Date', render: (t) => (
              <span className="font-mono text-[11px]">{t.scheduled_date || '—'}</span>
            ) },
            { key: 'window', header: 'Window', render: (t) => (
              <span className="font-mono text-[11px]">
                {t.start_minute != null ? `${minToHhmm(t.start_minute)}–${minToHhmm(t.end_minute)}` : '—'}
              </span>
            ) },
            { key: 'section_id', header: 'Section', render: (t) => (
              <span>
                <span className="font-mono text-[11px]">{t.section_id}</span>
                <span className="block text-[9px] text-rail-400">{SECTION[t.section_id]?.section_name}</span>
              </span>
            ) },
            { key: 'task_id', header: 'Task', render: (t) => <span className="t-mono-id">{t.task_id}</span> },
            { key: 'status', header: 'Status', align: 'right', render: (t) => (
              <StatusBadge tone={statusTone(t.status)} size="sm">{t.status || 'Scheduled'}</StatusBadge>
            ) },
          ]}
          rows={rows}
          empty={<EmptyState title="No block possession is allocated to your department yet." />}
        />
      </Panel>

      <Panel>
        <PanelHeader title="Train movements on your sections" scope="Projected verbatim from trains.csv" />
        {sectionDates.length === 0 ? (
          <EmptyState title="No scheduled possession, so no section to report movements for." />
        ) : (
          <div className="divide-y divide-line">
            {sectionDates.map(({ section, date }) => {
              const trains = sectionTrains.sections?.[section]?.[date] || [];
              return (
                <div key={`${section}-${date}`} className="px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[11px] font-semibold text-rail-900">
                      {section} · {date}
                    </span>
                    <span className="font-mono text-[10px] text-rail-400">
                      {trains.length} movement{trains.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  {trains.length === 0 ? (
                    <div className="text-[10px] text-rail-400 mt-1">
                      No train timing records available for this section/date.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {trains.map((tr) => (
                        <span
                          key={`${tr.train_id}-${tr.arrival_minute}`}
                          className="font-mono text-[10px] px-1.5 py-0.5 bg-surface-sunken border border-line text-rail-600"
                          title={tr.train_type || ''}
                        >
                          {tr.train_id} {minToHhmm(tr.arrival_minute)}–{minToHhmm(tr.departure_minute)}
                          {tr.priority_class === 1 ? ' ·P1' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Alert tone="idle" title="Movements are context, not clearance">
        These are the train records the planner scheduled around. They are not a live signalling
        feed, and they do not constitute authority to occupy the track.
      </Alert>

      <ScopeCaption className="block">
        Train data: {sectionTrains.provenance?.records_emitted} records projected from{' '}
        {sectionTrains.provenance?.source_rows?.toLocaleString()} source rows.
      </ScopeCaption>
    </div>
  );
};
