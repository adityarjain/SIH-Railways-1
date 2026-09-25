import React from 'react';
import { useI18n } from '../../i18n';
import { minToHhmm } from '../../utils/time';

const TONE = {
  critical: 'border-t-ws-critical text-ws-critical',
  warn: 'border-t-ws-warn text-ws-warn',
  ok: 'border-t-ws-ok text-ws-ok',
};

/**
 * The replanner's decision as the sequence it ran: conflict, reroute, hold,
 * replan, validation. Every step's outcome is read from the replan metadata
 * (and the run's post-solve validation); a step with no recorded data is
 * left out rather than guessed.
 */
export const DecisionFlow = ({ meta: m, validation }) => {
  const { t } = useI18n();
  const ev = m.event || {};
  const ov = m.overlap_window || [];
  const after = m.replanned_plan || {};
  const routes = (m.rejected_routes || []).length;

  const steps = [
    {
      title: t('flow.conflict'),
      verdict: t('flow.conflictVerdict'),
      tone: 'critical',
      detail: [ev.train_id, ev.section_id, ov.length === 2 && t('flow.overlap', { min: ov[1] - ov[0] })].filter(Boolean).join(' · '),
    },
    m.rerouting_attempted != null && {
      title: t('flow.reroute'),
      verdict: m.rerouting_succeeded ? t('flow.rerouted') : t('flow.noBypass'),
      tone: m.rerouting_succeeded ? 'ok' : 'critical',
      detail: t('flow.routes', { inspected: m.rerouting_candidates_inspected ?? routes, rejected: routes }),
    },
    m.hold_attempted != null && {
      title: t('flow.hold'),
      verdict: m.hold_selected ? t('flow.held') : t('flow.notHeld'),
      tone: m.hold_selected ? 'ok' : 'critical',
      detail: t('flow.holdLimit', { limit: m.hold_limit_minutes }),
    },
    m.action_taken && {
      title: t('flow.replan'),
      verdict: m.action_taken,
      tone: 'warn',
      detail: after.date ? `${after.date} ${minToHhmm(after.start_minute)}–${minToHhmm(after.end_minute)} · ${m.replan_runtime_seconds} s` : '',
    },
    validation && {
      title: t('flow.validation'),
      verdict: /pass/i.test(validation) ? t('flow.passed') : validation,
      tone: /pass/i.test(validation) ? 'ok' : 'critical',
      detail: validation,
    },
  ].filter(Boolean);

  return (
    <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-ws-rule border border-ws-rule">
      {steps.map((s, i) => (
        <li key={s.title} className={`bg-ws-dossier border-t-[3px] px-3 py-2.5 min-w-0 ${TONE[s.tone]}`}>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[11px] font-bold text-ws-light">{String(i + 1).padStart(2, '0')}</span>
            <span className="font-display text-[12px] font-semibold uppercase tracking-[0.08em] text-ws-ink">{s.title}</span>
          </div>
          <div className="font-display text-[14px] font-bold uppercase tracking-[0.04em] mt-1">{s.verdict}</div>
          {s.detail && <div className="font-mono text-[11px] text-ws-mid mt-0.5 break-words">{s.detail}</div>}
        </li>
      ))}
    </ol>
  );
};
