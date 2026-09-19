import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import { RegionHeader, StatFigure, Pill, AdvisoryNote, WsInput, WsSelect } from '../../components/ui/worksheet';
import { Button } from '../../components/ui';
import { Modal } from '../../components/common/Modal';
import { minToHhmm } from '../../utils/time';
import { bandOf, bandTone } from '../../utils/risk';
import completedWorkJson from '../../data/live/completedWork';

/**
 * Work Verification (Authority).
 *
 * Reads completed_work.json, so every row on screen is a possession the plan
 * actually handed back.
 */

const ACTIONS = {
  approve: { labelKey: 'verification.approve', tone: 'ok', titleKey: 'verification.approveTitle', blurbKey: 'verification.approveBlurb', requiresComment: false, status: 'Approved' },
  reject: { labelKey: 'verification.reject', tone: 'critical', titleKey: 'verification.rejectTitle', blurbKey: 'verification.rejectBlurb', requiresComment: true, status: 'Rejected' },
  flag: { labelKey: 'verification.flag', tone: 'warn', titleKey: 'verification.flagTitle', blurbKey: 'verification.flagBlurb', requiresComment: true, status: 'Flagged' },
};

const VERDICT_TONE = { Approved: 'ok', Rejected: 'critical', Flagged: 'warn' };
const RISK_PILL = { critical: 'critical', warn: 'warn', info: 'info', ok: 'ok', idle: 'idle' };

