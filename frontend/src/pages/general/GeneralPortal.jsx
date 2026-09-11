import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import {
  Panel, PanelHeader, PanelBody, Metric, StatusBadge, Button, Alert,
  DataTable, EmptyState, Select, TextInput, ScopeCaption,
} from '../../components/ui';
import { Modal } from '../../components/common/Modal';
import { minToHhmm } from '../../utils/time';
import { bandOf, bandTone } from '../../utils/risk';
import completedWorkJson from '../../data/completed_work.json';

/**
 * Work Verification (Authority).
 *
 * Previously a public-facing portal whose cards were a hardcoded three-element
 * fixture — one of which (TASK-000005) is not completed work at all, but the
 * task the demo replans. This reads completed_work.json instead, so every row
 * on screen is a possession the plan actually handed back.
 */

const ACTIONS = {
  approve: { labelKey: 'verification.approve', tone: 'ok', titleKey: 'verification.approveTitle', blurbKey: 'verification.approveBlurb', requiresComment: false, status: 'Approved' },
  reject: { labelKey: 'verification.reject', tone: 'critical', titleKey: 'verification.rejectTitle', blurbKey: 'verification.rejectBlurb', requiresComment: true, status: 'Rejected' },
  flag: { labelKey: 'verification.flag', tone: 'warn', titleKey: 'verification.flagTitle', blurbKey: 'verification.flagBlurb', requiresComment: true, status: 'Flagged' },
};

const VERDICT_TONE = { Approved: 'ok', Rejected: 'critical', Flagged: 'warn' };

