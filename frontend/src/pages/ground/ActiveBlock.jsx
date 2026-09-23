import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { Pill, AdvisoryNote } from '../../components/ui/worksheet';
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
  const { t } = useI18n();
  const [action, setAction] = useState(null);

  const deptTasks = useMemo(
    () => tasksInventory.filter((t) => t.department === selectedDept),
    [tasksInventory, selectedDept],
  );

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
      <div className="rounded-lg shadow-panel bg-ws-surface overflow-hidden">
        <div className="px-3 py-2 bg-ws-tick border-b border-ws-rule">
          <span className="font-display text-[11px] font-semibold text-ws-light">{t('ground.activeBlockTitle')}</span>
          <span className="text-[12px] text-ws-mid block mt-0.5">{selectedDept}</span>
        </div>
        <div className="px-4 py-6 text-center">
          <div className="font-ws text-xs font-semibold text-ws-mid">{t('ground.noAssignment')}</div>
          <div className="font-ws text-[11px] text-ws-light mt-1">{t('ground.noAssignmentBody')}</div>
        </div>
      </div>
    );
  }

  const isStarted = active.status === 'In Progress';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-semibold text-ws-ink">{t('ground.activeBlockTitle')}</h2>
          <p className="font-ws text-xs text-ws-mid mt-0.5">{isStarted ? t('ground.activeBlockInProgress') : t('ground.activeBlockNext')}</p>
        </div>
        <Pill tone={isStarted ? 'info' : 'ok'} size="md">{isStarted ? t('status.inProgressCaps') : t('status.readyToStart')}</Pill>
      </div>

      <div className="rounded-lg shadow-panel bolted bg-ws-surface overflow-hidden overflow-hidden">
        <WorkOrderHeader task={active} status={active.status} />
        <WorkOrderFacts task={active} />
        <BlockStatusBanner task={active} status={active.status} />
        <ActionBar status={active.status} onAction={(a) => setAction(a)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionContext task={active} />
        <OperationalGaps />
      </div>

      <AdvisoryNote
        tone="idle"
        title={t('ground.sessionOnlyTitle')}
        action={<button onClick={() => onNavigate && onNavigate('my-tasks')} className="font-display text-[11px] font-bold text-ws-mid hover:text-ws-ink">{t('ground.viewAllWork')}</button>}
      >
        {t('ground.sessionOnlyBody')}
      </AdvisoryNote>

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
