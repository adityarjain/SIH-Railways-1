import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
import {
  Panel, PanelHeader, PanelBody, Metric, StatusBadge, EmptyState,
  Alert, Button, DataTable,
} from '../../components/ui';
import { TaskActionModal } from '../../components/maintenance/TaskActionModal';
import { minToHhmm } from '../../utils/time';
import { statusTone } from '../../components/ground/WorkOrder';

/** Statuses that represent work the crew has flagged rather than progressed. */
const ISSUE_STATUSES = new Set(['Issue Reported', 'Paused', 'Rejected by Field Crew']);
const isIssue = (status) =>
  Boolean(status) && (ISSUE_STATUSES.has(status) || status.startsWith('Reschedule'));

/**
 * Work the crew has flagged: paused possessions, reported problems, reschedule
 * requests and rejections. Backed entirely by the status overrides the crew
 * itself has written this session — nothing is seeded.
 */
export const Issues = ({ onNavigate }) => {
  const { tasksInventory, updateTaskStatus } = usePlan();
  const { selectedDept } = useAuth();
  const [target, setTarget] = useState(null);

  const deptTasks = useMemo(
    () => tasksInventory.filter((t) => t.department === selectedDept),
    [tasksInventory, selectedDept],
  );

  const flagged = useMemo(
    () => deptTasks.filter((t) => isIssue(t.status)),
    [deptTasks],
  );

  const reportable = useMemo(
    () => deptTasks.filter((t) => (t.block_ids || []).length && !isIssue(t.status) && t.status !== 'Completed'),
    [deptTasks],
  );

  const handleSubmit = (taskId, actionType, reason, proposedDate) => {
    const status = actionType === 'reschedule' ? `Reschedule Requested (${proposedDate})` : 'Issue Reported';
    updateTaskStatus(taskId, status, reason, proposedDate);
    setTarget(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="t-section-title">Issues</h2>
        <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
          Work your crew has paused, flagged or asked to reschedule.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Panel><PanelBody><Metric label="Open issues" value={flagged.length} tone={flagged.length ? 'warn' : 'ok'} scope="This session" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="Reschedule requests" value={flagged.filter((t) => (t.status || '').startsWith('Reschedule')).length} scope="This session" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="Rejected" value={flagged.filter((t) => (t.status || '').startsWith('Rejected')).length} tone="critical" scope="This session" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="Assigned work" value={deptTasks.length} scope={selectedDept} /></PanelBody></Panel>
      </div>

      <Panel>
        <PanelHeader title="Flagged work" scope={`${flagged.length} record${flagged.length === 1 ? '' : 's'}`} />
        {flagged.length === 0 ? (
          <EmptyState title="No issues reported.">
            Reporting an issue from a work order records it here for the rest of this session.
          </EmptyState>
        ) : (
          <DataTable
            getKey={(t) => t.task_id}
            columns={[
              { key: 'task_id', header: 'Task', render: (t) => <span className="t-mono-id">{t.task_id}</span> },
              { key: 'maintenance_type', header: 'Type', render: (t) => <span className="text-[11px]">{t.maintenance_type}</span> },
              { key: 'section_id', header: 'Section', render: (t) => <span className="font-mono text-[11px]">{t.section_id}</span> },
              { key: 'window', header: 'Window', render: (t) => (
                <span className="font-mono text-[11px]">
                  {t.start_minute != null ? `${minToHhmm(t.start_minute)}–${minToHhmm(t.end_minute)}` : '—'}
                </span>
              ) },
              { key: 'reason', header: 'Crew note', render: (t) => (
                <span className="text-[11px] text-rail-600">{t.statusMeta?.reason || '—'}</span>
              ) },
              { key: 'status', header: 'Status', align: 'right', render: (t) => (
                <StatusBadge tone={statusTone(t.status)} size="sm">{t.status}</StatusBadge>
              ) },
            ]}
            rows={flagged}
          />
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title="Report an issue"
          scope="Possessions currently assigned to your crew"
        />
        {reportable.length === 0 ? (
          <EmptyState title="No active possession to report against." />
        ) : (
          <div className="divide-y divide-line">
            {reportable.map((t) => (
              <div key={t.task_id} className="px-3 py-2.5 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-[12px] font-semibold text-rail-900">{t.task_id}</div>
                  <div className="text-[11px] text-rail-500 mt-0.5">
                    {t.maintenance_type} · {t.section_id}
                    {t.start_minute != null && ` · ${minToHhmm(t.start_minute)}–${minToHhmm(t.end_minute)}`}
                  </div>
                </div>
                <Button size="md" variant="warn" onClick={() => setTarget(t)}>Report issue</Button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Alert tone="idle" title="Session state only">
        Issues are held in the browser for this session. No notification is sent, no external
        register is written, and no maintenance record is amended.
        <Button size="sm" variant="ghost" className="ml-2" onClick={() => onNavigate && onNavigate('my-tasks')}>
          Back to assigned work
        </Button>
      </Alert>

      <TaskActionModal
        isOpen={Boolean(target)}
        onClose={() => setTarget(null)}
        task={target}
        actionType="issue"
        onSubmit={handleSubmit}
      />
    </div>
  );
};
