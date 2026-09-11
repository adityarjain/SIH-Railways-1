import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
import {
  Panel, StatusBadge, Button, Alert, EmptyState, Select, TextInput,
} from '../../components/ui';
import { TaskActionModal } from '../../components/maintenance/TaskActionModal';
import { statusTone, SECTION } from '../../components/ground/WorkOrder';
import { minToHhmm } from '../../utils/time';
import { bandOf, bandTone } from '../../utils/risk';

const ACTION_STATUS = {
  accept: 'Accepted',
  in_progress: 'In Progress',
  completed: 'Completed',
  pause: 'Paused',
  issue: 'Issue Reported',
  reject: 'Rejected by Field Crew',
};

/**
 * Ground — Assigned Work.
 *
 * A stack of work orders, each actionable in place. Card-per-task rather than a
 * dense table: this is the surface a crew works from, not one a planner scans.
 */
export const MyTasks = ({ onNavigate }) => {
  const { tasksInventory, updateTaskStatus } = usePlan();
  const { selectedDept } = useAuth();
  const [modal, setModal] = useState(null); // { task, actionType }
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');

  const tasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasksInventory
      .filter((t) => t.department === selectedDept)
      .filter((t) => {
        if (filter === 'SCHEDULED') return Boolean(t.scheduled_date);
        if (filter === 'UNSCHEDULED') return !t.scheduled_date;
        if (filter === 'ACTIVE') return t.status === 'In Progress';
        if (filter === 'DONE') return t.status === 'Completed';
        return true;
      })
      .filter((t) => {
        if (!q) return true;
        return (
          t.task_id.toLowerCase().includes(q) ||
          t.section_id.toLowerCase().includes(q) ||
          (t.maintenance_type || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (Boolean(a.scheduled_date) !== Boolean(b.scheduled_date)) return a.scheduled_date ? -1 : 1;
        return (a.scheduled_date || '').localeCompare(b.scheduled_date || '')
          || (a.start_minute ?? 0) - (b.start_minute ?? 0);
      });
  }, [tasksInventory, selectedDept, query, filter]);

  const handleSubmit = (taskId, actionType, reason, proposedDate) => {
    const status = actionType === 'reschedule'
      ? `Reschedule Requested (${proposedDate})`
      : ACTION_STATUS[actionType] || 'Accepted';
    updateTaskStatus(taskId, status, reason, proposedDate);
    setModal(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="t-section-title">Assigned Work</h2>
          <p className="text-xs text-rail-500 mt-0.5">
            {selectedDept} · {tasks.length} work order{tasks.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TextInput
            placeholder="Search task, section, type…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-[200px]"
          />
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="ALL">All work</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="UNSCHEDULED">Not yet scheduled</option>
            <option value="ACTIVE">In progress</option>
            <option value="DONE">Completed</option>
          </Select>
        </div>
      </div>

      {tasks.length === 0 ? (
        <Panel>
          <EmptyState title="No work order matches the current filters." />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {tasks.map((t) => {
            const band = bandOf(t);
            const scheduled = Boolean(t.scheduled_date);
            const started = t.status === 'In Progress';
            const done = t.status === 'Completed';
            const sec = SECTION[t.section_id];

            return (
              <Panel key={t.task_id} className={`overflow-hidden ${started ? 'border-l-4 border-l-status-info' : ''}`}>
                <div className="px-3.5 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[15px] font-bold text-rail-900">{t.task_id}</div>
                    <div className="text-[12px] font-medium text-rail-900 mt-0.5">{t.maintenance_type}</div>
                    <div className="font-mono text-[10px] text-rail-400 mt-0.5">
                      {t.section_id}{sec ? ` · ${sec.section_name}` : ''} · asset {t.asset_id}
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    {band && (
                      <StatusBadge tone={bandTone(band)} size="sm">
                        {band} · {t.risk_score?.toFixed?.(1)}
                      </StatusBadge>
                    )}
                    <div><StatusBadge tone={statusTone(t.status)} size="sm">{t.status || 'Scheduled'}</StatusBadge></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-px bg-line border-y border-line">
                  <div className="bg-surface-panel px-3 py-2">
                    <div className="t-label">Window</div>
                    <div className={`font-mono text-[11px] mt-0.5 ${scheduled ? 'text-rail-900' : 'text-status-warn'}`}>
                      {scheduled ? `${minToHhmm(t.start_minute)}–${minToHhmm(t.end_minute)}` : 'Not scheduled'}
                    </div>
                    <div className="text-[9px] text-rail-400 mt-0.5">
                      {scheduled ? t.scheduled_date : `due ${t.deadline}`}
                    </div>
                  </div>
                  <div className="bg-surface-panel px-3 py-2">
                    <div className="t-label">Block</div>
                    <div className="font-mono text-[11px] text-rail-900 mt-0.5">
                      {(t.block_ids || []).join(' + ') || '—'}
                    </div>
                    <div className="text-[9px] text-rail-400 mt-0.5">
                      {t.required_duration_minutes} min
                    </div>
                  </div>
                  <div className="bg-surface-panel px-3 py-2">
                    <div className="t-label">Crew</div>
                    <div className="font-mono text-[11px] text-rail-900 mt-0.5">
                      {(t.assigned_teams || []).join(', ') || '—'}
                    </div>
                    <div className="text-[9px] text-rail-400 mt-0.5">
                      {t.required_team_size} required
                    </div>
                  </div>
                </div>

                {t.statusMeta?.reason && (
                  <div className="px-3.5 py-2 bg-status-warn-tint border-b border-line">
                    <span className="t-label text-status-warn">Crew note</span>
                    <p className="text-[11px] text-rail-700 mt-0.5">{t.statusMeta.reason}</p>
                  </div>
                )}

                <div className="px-3.5 py-2.5 flex flex-wrap gap-2">
                  {!scheduled ? (
                    <span className="text-[11px] text-rail-400 py-2">
                      Awaiting a block possession — no action available yet.
                    </span>
                  ) : done ? (
                    <span className="text-[11px] text-status-ok py-2 font-medium">
                      Completed — awaiting verification.
                    </span>
                  ) : (
                    <>
                      {!started && (
                        <Button size="md" variant="primary" onClick={() => setModal({ task: t, actionType: 'in_progress' })}>
                          Start work
                        </Button>
                      )}
                      {started && (
                        <>
                          <Button size="md" variant="secondary" onClick={() => setModal({ task: t, actionType: 'pause' })}>Pause</Button>
                          <Button size="md" variant="primary" onClick={() => setModal({ task: t, actionType: 'completed' })}>Complete</Button>
                        </>
                      )}
                      <Button size="md" variant="warn" onClick={() => setModal({ task: t, actionType: 'issue' })}>Report issue</Button>
                      <Button size="md" variant="secondary" onClick={() => setModal({ task: t, actionType: 'reschedule' })}>Reschedule</Button>
                    </>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      <Alert tone="idle" title="Session state only">
        Status changes are held in the browser for this session. Nothing is written to an external
        register and no notification is sent.
        <Button size="sm" variant="ghost" className="ml-2" onClick={() => onNavigate && onNavigate('completed')}>
          Completion / handoff
        </Button>
      </Alert>

      <TaskActionModal
        isOpen={Boolean(modal)}
        onClose={() => setModal(null)}
        task={modal?.task}
        actionType={modal?.actionType}
        onSubmit={handleSubmit}
      />
    </div>
  );
};
