import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
import { Pill } from '../../components/ui/worksheet';
import { TaskActionModal } from '../../components/maintenance/TaskActionModal';
import {
  WorkOrderHeader, WorkOrderFacts, BlockStatusBanner, SectionContext,
  OperationalGaps, ActionBar, statusTone,
} from '../../components/ground/WorkOrder';
import { minToHhmm } from '../../utils/time';
import { bandOf, bandTone } from '../../utils/risk';
import { TODAY } from '../../utils/dateShift';

const ACTION_STATUS = {
  in_progress: 'In Progress',
  completed: 'Completed',
  pause: 'Paused',
  issue: 'Issue Reported',
  handoff: 'Completed',
};

const ISSUE_STATUSES = new Set(['Issue Reported', 'Paused', 'Rejected by Field Crew']);
const RISK_PILL = { critical: 'critical', warn: 'warn', info: 'info', ok: 'ok', idle: 'idle' };

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

  const next = useMemo(
    () => scheduled.find((t) => t.status === 'In Progress')
      || scheduled.find((t) => t.scheduled_date >= TODAY)
      || scheduled[0]
      || null,
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

  // The real live date, not the date of whichever task happens to be next --
  // those can differ (e.g. nothing left scheduled today, next is tomorrow).
  const today = TODAY;

  return (
    <div className="space-y-4">
      {/* today line */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-display text-[11px] font-semibold text-ws-light">Today</div>
          <div className="text-[17px] font-semibold text-ws-ink mt-0.5">{today}</div>
          <div className="font-ws text-xs text-ws-mid mt-0.5">{selectedDept}</div>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone="info">{counts.scheduled} SCHEDULED</Pill>
          {counts.issues > 0 && (
            <button onClick={() => onNavigate && onNavigate('issues')}>
              <Pill tone="warn">{counts.issues} ISSUE{counts.issues === 1 ? '' : 'S'}</Pill>
            </button>
          )}
        </div>
      </div>

      {/* NEXT TASK — the dominant element */}
      {!next ? (
        <div className="border border-ws-rule bg-ws-surface">
          <div className="px-3 py-2 bg-ws-tick border-b border-ws-rule">
            <span className="font-display text-[11px] font-semibold text-ws-light">Next task</span>
            <span className="font-mono text-[10px] text-ws-light block mt-0.5">{selectedDept}</span>
          </div>
          <div className="px-4 py-6 text-center">
            <div className="font-ws text-xs font-semibold text-ws-mid">No possession is assigned to your department.</div>
            <div className="font-ws text-[11px] text-ws-light mt-1">Work appears here once the optimizer places a task from your department into a block possession.</div>
          </div>
        </div>
      ) : (
        <div className="border border-ws-rule border-l-4 border-l-ws-info bg-ws-surface overflow-hidden">
          <div className="px-4 pt-3">
            <Pill tone={next.status === 'In Progress' ? 'info' : 'ok'}>{next.status === 'In Progress' ? 'IN PROGRESS' : 'NEXT TASK'}</Pill>
          </div>
          <WorkOrderHeader task={next} status={next.status} />
          <WorkOrderFacts task={next} />
          <BlockStatusBanner task={next} status={next.status} />
          <ActionBar status={next.status} onAction={(a) => setAction(a)} />
        </div>
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
            className="bg-ws-surface border border-ws-rule px-3 py-3 text-left hover:border-ws-mid hover:bg-ws-paper transition-colors min-h-touch"
          >
            <div className="font-display text-[11px] font-semibold text-ws-light">{label}</div>
            <div className={`font-mono text-2xl font-semibold mt-1 ${
              tone === 'warn' ? 'text-ws-warn' : tone === 'info' ? 'text-ws-info' : tone === 'ok' ? 'text-ws-ok' : 'text-ws-ink'
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
      <div className="border border-ws-rule bg-ws-surface">
        <div className="px-3 py-2 bg-ws-tick border-b border-ws-rule">
          <span className="font-display text-[11px] font-semibold text-ws-light">Later</span>
          <span className="font-mono text-[10px] text-ws-light block mt-0.5">{later.length} further possession{later.length === 1 ? '' : 's'}</span>
        </div>
        {later.length === 0 ? (
          <div className="px-4 py-6 text-center font-ws text-xs font-semibold text-ws-mid">Nothing else scheduled for your department.</div>
        ) : (
          <div>
            {later.map((t) => {
              const band = bandOf(t);
              return (
                <button
                  key={t.task_id}
                  onClick={() => onNavigate && onNavigate('my-tasks')}
                  className="w-full text-left px-3 py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-ws-paper transition-colors min-h-touch border-b border-ws-hairline last:border-b-0"
                >
                  <span className="min-w-0">
                    <span className="font-mono text-[13px] font-semibold text-ws-ink">{t.task_id}</span>
                    <span className="block font-ws text-[11px] text-ws-mid mt-0.5">{t.maintenance_type} · {t.section_id}</span>
                  </span>
                  <span className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-[12px] text-ws-ink">
                      {t.start_minute != null ? `${minToHhmm(t.start_minute)} → ${minToHhmm(t.end_minute)}` : '—'}
                    </span>
                    {band && <Pill tone={RISK_PILL[bandTone(band)] || 'idle'} size="sm">{band} {t.risk_score?.toFixed?.(1)}</Pill>}
                    {t.status && <Pill tone={RISK_PILL[statusTone(t.status)] || 'idle'} size="sm">{t.status}</Pill>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-l-[3px] border-l-ws-idle bg-ws-paper px-3 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="font-display text-[11px] font-bold text-ws-idle">Session state only</div>
          <div className="font-ws text-xs text-ws-body leading-relaxed mt-1">Status changes are held in the browser for this session. Nothing is written to an external register and no notification is sent.</div>
        </div>
        <button onClick={() => onNavigate && onNavigate('my-tasks')} className="font-display text-[11px] font-bold text-ws-mid hover:text-ws-ink shrink-0">
          View all assigned work
        </button>
      </div>

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