export const GeneralPortal = () => {
  const { verifications, submitVerification } = usePlan();
  const { t, isHindi } = useI18n();
  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modal, setModal] = useState(null); // { job, action }
  const [comment, setComment] = useState('');

  const departments = useMemo(
    () => [...new Set(completedWorkJson.map((j) => j.department))].sort(),
    [],
  );

  const verdictOf = (taskId) => {
    const v = verifications[taskId];
    if (!v) return null;
    return ACTIONS[v.status]?.status || v.status;
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return completedWorkJson
      .filter((j) => (deptFilter === 'ALL' ? true : j.department === deptFilter))
      .filter((j) => {
        const verdict = verdictOf(j.task_id);
        if (statusFilter === 'ALL') return true;
        if (statusFilter === 'PENDING') return !verdict;
        return verdict === statusFilter;
      })
      .filter((j) => {
        if (!q) return true;
        return (
          j.task_id.toLowerCase().includes(q) ||
          j.asset_id.toLowerCase().includes(q) ||
          j.section_id.toLowerCase().includes(q) ||
          (j.maintenance_type || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.execution_date.localeCompare(a.execution_date) || a.task_id.localeCompare(b.task_id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, deptFilter, statusFilter, verifications]);

  const counts = useMemo(() => {
    let approved = 0, rejected = 0, flagged = 0;
    for (const j of completedWorkJson) {
      const v = verdictOf(j.task_id);
      if (v === 'Approved') approved += 1;
      else if (v === 'Rejected') rejected += 1;
      else if (v === 'Flagged') flagged += 1;
    }
    return { approved, rejected, flagged, pending: completedWorkJson.length - approved - rejected - flagged };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifications]);

  const open = (job, action) => { setModal({ job, action }); setComment(''); };

  const confirm = () => {
    const cfg = ACTIONS[modal.action];
    if (cfg.requiresComment && !comment.trim()) return;
    submitVerification(modal.job.task_id, modal.action, comment.trim());
    setModal(null);
    setComment('');
  };

  const cfg = modal ? ACTIONS[modal.action] : null;

  return (
    <div className="bg-ws-band min-h-full">
      <div className="bg-ws-paper border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-2.5">
        <p className="font-ws text-xs text-ws-mid max-w-3xl leading-relaxed">{t('verification.subtitle')}</p>
      </div>

      {/* 01 — verification stats */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
        <RegionHeader number="01" title={t('verification.title')} meta={t('scope.thisSession').toUpperCase()} isHindi={isHindi} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-3.5 border-t border-ws-rule pt-3">
          <StatFigure value={counts.pending} label={t('verification.awaitingVerification')} tone={counts.pending ? 'text-ws-warn' : 'text-ws-ok'} />
          <StatFigure value={counts.approved} label={t('verification.approved')} tone="text-ws-ok" />
          <StatFigure value={counts.rejected} label={t('verification.rejected')} tone="text-ws-critical" />
          <StatFigure value={counts.flagged} label={t('verification.flaggedForReview')} tone="text-ws-warn" />
        </div>
      </div>

      {/* 02 — completed possessions register */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-3.5">
        <RegionHeader number="02" title={t('verification.completedPossessions')} meta={t('verification.completedScope', { shown: rows.length, total: completedWorkJson.length })} isHindi={isHindi} />
        <div className="flex flex-wrap items-center gap-2.5">
          <WsInput placeholder={t('verification.searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-[220px] flex-1" />
          <WsSelect value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="ALL">{t('common.allDepartments')}</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </WsSelect>
          <WsSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">{t('common.all')}</option>
            <option value="PENDING">{t('verification.awaitingVerification')}</option>
            <option value="Approved">{t('verification.approved')}</option>
            <option value="Rejected">{t('verification.rejected')}</option>
            <option value="Flagged">{t('status.flagged')}</option>
          </WsSelect>
        </div>
      </div>

      <div className="bg-ws-surface border-b border-ws-rule overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[860px]">
          <thead className="border-b border-ws-rule bg-ws-tick">
            <tr>
              {[t('common.task'), t('common.section'), t('verification.executed'), t('common.blocks'), t('common.crew'), t('common.risk'), t('verification.verificationCol'), ''].map((h, i) => (
                <th key={h || 'actions'} className={`px-3.5 py-2 font-display text-[10px] font-semibold text-ws-light whitespace-nowrap ${i >= 5 ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-3.5 py-8 text-center font-ws text-xs text-ws-mid">{t('verification.noMatch')}</td></tr>
            )}
            {rows.map((j) => {
              const band = bandOf(j);
              const v = verdictOf(j.task_id);
              return (
                <tr key={j.task_id} className="border-b border-ws-hairline last:border-b-0">
                  <td className="px-3.5 py-1.5 whitespace-nowrap">
                    <div className="font-mono text-[11px] font-medium text-ws-ink">{j.task_id}</div>
                    <div className="font-ws text-[10px] text-ws-light">{j.maintenance_type}</div>
                  </td>
                  <td className="px-3.5 py-1.5 whitespace-nowrap">
                    <div className="font-mono text-[11px] text-ws-body">{j.section_id}</div>
                    <div className="font-mono text-[9px] text-ws-light">{j.corridor_id}</div>
                  </td>
                  <td className="px-3.5 py-1.5 whitespace-nowrap">
                    <div className="font-mono text-[11px] text-ws-body">{j.execution_date}</div>
                    <div className="font-mono text-[9px] text-ws-light">{minToHhmm(j.start_minute)}–{minToHhmm(j.end_minute)}</div>
                  </td>
                  <td className="px-3.5 py-1.5 font-mono text-[10px] text-ws-mid whitespace-nowrap">{(j.block_ids || []).join(' + ')}</td>
                  <td className="px-3.5 py-1.5 font-mono text-[10px] text-ws-mid whitespace-nowrap">{(j.assigned_teams || []).join(', ')}</td>
                  <td className="px-3.5 py-1.5 text-right whitespace-nowrap"><Pill tone={RISK_PILL[bandTone(band)] || 'idle'} size="sm">{j.risk_score?.toFixed?.(1) ?? '—'}</Pill></td>
                  <td className="px-3.5 py-1.5 text-right whitespace-nowrap">
                    {v ? <Pill tone={RISK_PILL[VERDICT_TONE[v]] || 'idle'} size="sm">{v}</Pill> : <span className="font-ws text-[10px] text-ws-light">{t('status.awaiting')}</span>}
                  </td>
                  <td className="px-3.5 py-1.5 text-right whitespace-nowrap">
                    <span className="inline-flex gap-1 justify-end">
                      <Button size="sm" variant="secondary" onClick={() => open(j, 'approve')}>{t('verification.approve')}</Button>
                      <Button size="sm" variant="warn" onClick={() => open(j, 'flag')}>{t('verification.flag')}</Button>
                      <Button size="sm" variant="secondary" onClick={() => open(j, 'reject')}>{t('verification.reject')}</Button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-3.5">
        <AdvisoryNote tone="idle" title={t('verification.sessionOnlyTitle')}>{t('verification.sessionOnlyBody')}</AdvisoryNote>
      </div>

      <div className="bg-ws-band px-3.5 md:px-4 xl:px-5 py-2">
        <span className="font-mono text-[10px] text-ws-mid">{t('verification.sourceNote', { count: completedWorkJson.length })}</span>
      </div>

      <Modal
        isOpen={Boolean(modal)}
        onClose={() => setModal(null)}
        title={cfg ? t(cfg.titleKey) : ''}
        subtitle={modal ? `${modal.job.task_id} · ${modal.job.maintenance_type} · ${modal.job.section_id}` : ''}
        maxWidth="max-w-lg"
      >
        {modal && (
          <div className="space-y-3">
            <p className="font-ws text-xs text-ws-mid leading-relaxed">{t(cfg.blurbKey)}</p>

            <div className="grid grid-cols-2 gap-px bg-ws-rule border border-ws-rule">
              {[
                [t('verification.executed'), modal.job.execution_date],
                [t('common.window'), `${minToHhmm(modal.job.start_minute)}–${minToHhmm(modal.job.end_minute)}`],
                [t('common.blocks'), (modal.job.block_ids || []).join(' + ')],
                [t('common.crew'), (modal.job.assigned_teams || []).join(', ')],
              ].map(([k, v]) => (
                <div key={k} className="bg-ws-surface px-3 py-2">
                  <div className="font-display text-[11px] font-semibold text-ws-light">{k}</div>
                  <div className="font-mono text-[11px] text-ws-ink mt-0.5">{v}</div>
                </div>
              ))}
            </div>

            <div>
              <label className="font-display text-[11px] font-semibold text-ws-light block mb-1">
                {t('verification.comment')} {cfg.requiresComment ? <span className="text-ws-critical">· {t('verification.required')}</span> : `· ${t('verification.optional')}`}
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={cfg.requiresComment ? t('verification.commentPlaceholderRequired') : t('verification.commentPlaceholderOptional')}
                className="w-full font-ws text-xs bg-ws-surface border border-ws-rule px-2.5 py-2 text-ws-ink placeholder:text-ws-light focus:outline-none focus:ring-1 focus:ring-ws-info"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setModal(null)}>{t('common.cancel')}</Button>
              <Button
                variant={cfg.tone === 'critical' ? 'danger' : cfg.tone === 'warn' ? 'warn' : 'primary'}
                disabled={cfg.requiresComment && !comment.trim()}
                onClick={confirm}
              >
                {t(cfg.labelKey)}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
