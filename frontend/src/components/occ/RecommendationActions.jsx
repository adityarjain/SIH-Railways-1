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
          <h3 className="font-display text-xs font-bold uppercase tracking-wide text-ws-ink">
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
          className="flex items-center gap-1.5 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wide bg-ws-ok text-white hover:brightness-95 transition-[filter]"
        >
          <CheckCircle2 size={14} /> {t('recommendationActions.approve')}
        </button>
        <button
          onClick={() => setNoteFor('MODIFIED')}
          className="flex items-center gap-1.5 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wide bg-[#F5ECD6] text-ws-warn border border-ws-warn hover:bg-[#F0E4C8] transition-colors"
        >
          <PencilLine size={14} /> {t('recommendationActions.requestModification')}
        </button>
        <button
          onClick={() => setNoteFor('REJECTED')}
          className="flex items-center gap-1.5 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wide bg-ws-barCriticalBg text-ws-critical border border-ws-critical hover:brightness-95 transition-[filter]"
        >
          <XCircle size={14} /> {t('recommendationActions.reject')}
        </button>
        <button
          onClick={() => reoptimize(taskId)}
          disabled={isReplanned}
          className="flex items-center gap-1.5 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wide bg-ws-info text-white hover:brightness-95 disabled:bg-ws-tick disabled:text-ws-disabled transition-[filter]"
          title={t('recommendationActions.reoptimizeHint')}
        >
          <RefreshCw size={14} /> {isReplanned ? t('recommendationActions.replanApplied') : t('recommendationActions.reoptimize')}
        </button>
      </div>

      {noteFor && (
        <div className="border border-ws-rule p-3 space-y-2 bg-ws-paper">
          <label className="font-display text-[11px] font-semibold uppercase tracking-wide text-ws-mid block">
            {noteFor === 'MODIFIED' ? t('recommendationActions.reasonModification') : t('recommendationActions.reasonRejection')}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={t('recommendationActions.notePlaceholder')}
            className="w-full font-ws text-xs border border-ws-rule bg-ws-surface px-2 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-ws-info"
          />
          <div className="flex gap-2">
            <button
              onClick={submitNote}
              disabled={!note.trim()}
              className="px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wide bg-ws-ink text-white hover:bg-ws-body disabled:bg-ws-rule disabled:text-ws-disabled"
            >
              {t('common.submit')}
            </button>
            <button
              onClick={() => { setNoteFor(null); setNote(''); }}
              className="px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wide text-ws-mid hover:bg-ws-paper"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {decision?.note && (
        <p className="font-ws text-[11px] text-ws-mid bg-ws-paper border border-ws-hairline px-2.5 py-1.5">
          <span className="font-display font-semibold text-ws-light">{t('recommendationActions.controllerNote')}:</span> {decision.note}
        </p>
      )}
    </div>
  );
};
