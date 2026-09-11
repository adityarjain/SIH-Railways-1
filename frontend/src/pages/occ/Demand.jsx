import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import {
  Panel, PanelHeader, PanelBody, Metric, DataTable, StatusBadge, Tabs,
  Select, TextInput, Button, EmptyState, Alert, ScopeCaption, ProvenanceNote,
} from '../../components/ui';
import { Drawer } from '../../components/common/Drawer';
import { minToHhmm } from '../../utils/time';
import { bandOf, bandTone, RISK_BANDS } from '../../utils/risk';

const DEPT_ALL = 'ALL';

/**
 * Authority — Risk & Tasks.
 *
 * The maintenance demand queue and the asset risk behind it. Two views over the
 * same inventory: task-centric for planning, asset-centric for risk.
 */
export const Demand = ({ onNavigate }) => {
  const { tasksInventory, baselineMetrics } = usePlan();
  const [tab, setTab] = useState('tasks');
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState(DEPT_ALL);
  const [risk, setRisk] = useState(DEPT_ALL);
  const [status, setStatus] = useState(DEPT_ALL);
  const [selected, setSelected] = useState(null);

  const departments = useMemo(
    () => [...new Set(tasksInventory.map((t) => t.department))].filter(Boolean).sort(),
    [tasksInventory],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasksInventory.filter((t) => {
      if (dept !== DEPT_ALL && t.department !== dept) return false;
      if (risk !== DEPT_ALL && bandOf(t) !== risk) return false;
      if (status !== DEPT_ALL && t.status !== status) return false;
      if (!q) return true;
      return (
        t.task_id.toLowerCase().includes(q) ||
        (t.asset_id || '').toLowerCase().includes(q) ||
        (t.section_id || '').toLowerCase().includes(q) ||
        (t.maintenance_type || '').toLowerCase().includes(q) ||
        (t.asset_type || '').toLowerCase().includes(q)
      );
    });
  }, [tasksInventory, query, dept, risk, status]);

  const bandCounts = useMemo(() => {
    const c = { CRITICAL: 0, HIGH: 0, MODERATE: 0, LOW: 0 };
    for (const t of filtered) {
      const b = bandOf(t);
      if (b && c[b] != null) c[b] += 1;
    }
    return c;
  }, [filtered]);

  const statuses = useMemo(
    () => [...new Set(tasksInventory.map((t) => t.status).filter(Boolean))].sort(),
    [tasksInventory],
  );

  const clearable = query || dept !== DEPT_ALL || risk !== DEPT_ALL || status !== DEPT_ALL;
  const clear = () => { setQuery(''); setDept(DEPT_ALL); setRisk(DEPT_ALL); setStatus(DEPT_ALL); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="t-section-title">Risk &amp; Tasks</h2>
          <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
            Maintenance demand across the four engineering departments, prioritized by predicted
            asset failure risk.
          </p>
        </div>
        <ScopeCaption>
          {filtered.length} of {tasksInventory.length} shipped records · sample of the{' '}
          {baselineMetrics.summary.total_tasks_considered.toLocaleString()}-task inventory
        </ScopeCaption>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {RISK_BANDS.map((band) => (
          <Panel key={band}>
            <PanelBody>
              <Metric
                label={`${band} risk`}
                value={bandCounts[band]}
                tone={bandTone(band)}
                scope="Current filter"
              />
            </PanelBody>
          </Panel>
        ))}
      </div>

      <Panel>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: 'tasks', label: 'TASK QUEUE', count: filtered.length },
            { id: 'assets', label: 'ASSET RISK', count: filtered.length },
          ]}
        />

        <PanelBody className="border-b border-line flex flex-wrap items-center gap-2.5">
          <TextInput
            placeholder="Search task, asset, section, type…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-[240px] flex-1"
          />
          <Select label="Dept" value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value={DEPT_ALL}>All departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
          <Select label="Risk" value={risk} onChange={(e) => setRisk(e.target.value)}>
            <option value={DEPT_ALL}>All risk levels</option>
            <option value="CRITICAL">Critical (≥ 80)</option>
            <option value="HIGH">High (60–79)</option>
            <option value="MODERATE">Moderate (40–59)</option>
            <option value="LOW">Low (&lt; 40)</option>
          </Select>
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value={DEPT_ALL}>All statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          {clearable && <Button size="sm" variant="ghost" onClick={clear}>Clear</Button>}
        </PanelBody>

        {tab === 'tasks' ? (
          <DataTable
            getKey={(t) => t.task_id}
            onRowClick={setSelected}
            columns={[
              { key: 'task_id', header: 'Task', render: (t) => <span className="t-mono-id">{t.task_id}</span> },
              { key: 'maintenance_type', header: 'Type', render: (t) => <span className="text-[11px]">{t.maintenance_type}</span> },
              { key: 'department', header: 'Department', render: (t) => <span className="text-[11px] text-rail-600">{t.department}</span> },
              { key: 'section_id', header: 'Section', render: (t) => <span className="font-mono text-[11px]">{t.section_id}</span> },
              { key: 'task_date', header: 'Earliest', render: (t) => <span className="font-mono text-[11px]">{t.task_date}</span> },
              { key: 'deadline', header: 'Deadline', render: (t) => <span className="font-mono text-[11px]">{t.deadline}</span> },
              { key: 'risk_score', header: 'Risk', align: 'right', render: (t) => {
                const b = bandOf(t);
                return <StatusBadge tone={bandTone(b)} size="sm">{t.risk_score?.toFixed?.(1) ?? '—'}</StatusBadge>;
              } },
              { key: 'priority_score', header: 'Priority', align: 'right', render: (t) => (
                <span className="font-mono text-[11px]">{t.priority_score?.toFixed?.(1) ?? '—'}</span>
              ) },
              { key: 'required_duration_minutes', header: 'Duration', align: 'right', render: (t) => (
                <span className="font-mono text-[11px]">{t.required_duration_minutes}m</span>
              ) },
              { key: 'status', header: 'Status', align: 'right', render: (t) => (
                <StatusBadge tone={t.status === 'Scheduled' ? 'info' : t.status === 'Completed' ? 'ok' : 'idle'} size="sm">
                  {t.status || '—'}
                </StatusBadge>
              ) },
            ]}
            rows={filtered}
            empty={<EmptyState title="No task matches the current filters." />}
          />
        ) : (
          <DataTable
            getKey={(t) => `${t.asset_id}-${t.task_id}`}
            onRowClick={setSelected}
            columns={[
              { key: 'asset_id', header: 'Asset', render: (t) => (
                <span>
                  <span className="t-mono-id block">{t.asset_id}</span>
                  <span className="text-[10px] text-rail-400">{t.asset_type || '—'}</span>
                </span>
              ) },
              { key: 'section_id', header: 'Section', render: (t) => <span className="font-mono text-[11px]">{t.section_id}</span> },
              { key: 'department', header: 'Department', render: (t) => <span className="text-[11px] text-rail-600">{t.department}</span> },
              { key: 'risk_score', header: 'Risk score', align: 'right', render: (t) => (
                <span className="font-mono text-[11px] font-semibold">{t.risk_score?.toFixed?.(1) ?? '—'}</span>
              ) },
              { key: 'meter', header: 'Risk', render: (t) => {
                const v = Math.min(t.risk_score ?? 0, 100);
                const b = bandOf(t);
                const bg = b === 'CRITICAL' ? 'bg-status-critical' : b === 'HIGH' ? 'bg-status-warn'
                  : b === 'MODERATE' ? 'bg-status-info' : 'bg-status-ok';
                return (
                  <span className="block w-28 h-2.5 bg-surface-sunken border border-line-subtle relative">
                    <span className={`absolute inset-y-0 left-0 ${bg}`} style={{ width: `${v}%` }} />
                  </span>
                );
              } },
              { key: 'failure_probability_30d', header: '30-day failure', align: 'right', render: (t) => (
                <span className="font-mono text-[11px]">
                  {t.failure_probability_30d != null ? `${(t.failure_probability_30d * 100).toFixed(2)}%` : '—'}
                </span>
              ) },
              { key: 'forecast_30d_degradation', header: 'Degradation', align: 'right', render: (t) => (
                <span className="font-mono text-[11px]">
                  {t.forecast_30d_degradation != null ? t.forecast_30d_degradation.toFixed(1) : 'Not available'}
                </span>
              ) },
              { key: 'band', header: 'Band', align: 'right', render: (t) => {
                const b = bandOf(t);
                return <StatusBadge tone={bandTone(b)} size="sm">{b || '—'}</StatusBadge>;
              } },
            ]}
            rows={filtered}
            empty={<EmptyState title="No asset matches the current filters." />}
          />
        )}
      </Panel>

      <Alert tone="idle" title="A sample of the full inventory">
        This screen ships {tasksInventory.length} records so the browser is not sent all{' '}
        {baselineMetrics.summary.total_tasks_considered.toLocaleString()} tasks. Selection is a
        deterministic sort, never a random sample. Full-run figures are on the Overview and
        Performance screens.
      </Alert>

      {/* task / asset detail */}
      <Drawer
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.task_id} — ${selected.maintenance_type}` : ''}
        subtitle={selected ? `Asset ${selected.asset_id} · ${selected.section_id}` : ''}
      >
        {selected && (
          <>
            {selected.status === 'Scheduled' && (
              <Button
                variant="secondary"
                onClick={() => {
                  setSelected(null);
                  if (onNavigate) onNavigate('block-planning');
                }}
              >
                View in block planner
              </Button>
            )}

            {/* Predicted risk — every value is a column in the prediction artifact */}
            <div className="bg-rail-900 text-white p-4 border border-rail-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="t-label text-rail-300">Predicted failure risk</span>
                <StatusBadge tone={bandTone(bandOf(selected))} size="md">
                  {bandOf(selected) || '—'}
                </StatusBadge>
              </div>
              <div className="grid grid-cols-3 gap-px bg-rail-700 border border-rail-700">
                {[
                  ['Risk score', selected.risk_score != null ? selected.risk_score.toFixed(1) : '—', 'of 100'],
                  ['30-day failure prob.', selected.failure_probability_30d != null ? `${(selected.failure_probability_30d * 100).toFixed(2)}%` : '—', null],
                  ['30-day degradation', selected.forecast_30d_degradation != null ? selected.forecast_30d_degradation.toFixed(1) : 'Not available', null],
                ].map(([k, v, sub]) => (
                  <div key={k} className="bg-rail-800 p-2.5">
                    <span className="text-[9px] uppercase tracking-wide text-rail-400 block">{k}</span>
                    <span className="font-mono text-lg font-semibold text-white">{v}</span>
                    {sub && <span className="text-[9px] text-rail-400 block mt-0.5">{sub}</span>}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-rail-400 leading-relaxed">
                Source: neev_predictions_for_optimizer.csv. The model reports a risk score, a
                failure probability and a degradation forecast — it does not produce a diagnosis
                or a recommended action.
              </p>
            </div>

            <Panel>
              <PanelHeader title="Work order requirement" scope="maintenance_tasks.csv" />
              {[
                ['Department', selected.department],
                ['Asset type', selected.asset_type || 'Not recorded'],
                ['Duration required', `${selected.required_duration_minutes} min`],
                ['Crew required', selected.required_team_size],
                ['Earliest start', selected.task_date],
                ['Deadline', selected.deadline],
                ['Can bundle', selected.can_bundle ? 'Yes' : 'No'],
                ['Priority score', selected.priority_score?.toFixed?.(1) ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="px-3 py-2 border-b border-line last:border-b-0 flex items-center justify-between gap-3">
                  <span className="text-xs text-rail-600">{k}</span>
                  <span className="font-mono text-[11px] font-semibold text-rail-900">{v}</span>
                </div>
              ))}
            </Panel>

            {selected.scheduled_date && (
              <Panel>
                <PanelHeader title="Scheduled possession" scope="Demo scenario" />
                {[
                  ['Date', selected.scheduled_date],
                  ['Window', `${minToHhmm(selected.start_minute)}–${minToHhmm(selected.end_minute)}`],
                  ['Blocks', (selected.block_ids || []).join(' + ')],
                  ['Crew', (selected.assigned_teams || []).join(', ')],
                  ['Night window', selected.is_night ? 'Yes' : 'No'],
                ].map(([k, v]) => (
                  <div key={k} className="px-3 py-2 border-b border-line last:border-b-0 flex items-center justify-between gap-3">
                    <span className="text-xs text-rail-600">{k}</span>
                    <span className="font-mono text-[11px] font-semibold text-rail-900">{v}</span>
                  </div>
                ))}
              </Panel>
            )}

            <ProvenanceNote
              generatedBy="scripts/generate_tasks_inventory.py"
              command="PYTHONPATH=. python scripts/generate_tasks_inventory.py"
              dataset="Arnav_Optimizer_Clean_Dataset"
            />
          </>
        )}
      </Drawer>
    </div>
  );
};
