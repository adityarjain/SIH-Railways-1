import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
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
  const { t: tx } = useI18n();
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
        <h2 className="t-section-title">{tx('ground.issuesTitle')}</h2>
        <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
          {tx('ground.issuesSubtitle')}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Panel><PanelBody><Metric label={tx('ground.openIssues')} value={flagged.length} tone={flagged.length ? 'warn' : 'ok'} scope={tx('scope.thisSession')} /></PanelBody></Panel>
        <Panel><PanelBody><Metric label={tx('ground.rescheduleRequests')} value={flagged.filter((t) => (t.status || '').startsWith('Reschedule')).length} scope={tx('scope.thisSession')} /></PanelBody></Panel>
        <Panel><PanelBody><Metric label={tx('ground.rejectedCount')} value={flagged.filter((t) => (t.status || '').startsWith('Rejected')).length} tone="critical" scope={tx('scope.thisSession')} /></PanelBody></Panel>
        <Panel><PanelBody><Metric label={tx('ground.assignedWork')} value={deptTasks.length} scope={selectedDept} /></PanelBody></Panel>
      </div>

      <Panel>
        <PanelHeader
          title={tx('ground.flaggedWork')}
          scope={flagged.length === 1 ? tx('ground.flaggedScope', { count: flagged.length }) : tx('ground.flaggedScopePlural', { count: flagged.length })}
        />
        {flagged.length === 0 ? (
          <EmptyState title={tx('ground.noIssues')}>
            {tx('ground.noIssuesBody')}
          </EmptyState>
        ) : (
          <DataTable
            getKey={(t) => t.task_id}
            columns={[
              { key: 'task_id', header: tx('common.task'), render: (t) => <span className="t-mono-id">{t.task_id}</span> },
              { key: 'maintenance_type', header: tx('common.type'), render: (t) => <span className="text-[11px]">{t.maintenance_type}</span> },
              { key: 'section_id', header: tx('common.section'), render: (t) => <span className="font-mono text-[11px]">{t.section_id}</span> },
              { key: 'window', header: tx('common.window'), render: (t) => (
                <span className="font-mono text-[11px]">
                  {t.start_minute != null ? `${minToHhmm(t.start_minute)}–${minToHhmm(t.end_minute)}` : '—'}
                </span>
              ) },
              { key: 'reason', header: tx('ground.crewNote'), render: (t) => (
                <span className="text-[11px] text-rail-600">{t.statusMeta?.reason || '—'}</span>
              ) },
              { key: 'status', header: tx('common.status'), align: 'right', render: (t) => (
                <StatusBadge tone={statusTone(t.status)} size="sm">{t.status}</StatusBadge>
              ) },
            ]}
            rows={flagged}
          />
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title={tx('ground.reportAnIssue')}
          scope={tx('ground.reportScope')}
        />
        {reportable.length === 0 ? (
          <EmptyState title={tx('ground.noActivePossession')} />
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
                <Button size="md" variant="warn" onClick={() => setTarget(t)}>{tx('taskAction.issueConfirm')}</Button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Alert tone="idle" title={tx('ground.sessionOnlyTitle')}>
        {tx('ground.issuesSessionBody')}
        <Button size="sm" variant="ghost" className="ml-2" onClick={() => onNavigate && onNavigate('my-tasks')}>
          {tx('ground.backToWork')}
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
