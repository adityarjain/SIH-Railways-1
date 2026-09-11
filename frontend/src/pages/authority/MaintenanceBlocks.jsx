import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
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
        <h2 className="t-section-title">Maintenance Blocks</h2>
        <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
          Every block possession committed by the optimizer, the workload shape across the
          horizon, and the possessions shared between departments.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Panel><PanelBody><Metric label="Possessions" value={scheduledTasks.length} scope="Demo scenario" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="Block windows used" value={uniqueBlocks} sub="chained 120-min blocks" scope="Demo scenario" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="Night possessions" value={nightCount} tone="info" scope="Demo scenario" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="Bundled tasks" value={bundledCount} tone="bundle" scope="Demo scenario" /></PanelBody></Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Possession register"
          scope={`${rows.length} of ${scheduledTasks.length} possessions`}
          action={
            <div className="flex items-stretch border border-line">
              {[['register', 'Register'], ['weekly', 'Weekly'], ['monthly', 'Monthly']].map(([id, label]) => (
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
                placeholder="Search task, block, section, type…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-w-[240px] flex-1"
              />
              <Select label="Date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                <option value="ALL">All dates</option>
                {dates.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Select>
            </PanelBody>
            <DataTable
              getKey={(t) => t.task_id}
              onRowClick={() => onNavigate && onNavigate('block-planning')}
              columns={[
                { key: 'block_ids', header: 'Block window', render: (t) => (
                  <span className="font-mono text-[11px] font-semibold">{(t.block_ids || []).join(' + ')}</span>
                ) },
                { key: 'date', header: 'Date', render: (t) => <span className="font-mono text-[11px]">{t.date}</span> },
                { key: 'window', header: 'Time', render: (t) => (
                  <span className="font-mono text-[11px]">{minToHhmm(t.start_minute)}–{minToHhmm(t.end_minute)}</span>
                ) },
                { key: 'section_id', header: 'Section', render: (t) => <span className="font-mono text-[11px]">{t.section_id}</span> },
                { key: 'task_id', header: 'Task', render: (t) => <span className="t-mono-id">{t.task_id}</span> },
                { key: 'maintenance_type', header: 'Type', render: (t) => <span className="text-[11px]">{t.maintenance_type}</span> },
                { key: 'assigned_teams', header: 'Crew', render: (t) => (
                  <span className="font-mono text-[10px]">{(t.assigned_teams || []).join(', ') || '—'}</span>
                ) },
                { key: 'flags', header: 'Flags', align: 'right', render: (t) => (
                  <span className="inline-flex gap-1 justify-end">
                    {t.is_night && <StatusBadge tone="info" size="sm">night</StatusBadge>}
                    {t.is_bundled && <StatusBadge tone="bundle" size="sm">bundled</StatusBadge>}
                    {bandOf(t) === 'CRITICAL' && <StatusBadge tone="critical" size="sm">critical</StatusBadge>}
                  </span>
                ) },
              ]}
              rows={rows}
              empty={<EmptyState title="No possession matches the current filters." />}
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

      <Alert tone="idle" title="No bundling saving is reported">
        Measuring one requires an unbundled counterfactual plan, which this project does not
        produce. The overlap minutes and the rule minimum are shown instead, because those are
        measured.
      </Alert>

      <ScopeCaption className="block">
        Register scope: {metrics.provenance?.description || 'demo scenario'}
      </ScopeCaption>
    </div>
  );
};