export const GeneralPortal = () => {
  const { verifications, submitVerification } = usePlan();
  const { t } = useI18n();
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
    <div className="space-y-4">
      <div>
        <h2 className="t-section-title">{t('verification.title')}</h2>
        <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
          {t('verification.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Panel><PanelBody><Metric label={t('verification.awaitingVerification')} value={counts.pending} tone={counts.pending ? 'warn' : 'ok'} scope={t('scope.thisSession')} /></PanelBody></Panel>
        <Panel><PanelBody><Metric label={t('verification.approved')} value={counts.approved} tone="ok" scope={t('scope.thisSession')} /></PanelBody></Panel>
        <Panel><PanelBody><Metric label={t('verification.rejected')} value={counts.rejected} tone="critical" scope={t('scope.thisSession')} /></PanelBody></Panel>
        <Panel><PanelBody><Metric label={t('verification.flaggedForReview')} value={counts.flagged} tone="warn" scope={t('scope.thisSession')} /></PanelBody></Panel>
      </div>

      <Panel>
        <PanelHeader
          title={t('verification.completedPossessions')}
          scope={`${rows.length} of ${completedWorkJson.length} records · completed_work.json`}
        />
        <PanelBody className="border-b border-line flex flex-wrap items-center gap-2.5">
          <TextInput
            placeholder={t('verification.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-[240px] flex-1"
          />
          <Select label={t('common.dept')} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="ALL">{t('common.allDepartments')}</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
          <Select label={t('common.status')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">{t('common.all')}</option>
            <option value="PENDING">{t('verification.awaitingVerification')}</option>
            <option value="Approved">{t('verification.approved')}</option>
            <option value="Rejected">{t('verification.rejected')}</option>
            <option value="Flagged">{t('status.flagged')}</option>
          </Select>
        </PanelBody>

        <DataTable
          getKey={(j) => j.task_id}
          columns={[
            { key: 'task_id', header: t('common.task'), render: (j) => (
              <span>
                <span className="t-mono-id block">{j.task_id}</span>
                <span className="text-[10px] text-rail-400">{j.maintenance_type}</span>
              </span>
            ) },
            { key: 'section_id', header: t('common.section'), render: (j) => (
              <span className="font-mono text-[11px]">{j.section_id}<span className="block text-[9px] text-rail-400">{j.corridor_id}</span></span>
            ) },
            { key: 'execution_date', header: t('verification.executed'), render: (j) => (
              <span className="font-mono text-[11px]">
                {j.execution_date}
                <span className="block text-[9px] text-rail-400">{minToHhmm(j.start_minute)}–{minToHhmm(j.end_minute)}</span>
              </span>
            ) },
            { key: 'block_ids', header: t('common.blocks'), render: (j) => (
              <span className="font-mono text-[10px]">{(j.block_ids || []).join(' + ')}</span>
            ) },
            { key: 'assigned_teams', header: t('common.crew'), render: (j) => (
              <span className="font-mono text-[10px]">{(j.assigned_teams || []).join(', ')}</span>
            ) },
            { key: 'risk', header: t('common.risk'), align: 'right', render: (j) => {
              const band = bandOf(j);
              return <StatusBadge tone={bandTone(band)} size="sm">{j.risk_score?.toFixed?.(1) ?? '—'}</StatusBadge>;
            } },
            { key: 'verdict', header: t('verification.verificationCol'), align: 'right', render: (j) => {
              const v = verdictOf(j.task_id);
              return v
                ? <StatusBadge tone={VERDICT_TONE[v] || 'idle'} size="sm">{v}</StatusBadge>
                : <span className="text-[10px] text-rail-400">{t('status.awaiting')}</span>;
            } },
            { key: 'actions', header: '', align: 'right', render: (j) => (
              <span className="inline-flex gap-1 justify-end">
                <Button size="sm" variant="secondary" onClick={() => open(j, 'approve')}>{t('verification.approve')}</Button>
                <Button size="sm" variant="warn" onClick={() => open(j, 'flag')}>{t('verification.flag')}</Button>
                <Button size="sm" variant="secondary" onClick={() => open(j, 'reject')}>{t('verification.reject')}</Button>
              </span>
            ) },
          ]}
          rows={rows}
          empty={<EmptyState title={t('verification.noMatch')} />}
        />
      </Panel>

      <Alert tone="idle" title={t('verification.sessionOnlyTitle')}>
        Verification decisions are held in the browser for this session. Nothing is written to an
        external register, no notification is sent, and no maintenance record is amended. This is
        not an audit system and does not claim independent third-party certification.
      </Alert>

      <ScopeCaption className="block">
        Source: completed_work.json · {completedWorkJson.length} possessions handed back, generated
        by scripts/generate_tasks_inventory.py
      </ScopeCaption>

      <Modal
        isOpen={Boolean(modal)}
        onClose={() => setModal(null)}
        title={cfg ? t(cfg.titleKey) : ''}
        subtitle={modal ? `${modal.job.task_id} · ${modal.job.maintenance_type} · ${modal.job.section_id}` : ''}
        maxWidth="max-w-lg"
      >
        {modal && (
          <div className="space-y-3">
            <p className="text-xs text-rail-600 leading-relaxed">{t(cfg.blurbKey)}</p>

            <div className="grid grid-cols-2 gap-px bg-line border border-line">
              {[
                [t('verification.executed'), modal.job.execution_date],
                [t('common.window'), `${minToHhmm(modal.job.start_minute)}–${minToHhmm(modal.job.end_minute)}`],
                [t('common.blocks'), (modal.job.block_ids || []).join(' + ')],
                [t('common.crew'), (modal.job.assigned_teams || []).join(', ')],
              ].map(([k, v]) => (
                <div key={k} className="bg-surface-panel px-3 py-2">
                  <div className="t-label">{k}</div>
                  <div className="font-mono text-[11px] text-rail-900 mt-0.5">{v}</div>
                </div>
              ))}
            </div>

            <div>
              <label className="t-label block mb-1">
                {t('verification.comment')} {cfg.requiresComment ? <span className="text-status-critical">· {t('verification.required')}</span> : `· ${t('verification.optional')}`}
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={cfg.requiresComment ? t('verification.commentPlaceholderRequired') : t('verification.commentPlaceholderOptional')}
                className="w-full text-xs bg-surface-panel border border-line rounded-sm px-2.5 py-2 text-rail-900 placeholder:text-rail-400 focus:outline-none focus:ring-1 focus:ring-status-info"
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
