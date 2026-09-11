import React, { useMemo } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
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
  const { t: tx } = useI18n();

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
        <h2 className="t-section-title">{tx('ground.blockStatusTitle')}</h2>
        <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
          {tx('ground.blockStatusSubtitle', { dept: selectedDept })}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Panel><PanelBody><Metric label={tx('ground.possessions')} value={rows.length} scope={tx('scope.yourDepartment')} /></PanelBody></Panel>
        <Panel><PanelBody><Metric label={tx('ground.nightWindows')} value={nightCount} tone="info" scope={tx('scope.yourDepartment')} /></PanelBody></Panel>
        <Panel><PanelBody><Metric label={tx('common.sections')} value={new Set(rows.map((t) => t.section_id)).size} scope={tx('scope.yourDepartment')} /></PanelBody></Panel>
        <Panel><PanelBody><Metric label={tx('ground.inProgressCount')} value={rows.filter((t) => t.status === 'In Progress').length} tone="info" scope={tx('scope.thisSession')} /></PanelBody></Panel>
      </div>

      <Panel>
        <PanelHeader title={tx('ground.allocated')} scope={tx('ground.allocatedScope', { count: rows.length })} />
        <DataTable
          getKey={(t) => t.task_id}
          columns={[
            { key: 'block_ids', header: tx('common.block'), render: (t) => (
              <span className="font-mono text-[11px] font-semibold">{(t.block_ids || []).join(' + ')}</span>
            ) },
            { key: 'scheduled_date', header: tx('common.date'), render: (t) => (
              <span className="font-mono text-[11px]">{t.scheduled_date || '—'}</span>
            ) },
            { key: 'window', header: tx('common.window'), render: (t) => (
              <span className="font-mono text-[11px]">
                {t.start_minute != null ? `${minToHhmm(t.start_minute)}–${minToHhmm(t.end_minute)}` : '—'}
              </span>
            ) },
            { key: 'section_id', header: tx('common.section'), render: (t) => (
              <span>
                <span className="font-mono text-[11px]">{t.section_id}</span>
                <span className="block text-[9px] text-rail-400">{SECTION[t.section_id]?.section_name}</span>
              </span>
            ) },
            { key: 'task_id', header: tx('common.task'), render: (t) => <span className="t-mono-id">{t.task_id}</span> },
            { key: 'status', header: tx('common.status'), align: 'right', render: (t) => (
              <StatusBadge tone={statusTone(t.status)} size="sm">{t.status || tx('status.scheduled')}</StatusBadge>
            ) },
          ]}
          rows={rows}
          empty={<EmptyState title={tx('ground.noAllocated')} />}
        />
      </Panel>

      <Panel>
        <PanelHeader title={tx('ground.trainMovements')} scope={tx('ground.trainMovementsScope')} />
        {sectionDates.length === 0 ? (
          <EmptyState title={tx('ground.noScheduledSection')} />
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
                      {trains.length === 1
                        ? tx('ground.movementCount', { count: trains.length })
                        : tx('ground.movementCountPlural', { count: trains.length })}
                    </span>
                  </div>
                  {trains.length === 0 ? (
                    <div className="text-[10px] text-rail-400 mt-1">
                      {tx('ground.noTrainRecords')}
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

      <Alert tone="idle" title={tx('ground.contextTitle')}>
        {tx('ground.contextBody')}
      </Alert>

      <ScopeCaption className="block">
        {tx('ground.trainDataScope', {
          records: sectionTrains.provenance?.records_emitted,
          source: sectionTrains.provenance?.source_rows?.toLocaleString(),
        })}
      </ScopeCaption>
    </div>
  );
};
