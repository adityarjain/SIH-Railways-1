import React, { useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import { Pill } from '../ui/worksheet';
import { CheckCircle2, XCircle, PencilLine, RefreshCw } from 'lucide-react';

const DECISION_TONE = {
  APPROVED: 'ok',
  REJECTED: 'critical',
  MODIFIED: 'warn',
  RE_OPTIMIZED: 'info',
};

/**
 * Controller actions on the optimizer's recommendation for one task.
 *
 * Approve / Modify / Reject record a decision in session state. Re-optimize
 * applies the replan the Python engine actually produced (replan_output/) --
 * the solver is not run in the browser, and the panel says so rather than
 * implying a live solve.
 */
export const RecommendationActions = ({ taskId = 'TASK-000005' }) => {
  const {
    planDecisions,
    approveRecommendation,
    rejectRecommendation,
    modifyRecommendation,
    reoptimize,
    isReplanned,
  } = usePlan();
  const { t } = useI18n();

  const [note, setNote] = useState('');
  const [noteFor, setNoteFor] = useState(null); // 'MODIFIED' | 'REJECTED' | null
  const decision = planDecisions[taskId];

  const submitNote = () => {
    if (noteFor === 'MODIFIED') modifyRecommendation(taskId, note);
    if (noteFor === 'REJECTED') rejectRecommendation(taskId, note);
    setNote('');
    setNoteFor(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display text-[14px] font-semibold text-ws-ink">
            {t('recommendationActions.title', { taskId })}
          </h3>
          <p className="font-ws text-[11px] text-ws-mid mt-0.5">{t('recommendationActions.subtitle')}</p>
        </div>
        {decision && (
          <Pill tone={DECISION_TONE[decision.decision] || 'info'}>
            {decision.decision.replace('_', '-')} · {decision.decidedAt}
          </Pill>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => approveRecommendation(taskId)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-md font-display text-[13px] font-semibold bg-ws-ok text-white shadow-key hover:brightness-110 transition-all"
        >
          <CheckCircle2 size={14} /> {t('recommendationActions.approve')}
        </button>
        <button
          onClick={() => setNoteFor('MODIFIED')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-md font-display text-[13px] font-semibold bg-status-warn-tint text-status-warn shadow-key hover:brightness-[0.98] transition-all"
        >
          <PencilLine size={14} /> {t('recommendationActions.requestModification')}
        </button>
        <button
          onClick={() => setNoteFor('REJECTED')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-md font-display text-[13px] font-semibold bg-ws-barCriticalBg text-ws-barCriticalLabel shadow-key hover:brightness-[0.98] transition-all"
        >
          <XCircle size={14} /> {t('recommendationActions.reject')}
        </button>
        <button
          onClick={() => reoptimize(taskId)}
          disabled={isReplanned}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-md font-display text-[13px] font-semibold bg-accent text-accent-ink shadow-key-accent hover:bg-accent-hover disabled:bg-ws-tick disabled:text-ws-disabled disabled:active:scale-100 transition-all"
          title={t('recommendationActions.reoptimizeHint')}
        >
          <RefreshCw size={14} /> {isReplanned ? t('recommendationActions.replanApplied') : t('recommendationActions.reoptimize')}
        </button>
      </div>

      {noteFor && (
        <div className="rounded-lg bg-ws-tick p-3.5 space-y-2.5">
          <label className="font-display text-[12px] font-medium text-ws-mid block">
            {noteFor === 'MODIFIED' ? t('recommendationActions.reasonModification') : t('recommendationActions.reasonRejection')}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={t('recommendationActions.notePlaceholder')}
            className="w-full font-ws text-[13px] rounded-md rounded-lg shadow-panel bg-ws-surface overflow-hidden px-3 py-2 placeholder:text-ws-light focus:outline-none focus:border-ws-info focus:ring-2 focus:ring-status-info/15 transition-colors"
          />
          <div className="flex gap-2">
            <button
              onClick={submitNote}
              disabled={!note.trim()}
              className="px-3.5 py-2 rounded-md font-display text-[13px] font-semibold bg-accent text-accent-ink shadow-key-accent hover:bg-accent-hover disabled:bg-ws-rule disabled:text-ws-disabled disabled:active:scale-100 transition-all"
            >
              {t('common.submit')}
            </button>
            <button
              onClick={() => { setNoteFor(null); setNote(''); }}
              className="px-3.5 py-2 rounded-md font-display text-[13px] font-semibold text-ws-mid hover:bg-ws-band transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {decision?.note && (
        <p className="font-ws text-[12px] text-ws-mid bg-ws-tick rounded-md px-3 py-2">
          <span className="font-display font-semibold text-ws-light">{t('recommendationActions.controllerNote')}:</span> {decision.note}
        </p>
      )}
    </div>
  );
};
