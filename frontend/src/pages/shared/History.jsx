import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth, ROLES } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { RegionHeader, WsSelect, AdvisoryNote, SegmentedControl } from '../../components/ui/worksheet';
import { Button } from '../../components/ui';
import { downloadCsv } from '../../utils/export';

const KINDS = [
  'status_changed', 'requirement_submitted', 'evidence_added', 'decision_recorded',
  'verification_submitted', 'replan_toggled', 'event_triggered', 'event_cleared',
];

// Outcome tabs: what happened to the work, across event kinds.
const OUTCOMES = {
  all: () => true,
  approved: (e) => e.kind === 'verification_submitted' && e.payload?.status === 'Approved',
  rejected: (e) => (e.kind === 'verification_submitted' && e.payload?.status === 'Rejected')
    || (e.kind === 'decision_recorded' && e.payload?.decision === 'REJECTED'),
  falseClosure: (e) => e.kind === 'verification_submitted' && e.payload?.status === 'False Closure Reported',
  flagged: (e) => e.kind === 'verification_submitted' && e.payload?.status === 'Flagged',
  completed: (e) => e.kind === 'status_changed' && e.payload?.status === 'Completed',
  rescheduled: (e) => (e.kind === 'replan_toggled' && e.payload?.on)
    || (e.kind === 'decision_recorded' && e.payload?.decision === 'RE_OPTIMIZED')
    || (e.kind === 'status_changed' && String(e.payload?.status || '').startsWith('Reschedule')),
};

const stamp = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** One line saying what happened, and the free-text detail behind it. */
export const describeEvent = (e, t) => {
  const p = e.payload || {};
  switch (e.kind) {
    case 'status_changed':
      // Only a reschedule request carries a meaningful proposed date.
      return [t('history.statusChanged', { status: p.status }), [p.reason, String(p.status || '').startsWith('Reschedule') && p.proposedDate && `→ ${p.proposedDate}`].filter(Boolean).join(' ')];
    case 'decision_recorded':
      return [t('history.decision', { decision: p.decision }), p.note];
    case 'verification_submitted':
      return [t('history.verification', { status: p.status }), [p.reading && `${t('verification.reading')}: ${p.reading}`, p.comments].filter(Boolean).join(' · ')];
    case 'replan_toggled':
      return p.on
        ? [t('history.replanOn', { task: p.task_id, date: p.date, window: p.window }), '']
        : [t('history.replanOff'), ''];
    case 'event_triggered':
      return [t('history.eventTriggered', { id: p.event_id }), ''];
    case 'event_cleared':
      return [t('history.eventCleared'), ''];
    case 'requirement_submitted':
      return [t('history.requirement', { duration: p.duration, teamSize: p.teamSize, window: p.window }), p.note];
    case 'evidence_added':
      return [p.file_id != null || p.data_url ? t('history.evidencePhoto') : t('history.evidenceNote'), p.note];
    default:
      return [e.kind, ''];
  }
};

/**
 * Audit history: the event log itself, not a separate record. Ground sees its
 * own department's work; Authority and Admin see everything.
 */
export const History = () => {
  const { historyEvents, resetSaved } = usePlan();
  const { currentUser, mode } = useAuth();
  const { t } = useI18n();
  const [kind, setKind] = useState('all');
  const [outcome, setOutcome] = useState('all');
  const [confirming, setConfirming] = useState(false);

  const rows = useMemo(
    () => historyEvents.filter((e) => (kind === 'all' || e.kind === kind) && OUTCOMES[outcome](e)).slice().reverse(),
    [historyEvents, kind, outcome],
  );

  const exportRows = () => downloadCsv(
    `audit-history-${new Date().toISOString().slice(0, 10)}.csv`,
    ['time', 'user', 'role', 'department', 'task', 'action', 'detail'],
    rows.map((e) => {
      const [what, detail] = describeEvent(e, t);
      return [stamp(e.ts), e.actor?.username, e.actor?.role, e.actor?.department, e.task_id || e.payload?.task_id || '', what, detail || ''];
    }),
  );

  return (
    <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-4 pb-5 space-y-3">
      <RegionHeader
        number="01"
        title={t('history.title')}
        meta={t('history.meta', { count: historyEvents.length })}
      />

      <AdvisoryNote tone={mode === 'api' ? 'info' : 'warn'} title={mode === 'api' ? t('history.savedTitle') : t('login.localTitle')}>
        {mode === 'api' ? t('history.savedBody') : t('history.localBody')}
        {currentUser?.role === ROLES.GROUND && ` ${t('history.scopeGround', { dept: currentUser.department })}`}
      </AdvisoryNote>

      <div className="overflow-x-auto custom-scrollbar">
        <SegmentedControl
          size="sm"
          value={outcome}
          onChange={setOutcome}
          options={Object.keys(OUTCOMES).map((k) => ({
            id: k,
            label: `${t(`history.outcome.${k}`)} · ${historyEvents.filter(OUTCOMES[k]).length}`,
          }))}
        />
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <WsSelect value={kind} onChange={(e) => setKind(e.target.value)} aria-label={t('history.filter')}>
          <option value="all">{t('history.allKinds')}</option>
          {KINDS.map((k) => <option key={k} value={k}>{t(`history.kind.${k}`)}</option>)}
        </WsSelect>
        <span className="flex-1" />
        <Button variant="secondary" size="sm" onClick={exportRows} disabled={!rows.length}>{t('export.csv')}</Button>
        {currentUser?.role === ROLES.ADMIN && (
          confirming ? (
            <>
              <span className="text-[12px] text-ws-critical">{t('history.resetConfirm')}</span>
              <Button variant="danger" size="sm" onClick={async () => { await resetSaved(); setConfirming(false); }}>{t('history.resetYes')}</Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>{t('common.cancel')}</Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setConfirming(true)}>{t('history.reset')}</Button>
          )
        )}
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-ws-mid">{t('history.empty')}</p>
      ) : (
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[760px] text-left border-t border-ws-rule">
            <thead>
              <tr className="border-b border-ws-rule">
                {['time', 'who', 'task', 'what', 'detail'].map((h) => (
                  <th key={h} className="t-stamp px-2 py-1.5 whitespace-nowrap">{t(`history.col.${h}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const [what, detail] = describeEvent(e, t);
                return (
                  <tr key={e.id} className="border-b border-ws-hairline hover:bg-ws-paper align-top">
                    <td className="px-2 py-1.5 font-mono text-[11px] text-ws-mid whitespace-nowrap">{stamp(e.ts)}</td>
                    <td className="px-2 py-1.5 text-[12px] text-ws-ink whitespace-nowrap">
                      {e.actor?.name}
                      <span className="block font-mono text-[10px] text-ws-light">{e.actor?.username} · {e.actor?.department}</span>
                    </td>
                    <td className="px-2 py-1.5 font-mono text-[11px] font-semibold text-ws-ink whitespace-nowrap">{e.task_id || e.payload?.task_id || '—'}</td>
                    <td className="px-2 py-1.5 text-[13px] text-ws-ink">{what}</td>
                    <td className="px-2 py-1.5 text-[12px] text-ws-mid max-w-[360px]">{detail || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
