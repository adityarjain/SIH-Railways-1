import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { StatFigure, Pill, AdvisoryNote } from '../../components/ui/worksheet';
import { Button } from '../../components/ui';
import { TaskActionModal } from '../../components/maintenance/TaskActionModal';
import { minToHhmm } from '../../utils/time';
import { statusTone } from '../../components/ground/WorkOrder';

/** Statuses that represent work the crew has flagged rather than progressed. */
const ISSUE_STATUSES = new Set(['Issue Reported', 'Paused', 'Rejected by Field Crew']);
const isIssue = (status) =>
  Boolean(status) && (ISSUE_STATUSES.has(status) || status.startsWith('Reschedule'));
const RISK_PILL = { critical: 'critical', warn: 'warn', info: 'info', ok: 'ok', idle: 'idle' };

/**
 * Work the crew has flagged: paused possessions, reported problems, reschedule
 * requests and rejections. Backed entirely by the status overrides the crew
 * itself has written this session — nothing is seeded.
 */
export const Issues = ({ onNavigate }) => {
  const { tasksInventory, updateTaskStatus } = usePlan();
  const { selectedDept } = useAuth();
  const { t } = useI18n();
  const [target, setTarget] = useState(null);

  const deptTasks = useMemo(
    () => tasksInventory.filter((tk) => tk.department === selectedDept),
    [tasksInventory, selectedDept],
  );

  const flagged = useMemo(
    () => deptTasks.filter((tk) => isIssue(tk.status)),
    [deptTasks],
  );

  const reportable = useMemo(
    () => deptTasks.filter((tk) => (tk.block_ids || []).length && !isIssue(tk.status) && tk.status !== 'Completed'),
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
        <h2 className="font-display text-[15px] font-semibold text-ws-ink">{t('ground.issuesTitle')}</h2>
        <p className="font-ws text-xs text-ws-mid mt-0.5 max-w-3xl leading-relaxed">{t('ground.issuesSubtitle')}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-lg shadow-panel bg-ws-surface overflow-hidden p-3.5">
        <StatFigure value={flagged.length} label={t('ground.openIssues')} tone={flagged.length ? 'text-ws-warn' : 'text-ws-ok'} />
        <StatFigure value={flagged.filter((tk) => (tk.status || '').startsWith('Reschedule')).length} label={t('ground.rescheduleRequests')} />
        <StatFigure value={flagged.filter((tk) => (tk.status || '').startsWith('Rejected')).length} label={t('ground.rejectedCount')} tone="text-ws-critical" />
        <StatFigure value={deptTasks.length} label={t('ground.assignedWork')} />
      </div>

      <div className="rounded-lg shadow-panel bg-ws-surface overflow-hidden overflow-x-auto custom-scrollbar">
        <div className="px-3 py-2 bg-ws-tick border-b border-ws-rule">
          <span className="font-display text-[11px] font-semibold text-ws-light">{t('ground.flaggedWork')}</span>
          <span className="text-[12px] text-ws-mid block mt-0.5">
            {flagged.length === 1 ? t('ground.flaggedScope', { count: flagged.length }) : t('ground.flaggedScopePlural', { count: flagged.length })}
          </span>
        </div>
        {flagged.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="font-ws text-xs font-semibold text-ws-mid">{t('ground.noIssues')}</div>
            <div className="font-ws text-[11px] text-ws-light mt-1">{t('ground.noIssuesBody')}</div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead className="border-b border-ws-rule">
              <tr>
                {[t('common.task'), t('common.type'), t('common.section'), t('common.window'), t('ground.crewNote'), t('common.status')].map((h, i) => (
                  <th key={h} className={`px-3.5 py-2 font-display text-[10px] font-semibold text-ws-light whitespace-nowrap ${i === 5 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flagged.map((tk) => (
                <tr key={tk.task_id} className="border-b border-ws-hairline last:border-b-0">
                  <td className="px-3.5 py-1.5 font-mono text-[11px] font-medium text-ws-ink whitespace-nowrap">{tk.task_id}</td>
                  <td className="px-3.5 py-1.5 font-ws text-[11px] text-ws-body whitespace-nowrap">{tk.maintenance_type}</td>
                  <td className="px-3.5 py-1.5 font-mono text-[11px] text-ws-body whitespace-nowrap">{tk.section_id}</td>
                  <td className="px-3.5 py-1.5 font-mono text-[11px] text-ws-body whitespace-nowrap">{tk.start_minute != null ? `${minToHhmm(tk.start_minute)}–${minToHhmm(tk.end_minute)}` : '—'}</td>
                  <td className="px-3.5 py-1.5 font-ws text-[11px] text-ws-mid">{tk.statusMeta?.reason || '—'}</td>
                  <td className="px-3.5 py-1.5 text-right whitespace-nowrap"><Pill tone={RISK_PILL[statusTone(tk.status)] || 'idle'} size="sm">{tk.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-lg shadow-panel bg-ws-surface overflow-hidden">
        <div className="px-3 py-2 bg-ws-tick border-b border-ws-rule">
          <span className="font-display text-[11px] font-semibold text-ws-light">{t('ground.reportAnIssue')}</span>
          <span className="text-[12px] text-ws-mid block mt-0.5">{t('ground.reportScope')}</span>
        </div>
        {reportable.length === 0 ? (
          <div className="px-4 py-8 text-center font-ws text-xs text-ws-mid">{t('ground.noActivePossession')}</div>
        ) : (
          <div>
            {reportable.map((tk) => (
              <div key={tk.task_id} className="px-3 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-ws-hairline last:border-b-0">
                <div className="min-w-0">
                  <div className="font-mono text-[12px] font-semibold text-ws-ink">{tk.task_id}</div>
                  <div className="font-ws text-[11px] text-ws-mid mt-0.5">
                    {tk.maintenance_type} · {tk.section_id}
                    {tk.start_minute != null && ` · ${minToHhmm(tk.start_minute)}–${minToHhmm(tk.end_minute)}`}
                  </div>
                </div>
                <Button size="md" variant="warn" onClick={() => setTarget(tk)}>{t('taskAction.issueConfirm')}</Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AdvisoryNote
        tone="idle"
        title={t('ground.sessionOnlyTitle')}
        action={<button onClick={() => onNavigate && onNavigate('my-tasks')} className="font-display text-[11px] font-bold text-ws-mid hover:text-ws-ink">{t('ground.backToWork')}</button>}
      >
        {t('ground.issuesSessionBody')}
      </AdvisoryNote>

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
