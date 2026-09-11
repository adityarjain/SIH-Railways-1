import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { Panel, PanelHeader, EmptyState, Alert, Button, StatusBadge } from '../../components/ui';
import { TaskActionModal } from '../../components/maintenance/TaskActionModal';
import {
  WorkOrderHeader, WorkOrderFacts, BlockStatusBanner, SectionContext,
  OperationalGaps, ActionBar,
} from '../../components/ground/WorkOrder';

const ACTION_STATUS = {
  in_progress: 'In Progress',
  completed: 'Completed',
  pause: 'Paused',
  issue: 'Issue Reported',
  handoff: 'Completed',
};

/**
 * The possession the crew is working right now, or the next one due.
 * A single work order occupies the screen — this is the execution surface.
 */
export const ActiveBlock = ({ onNavigate }) => {
  const { tasksInventory, updateTaskStatus } = usePlan();
  const { selectedDept } = useAuth();
  const { t: tx } = useI18n();
  const [action, setAction] = useState(null);

  const deptTasks = useMemo(
    () => tasksInventory.filter((t) => t.department === selectedDept),
    [tasksInventory, selectedDept],
  );

  /** In-progress work wins; otherwise the earliest scheduled possession. */
  const active = useMemo(() => {
    const started = deptTasks.find((t) => t.status === 'In Progress');
    if (started) return started;
    return deptTasks
      .filter((t) => t.scheduled_date && (t.block_ids || []).length)
      .sort((a, b) =>
        a.scheduled_date === b.scheduled_date
          ? (a.start_minute ?? 0) - (b.start_minute ?? 0)
          : a.scheduled_date.localeCompare(b.scheduled_date),
      )[0] || null;
  }, [deptTasks]);

  const handleSubmit = (taskId, actionType, reason, proposedDate) => {
    updateTaskStatus(taskId, ACTION_STATUS[actionType] || 'Accepted', reason, proposedDate);
    setAction(null);
  };

  if (!active) {
    return (
      <Panel>
        <PanelHeader title={tx('ground.activeBlockTitle')} scope={selectedDept} />
        <EmptyState title={tx('ground.noAssignment')}>
          {tx('ground.noAssignmentBody')}
        </EmptyState>
      </Panel>
    );
  }

  const isStarted = active.status === 'In Progress';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="t-section-title">{tx('ground.activeBlockTitle')}</h2>
          <p className="text-xs text-rail-500 mt-0.5">
            {isStarted ? tx('ground.activeBlockInProgress') : tx('ground.activeBlockNext')}
          </p>
        </div>
        <StatusBadge tone={isStarted ? 'info' : 'ok'} size="lg">
          {isStarted ? tx('status.inProgressCaps') : tx('status.readyToStart')}
        </StatusBadge>
      </div>

      <Panel className="border-l-4 border-l-status-info overflow-hidden">
        <WorkOrderHeader task={active} status={active.status} />
        <WorkOrderFacts task={active} />
        <BlockStatusBanner task={active} status={active.status} />
        <ActionBar status={active.status} onAction={(a) => setAction(a)} />
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionContext task={active} />
        <OperationalGaps />
      </div>

      <Alert tone="idle" title={tx('ground.sessionOnlyTitle')}>
        {tx('ground.sessionOnlyBody')}
        <Button size="sm" variant="ghost" className="ml-2" onClick={() => onNavigate && onNavigate('my-tasks')}>
          {tx('ground.viewAllWork')}
        </Button>
      </Alert>

      <TaskActionModal
        isOpen={Boolean(action)}
        onClose={() => setAction(null)}
        task={active}
        actionType={action}
        onSubmit={handleSubmit}
      />
    </div>
  );
};
