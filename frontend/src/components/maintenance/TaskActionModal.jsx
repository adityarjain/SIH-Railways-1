import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { StatusBadge, Button, Alert } from '../ui';
import { minToHhmm } from '../../utils/time';
import { bandOf, bandTone } from '../../utils/risk';

/**
 * Crew action on a work order.
 *
 * The reason list is what a crew reports, not something the system knows: it
 * deliberately names no specific machine, because the dataset carries no
 * equipment identifiers and inventing one here would imply it does.
 */
const CONFIG = {
  accept: {
    title: 'Accept work order',
    confirm: 'Accept',
    variant: 'primary',
    blurb: 'Confirm your department has received this possession and the crew is available for the scheduled window.',
  },
  in_progress: {
    title: 'Start work',
    confirm: 'Start work',
    variant: 'primary',
    blurb: 'Confirm the possession is in force and on-site work has commenced.',
  },
  completed: {
    title: 'Complete work',
    confirm: 'Mark complete',
    variant: 'primary',
    blurb: 'Confirm the work is finished and the site is clear. The possession is recorded for verification by the controlling authority.',
  },
  pause: {
    title: 'Pause work',
    confirm: 'Pause',
    variant: 'warn',
    needsReason: true,
    reasonLabel: 'Reason for pausing',
  },
  issue: {
    title: 'Report an issue',
    confirm: 'Report issue',
    variant: 'warn',
    needsReason: true,
    reasonLabel: 'What is the issue',
  },
  reject: {
    title: 'Reject work order',
    confirm: 'Reject',
    variant: 'danger',
    needsReason: true,
    reasonLabel: 'Reason for rejection',
  },
  reschedule: {
    title: 'Request schedule change',
    confirm: 'Request change',
    variant: 'warn',
    needsReason: true,
    needsDate: true,
    reasonLabel: 'Reason for the change',
  },
};

const REASONS = [
  'Crew unavailable',
  'Equipment unavailable',
  'Site or weather condition unsafe',
  'Work requires a longer possession',
  'Conflicting emergency work elsewhere',
  'Access to the section not available',
  'Other',
];

export const TaskActionModal = ({ isOpen, onClose, task, actionType, onSubmit }) => {
  const [reason, setReason] = useState(REASONS[0]);
  const [notes, setNotes] = useState('');
  const [proposedDate, setProposedDate] = useState('');

  if (!task || !actionType) return null;

  const cfg = CONFIG[actionType] || CONFIG.accept;
  const blocked = cfg.needsReason && reason === 'Other' && !notes.trim();

  const submit = (e) => {
    e.preventDefault();
    if (blocked) return;
    const finalReason = cfg.needsReason
      ? (reason === 'Other' ? notes.trim() : `${reason}${notes.trim() ? ` — ${notes.trim()}` : ''}`)
      : '';
    onSubmit(task.task_id, actionType, finalReason, proposedDate || task.scheduled_date || '');
    onClose();
  };

  const band = bandOf(task);
  const win = task.start_minute != null ? `${minToHhmm(task.start_minute)}–${minToHhmm(task.end_minute)}` : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={cfg.title}
      subtitle={`${task.task_id} · ${task.department}`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={submit} className="space-y-3">
        {/* work order summary */}
        <div className="border border-line">
          <div className="px-3 py-2 bg-surface-sunken border-b border-line flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-rail-900">{task.maintenance_type}</span>
            {band && (
              <StatusBadge tone={bandTone(band)} size="sm">
                {band} · {task.risk_score?.toFixed?.(1) ?? task.risk_score}
              </StatusBadge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-px bg-line">
            {[
              ['Section', task.section_id],
              ['Window', win || 'Not scheduled'],
              ['Blocks', (task.block_ids || []).join(' + ') || 'Not assigned'],
              ['Crew', (task.assigned_teams || []).join(', ') || 'Not assigned'],
            ].map(([k, v]) => (
              <div key={k} className="bg-surface-panel px-3 py-2">
                <div className="t-label">{k}</div>
                <div className="font-mono text-[11px] text-rail-900 mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        </div>

        {cfg.needsReason ? (
          <div className="space-y-2.5">
            <div>
              <label className="t-label block mb-1">{cfg.reasonLabel}</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full text-xs bg-surface-panel border border-line rounded-sm px-2.5 py-2 text-rail-900 focus:outline-none focus:ring-1 focus:ring-status-info"
              >
                {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {cfg.needsDate && (
              <div>
                <label className="t-label block mb-1">Proposed date</label>
                <input
                  type="date"
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                  className="w-full text-xs bg-surface-panel border border-line rounded-sm px-2.5 py-2 text-rail-900 focus:outline-none focus:ring-1 focus:ring-status-info"
                />
              </div>
            )}

            <div>
              <label className="t-label block mb-1">
                Notes {reason === 'Other' ? <span className="text-status-critical">· required</span> : '· optional'}
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detail for the controlling authority…"
                className="w-full text-xs bg-surface-panel border border-line rounded-sm px-2.5 py-2 text-rail-900 placeholder:text-rail-400 focus:outline-none focus:ring-1 focus:ring-status-info"
              />
            </div>
          </div>
        ) : (
          <Alert tone="info">{cfg.blurb}</Alert>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant={cfg.variant} disabled={blocked}>{cfg.confirm}</Button>
        </div>
      </form>
    </Modal>
  );
};
