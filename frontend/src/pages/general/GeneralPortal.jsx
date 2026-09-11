import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
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
  approve: {
    label: 'Approve',
    tone: 'ok',
    title: 'Approve completed work',
    blurb: 'Confirm the possession was handed back and the work is accepted. A comment is optional.',
    requiresComment: false,
    status: 'Approved',
  },
  reject: {
    label: 'Reject',
    tone: 'critical',
    title: 'Reject completed work',
    blurb: 'Record that the work is not accepted. State the reason — it is kept with the record.',
    requiresComment: true,
    status: 'Rejected',
  },
  flag: {
    label: 'Flag for review',
    tone: 'warn',
    title: 'Flag closure for review',
    blurb: 'Record a discrepancy between the closure and what was observed. State what prompted it.',
    requiresComment: true,
    status: 'Flagged',
  },
};

const VERDICT_TONE = { Approved: 'ok', Rejected: 'critical', Flagged: 'warn' };

export const GeneralPortal = () => {
  const { verifications, submitVerification } = usePlan();
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
        <h2 className="t-section-title">Verify Completed Work</h2>
        <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
          Possessions the plan has handed back, for verification by the controlling authority.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Panel><PanelBody><Metric label="Awaiting verification" value={counts.pending} tone={counts.pending ? 'warn' : 'ok'} scope="This session" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="Approved" value={counts.approved} tone="ok" scope="This session" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="Rejected" value={counts.rejected} tone="critical" scope="This session" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="Flagged for review" value={counts.flagged} tone="warn" scope="This session" /></PanelBody></Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Completed possessions"
          scope={`${rows.length} of ${completedWorkJson.length} records · completed_work.json`}
        />
        <PanelBody className="border-b border-line flex flex-wrap items-center gap-2.5">
          <TextInput
            placeholder="Search task, asset, section, type…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-[240px] flex-1"
          />
          <Select label="Dept" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="ALL">All departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
          <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All</option>
            <option value="PENDING">Awaiting verification</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Flagged">Flagged</option>
          </Select>
        </PanelBody>

        <DataTable
          getKey={(j) => j.task_id}
          columns={[
            { key: 'task_id', header: 'Task', render: (j) => (
              <span>
                <span className="t-mono-id block">{j.task_id}</span>
                <span className="text-[10px] text-rail-400">{j.maintenance_type}</span>
              </span>
            ) },
            { key: 'section_id', header: 'Section', render: (j) => (
              <span className="font-mono text-[11px]">{j.section_id}<span className="block text-[9px] text-rail-400">{j.corridor_id}</span></span>
            ) },
            { key: 'execution_date', header: 'Executed', render: (j) => (
              <span className="font-mono text-[11px]">
                {j.execution_date}
                <span className="block text-[9px] text-rail-400">{minToHhmm(j.start_minute)}–{minToHhmm(j.end_minute)}</span>
              </span>
            ) },
            { key: 'block_ids', header: 'Blocks', render: (j) => (
              <span className="font-mono text-[10px]">{(j.block_ids || []).join(' + ')}</span>
            ) },
            { key: 'assigned_teams', header: 'Crew', render: (j) => (
              <span className="font-mono text-[10px]">{(j.assigned_teams || []).join(', ')}</span>
            ) },
            { key: 'risk', header: 'Risk', align: 'right', render: (j) => {
              const band = bandOf(j);
              return <StatusBadge tone={bandTone(band)} size="sm">{j.risk_score?.toFixed?.(1) ?? '—'}</StatusBadge>;
            } },
            { key: 'verdict', header: 'Verification', align: 'right', render: (j) => {
              const v = verdictOf(j.task_id);
              return v
                ? <StatusBadge tone={VERDICT_TONE[v] || 'idle'} size="sm">{v}</StatusBadge>
                : <span className="text-[10px] text-rail-400">Awaiting</span>;
            } },
            { key: 'actions', header: '', align: 'right', render: (j) => (
              <span className="inline-flex gap-1 justify-end">
                <Button size="sm" variant="secondary" onClick={() => open(j, 'approve')}>Approve</Button>
                <Button size="sm" variant="warn" onClick={() => open(j, 'flag')}>Flag</Button>
                <Button size="sm" variant="secondary" onClick={() => open(j, 'reject')}>Reject</Button>
              </span>
            ) },
          ]}
          rows={rows}
          empty={<EmptyState title="No completed possession matches the current filters." />}
        />
      </Panel>

      <Alert tone="idle" title="Session state only">
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
        title={cfg?.title || ''}
        subtitle={modal ? `${modal.job.task_id} · ${modal.job.maintenance_type} · ${modal.job.section_id}` : ''}
        maxWidth="max-w-lg"
      >
        {modal && (
          <div className="space-y-3">
            <p className="text-xs text-rail-600 leading-relaxed">{cfg.blurb}</p>

            <div className="grid grid-cols-2 gap-px bg-line border border-line">
              {[
                ['Executed', modal.job.execution_date],
                ['Window', `${minToHhmm(modal.job.start_minute)}–${minToHhmm(modal.job.end_minute)}`],
                ['Blocks', (modal.job.block_ids || []).join(' + ')],
                ['Crew', (modal.job.assigned_teams || []).join(', ')],
              ].map(([k, v]) => (
                <div key={k} className="bg-surface-panel px-3 py-2">
                  <div className="t-label">{k}</div>
                  <div className="font-mono text-[11px] text-rail-900 mt-0.5">{v}</div>
                </div>
              ))}
            </div>

            <div>
              <label className="t-label block mb-1">
                Comment {cfg.requiresComment ? <span className="text-status-critical">· required</span> : '· optional'}
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={cfg.requiresComment ? 'State the reason for this decision…' : 'Optional note…'}
                className="w-full text-xs bg-surface-panel border border-line rounded-sm px-2.5 py-2 text-rail-900 placeholder:text-rail-400 focus:outline-none focus:ring-1 focus:ring-status-info"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button
                variant={cfg.tone === 'critical' ? 'danger' : cfg.tone === 'warn' ? 'warn' : 'primary'}
                disabled={cfg.requiresComment && !comment.trim()}
                onClick={confirm}
              >
                {cfg.label}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
