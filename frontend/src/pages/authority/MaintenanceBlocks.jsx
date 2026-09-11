import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import {
  Panel, PanelHeader, PanelBody, Metric, DataTable, StatusBadge,
  Select, TextInput, Alert, EmptyState, ScopeCaption,
} from '../../components/ui';
import { minToHhmm } from '../../utils/time';
import { bandOf } from '../../utils/risk';
import { BundlingView } from '../../components/timeline/BundlingView';
import { WeeklyView } from '../../components/planning/WeeklyView';
import { MonthlyHeatmap } from '../../components/planning/MonthlyHeatmap';

/**
 * The possession register: every block window the optimizer committed, plus the
 * workload shape across the horizon and the concurrent bundles.
 */
export const MaintenanceBlocks = ({ onNavigate }) => {
  const { scheduledTasks, metrics } = usePlan();
  const { t: tx } = useI18n();
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [view, setView] = useState('register');

  const dates = useMemo(
    () => [...new Set(scheduledTasks.map((t) => t.date))].sort(),
    [scheduledTasks],
  );

  /** One row per possession, expanding the chained block ids. */
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scheduledTasks
      .filter((t) => (dateFilter === 'ALL' ? true : t.date === dateFilter))
      .filter((t) => {
        if (!q) return true;
        return (
          t.task_id.toLowerCase().includes(q) ||
          t.section_id.toLowerCase().includes(q) ||
          (t.block_ids || []).some((b) => b.toLowerCase().includes(q)) ||
          (t.maintenance_type || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.date === b.date ? a.start_minute - b.start_minute : a.date.localeCompare(b.date)));
  }, [scheduledTasks, query, dateFilter]);

  const uniqueBlocks = useMemo(
    () => new Set(scheduledTasks.flatMap((t) => t.block_ids || [])).size,
    [scheduledTasks],
  );
  const nightCount = scheduledTasks.filter((t) => t.is_night).length;
  const bundledCount = scheduledTasks.filter((t) => t.is_bundled).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="t-section-title">{tx('maintenanceBlocks.title')}</h2>
        <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
          {tx('maintenanceBlocks.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Panel><PanelBody><Metric label={tx('maintenanceBlocks.possessions')} value={scheduledTasks.length} scope={tx('scope.demoScenario')} /></PanelBody></Panel>
        <Panel><PanelBody><Metric label={tx('maintenanceBlocks.blockWindowsUsed')} value={uniqueBlocks} sub={tx('maintenanceBlocks.blockWindowsSub')} scope={tx('scope.demoScenario')} /></PanelBody></Panel>
        <Panel><PanelBody><Metric label={tx('maintenanceBlocks.nightPossessions')} value={nightCount} tone="info" scope={tx('scope.demoScenario')} /></PanelBody></Panel>
        <Panel><PanelBody><Metric label={tx('maintenanceBlocks.bundledTasks')} value={bundledCount} tone="bundle" scope={tx('scope.demoScenario')} /></PanelBody></Panel>
      </div>

      <Panel>
        <PanelHeader
          title={tx('maintenanceBlocks.register')}
          scope={tx('maintenanceBlocks.registerScope', { shown: rows.length, total: scheduledTasks.length })}
          action={
            <div className="flex items-stretch border border-line">
              {[['register', tx('maintenanceBlocks.viewRegister')], ['weekly', tx('blockPlanning.viewWeekly')], ['monthly', tx('blockPlanning.viewMonthly')]].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                    view === id ? 'bg-rail-900 text-white' : 'text-rail-500 hover:bg-surface-sunken'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        />

        {view === 'register' && (
          <>
            <PanelBody className="border-b border-line flex flex-wrap items-center gap-2.5">
              <TextInput
                placeholder={tx('maintenanceBlocks.searchPlaceholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-w-[240px] flex-1"
              />
              <Select label={tx('common.date')} value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                <option value="ALL">{tx('common.allDates')}</option>
                {dates.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Select>
            </PanelBody>
            <DataTable
              getKey={(t) => t.task_id}
              onRowClick={() => onNavigate && onNavigate('block-planning')}
              columns={[
                { key: 'block_ids', header: tx('maintenanceBlocks.blockWindow'), render: (t) => (
                  <span className="font-mono text-[11px] font-semibold">{(t.block_ids || []).join(' + ')}</span>
                ) },
                { key: 'date', header: tx('common.date'), render: (t) => <span className="font-mono text-[11px]">{t.date}</span> },
                { key: 'window', header: tx('common.time'), render: (t) => (
                  <span className="font-mono text-[11px]">{minToHhmm(t.start_minute)}–{minToHhmm(t.end_minute)}</span>
                ) },
                { key: 'section_id', header: tx('common.section'), render: (t) => <span className="font-mono text-[11px]">{t.section_id}</span> },
                { key: 'task_id', header: tx('common.task'), render: (t) => <span className="t-mono-id">{t.task_id}</span> },
                { key: 'maintenance_type', header: tx('common.type'), render: (t) => <span className="text-[11px]">{t.maintenance_type}</span> },
                { key: 'assigned_teams', header: tx('common.crew'), render: (t) => (
                  <span className="font-mono text-[10px]">{(t.assigned_teams || []).join(', ') || '—'}</span>
                ) },
                { key: 'flags', header: tx('maintenanceBlocks.flags'), align: 'right', render: (t) => (
                  <span className="inline-flex gap-1 justify-end">
                    {t.is_night && <StatusBadge tone="info" size="sm">{tx('maintenanceBlocks.flagNight')}</StatusBadge>}
                    {t.is_bundled && <StatusBadge tone="bundle" size="sm">{tx('maintenanceBlocks.flagBundled')}</StatusBadge>}
                    {bandOf(t) === 'CRITICAL' && <StatusBadge tone="critical" size="sm">{tx('maintenanceBlocks.flagCritical')}</StatusBadge>}
                  </span>
                ) },
              ]}
              rows={rows}
              empty={<EmptyState title={tx('maintenanceBlocks.noPossessionMatch')} />}
            />
          </>
        )}

        {view === 'weekly' && (
          <PanelBody>
            <WeeklyView onSelectDate={(d) => { setDateFilter(d); setView('register'); }} />
          </PanelBody>
        )}
        {view === 'monthly' && (
          <PanelBody>
            <MonthlyHeatmap onSelectDate={(d) => { setDateFilter(d); setView('register'); }} />
          </PanelBody>
        )}
      </Panel>

      <BundlingView />

      <Alert tone="idle" title={tx('maintenanceBlocks.noSavingTitle')}>
        {tx('maintenanceBlocks.noSavingBody')}
      </Alert>

      <ScopeCaption className="block">
        {tx('maintenanceBlocks.registerScopeNote', { desc: metrics.provenance?.description || tx('scope.demoScenario').toLowerCase() })}
      </ScopeCaption>
    </div>
  );
};
