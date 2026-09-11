import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
import {
  Panel, PanelHeader, StatusBadge, Button, Alert, EmptyState,
} from '../../components/ui';
import { TaskActionModal } from '../../components/maintenance/TaskActionModal';
import {
  WorkOrderHeader, WorkOrderFacts, BlockStatusBanner, SectionContext,
  OperationalGaps, ActionBar, statusTone,
} from '../../components/ground/WorkOrder';
import { minToHhmm } from '../../utils/time';
import { bandOf, bandTone } from '../../utils/risk';

const ACTION_STATUS = {
  in_progress: 'In Progress',
  completed: 'Completed',
  pause: 'Paused',
  issue: 'Issue Reported',
  handoff: 'Completed',
};

const ISSUE_STATUSES = new Set(['Issue Reported', 'Paused', 'Rejected by Field Crew']);

/**
 * Ground landing — "Today's Tasks".
 *
 * One question, answered above the fold: what am I doing next, where, when, and
 * is the block ready. Everything else is secondary. No network analytics, no
 * optimizer internals.
 */
export const MaintDashboard = ({ onNavigate }) => {
  const { tasksInventory, updateTaskStatus, completedWork } = usePlan();
  const { selectedDept } = useAuth();
  const [action, setAction] = useState(null);

  const deptTasks = useMemo(
    () => tasksInventory.filter((t) => t.department === selectedDept),
    [tasksInventory, selectedDept],
  );

  const scheduled = useMemo(
    () => deptTasks
      .filter((t) => t.scheduled_date && (t.block_ids || []).length)
      .sort((a, b) =>
        a.scheduled_date.localeCompare(b.scheduled_date) || (a.start_minute ?? 0) - (b.start_minute ?? 0)),
    [deptTasks],
  );

  // In-progress work is what you are doing; otherwise the earliest possession.
  const next = useMemo(
    () => scheduled.find((t) => t.status === 'In Progress') || scheduled[0] || null,
    [scheduled],
  );

  const later = useMemo(
    () => scheduled.filter((t) => t.task_id !== next?.task_id).slice(0, 5),
    [scheduled, next],
  );

  const counts = useMemo(() => ({
    assigned: deptTasks.length,
    scheduled: scheduled.length,
    active: deptTasks.filter((t) => t.status === 'In Progress').length,
    issues: deptTasks.filter((t) => t.status && ISSUE_STATUSES.has(t.status)).length,
    completed: completedWork.filter((j) => j.department === selectedDept).length,
  }), [deptTasks, scheduled, completedWork, selectedDept]);

  const handleSubmit = (taskId, actionType, reason, proposedDate) => {
    updateTaskStatus(taskId, ACTION_STATUS[actionType] || 'Accepted', reason, proposedDate);
    setAction(null);
  };

  const today = next?.scheduled_date;

  return (
    <div className="space-y-4">
      {/* today line */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="t-label">Today</div>
          <div className="text-[17px] font-semibold text-rail-900 mt-0.5">
            {today || 'No possession scheduled'}
          </div>
          <div className="text-xs text-rail-500 mt-0.5">{selectedDept}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1.5 bg-status-info-tint border border-status-info text-[10px] font-semibold text-status-info tracking-wide">
            {counts.scheduled} SCHEDULED
          </span>
          {counts.issues > 0 && (
            <button
              onClick={() => onNavigate && onNavigate('issues')}
              className="px-2.5 py-1.5 bg-status-warn-tint border border-status-warn text-[10px] font-semibold text-status-warn tracking-wide"
            >
              {counts.issues} ISSUE{counts.issues === 1 ? '' : 'S'}
            </button>
          )}
        </div>
      </div>

      {/* NEXT TASK — the dominant element */}
      {!next ? (
        <Panel>
          <PanelHeader title="Next task" scope={selectedDept} />
          <EmptyState title="No possession is assigned to your department.">
            Work appears here once the optimizer places a task from your department into a block
            possession.
          </EmptyState>
        </Panel>
      ) : (
        <Panel className="border-l-4 border-l-status-info overflow-hidden">
          <div className="px-4 pt-3">
            <StatusBadge tone={next.status === 'In Progress' ? 'info' : 'ok'} size="sm">
              {next.status === 'In Progress' ? 'IN PROGRESS' : 'NEXT TASK'}
            </StatusBadge>
          </div>
          <WorkOrderHeader task={next} status={next.status} />
          <WorkOrderFacts task={next} />
          <BlockStatusBanner task={next} status={next.status} />
          <ActionBar status={next.status} onAction={(a) => setAction(a)} />
        </Panel>
      )}

      {/* status row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Assigned work', counts.assigned, 'my-tasks', 'idle'],
          ['Active now', counts.active, 'active-block', counts.active ? 'info' : 'idle'],
          ['Issues', counts.issues, 'issues', counts.issues ? 'warn' : 'idle'],
          ['Completed', counts.completed, 'completed', 'ok'],
        ].map(([label, value, go, tone]) => (
          <button
            key={label}
            onClick={() => onNavigate && onNavigate(go)}
            className="bg-surface-panel border border-line rounded-lg px-3 py-3 text-left hover:border-line-strong hover:bg-surface-sunken transition-colors min-h-touch"
          >
            <div className="t-label">{label}</div>
            <div className={`font-mono text-2xl font-semibold mt-1 ${
              tone === 'warn' ? 'text-status-warn' : tone === 'info' ? 'text-status-info'
                : tone === 'ok' ? 'text-status-ok' : 'text-rail-900'
            }`}>
              {value}
            </div>
          </button>
        ))}
      </div>

      {next && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionContext task={next} />
          <OperationalGaps />
        </div>
      )}

      {/* later today */}
      <Panel>
        <PanelHeader title="Later" scope={`${later.length} further possession${later.length === 1 ? '' : 's'}`} />
        {later.length === 0 ? (
          <EmptyState title="Nothing else scheduled for your department." />
        ) : (
          <div className="divide-y divide-line">
            {later.map((t) => {
              const band = bandOf(t);
              return (
                <button
                  key={t.task_id}
                  onClick={() => onNavigate && onNavigate('my-tasks')}
                  className="w-full text-left px-3 py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-surface-sunken transition-colors min-h-touch"
                >
                  <span className="min-w-0">
                    <span className="font-mono text-[13px] font-semibold text-rail-900">{t.task_id}</span>
                    <span className="block text-[11px] text-rail-500 mt-0.5">
                      {t.maintenance_type} · {t.section_id}
                    </span>
                  </span>
                  <span className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-[12px] text-rail-900">
                      {t.start_minute != null ? `${minToHhmm(t.start_minute)} → ${minToHhmm(t.end_minute)}` : '—'}
                    </span>
                    {band && <StatusBadge tone={bandTone(band)} size="sm">{band} {t.risk_score?.toFixed?.(1)}</StatusBadge>}
                    {t.status && <StatusBadge tone={statusTone(t.status)} size="sm">{t.status}</StatusBadge>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      <Alert tone="idle" title="Session state only">
        Status changes are held in the browser for this session. Nothing is written to an external
        register and no notification is sent.
        <Button size="sm" variant="ghost" className="ml-2" onClick={() => onNavigate && onNavigate('my-tasks')}>
          View all assigned work
        </Button>
      </Alert>

      <TaskActionModal
        isOpen={Boolean(action)}
        onClose={() => setAction(null)}
        task={next}
        actionType={action}
        onSubmit={handleSubmit}
      />
    </div>
  );
};
