import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { StatusBadge, Button, Alert } from '../ui';
import { minToHhmm } from '../../utils/time';
import { bandOf, bandTone } from '../../utils/risk';
import { usePlan } from '../../context/PlanContext';
import { shrinkPhoto } from '../../utils/photo';

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
    evidence: true,
  },
  handoff: {
    title: 'Handoff record',
    confirm: 'Record handoff',
    variant: 'primary',
    blurb: 'Record that the work is complete and the section is handed back. The note and photo go to the controlling authority with the verification request.',
    evidence: true,
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
  const [photo, setPhoto] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [saving, setSaving] = useState(false);
  const { addEvidence } = usePlan();

  if (!task || !actionType) return null;

  const cfg = CONFIG[actionType] || CONFIG.accept;
  const blocked = cfg.needsReason && reason === 'Other' && !notes.trim();

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    setPhotoError('');
    if (!file) { setPhoto(null); return; }
    try {
      setPhoto(await shrinkPhoto(file));
    } catch (err) {
      setPhoto(null);
      setPhotoError(err.message);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (blocked || saving) return;
    // Completion evidence is saved first, so the "Completed" status never
    // lands without the note and photo the crew attached to it.
    if (cfg.evidence && (photo || notes.trim())) {
      setSaving(true);
      const ok = await addEvidence(task.task_id, { note: notes.trim(), photo });
      setSaving(false);
      if (!ok) return;
    }
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
            <span className="text-xs font-semibold text-ws-ink">{task.maintenance_type}</span>
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
                <div className="font-mono text-[11px] text-ws-ink mt-0.5">{v}</div>
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
                className="w-full text-xs bg-surface-panel border border-line rounded-sm px-2.5 py-2 text-ws-ink focus:outline-none focus:ring-1 focus:ring-status-info"
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
                  className="w-full text-xs bg-surface-panel border border-line rounded-sm px-2.5 py-2 text-ws-ink focus:outline-none focus:ring-1 focus:ring-status-info"
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
                className="w-full text-xs bg-surface-panel border border-line rounded-sm px-2.5 py-2 text-ws-ink placeholder:text-rail-400 focus:outline-none focus:ring-1 focus:ring-status-info"
              />
            </div>
          </div>
        ) : (
          <Alert tone="info">{cfg.blurb}</Alert>
        )}

        {cfg.evidence && (
          <div className="space-y-2.5">
            <div>
              <label className="t-label block mb-1" htmlFor="completion-note">Completion note · optional</label>
              <textarea
                id="completion-note"
                rows={3}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What was done, readings taken, anything left for the next shift"
                className="w-full text-xs bg-surface-panel border border-line rounded-sm px-2.5 py-2 text-ws-ink placeholder:text-rail-400"
              />
            </div>
            <div>
              <label className="t-label block mb-1" htmlFor="completion-photo">Site photo · optional</label>
              <input
                id="completion-photo"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={pickPhoto}
                className="block w-full text-xs text-ws-mid file:mr-3 file:px-3 file:py-1.5 file:border file:border-ws-ink file:bg-ws-surface file:font-display file:font-bold file:uppercase file:text-[11px] file:text-ws-ink"
              />
              {photoError && <p className="text-[12px] text-ws-critical mt-1">{photoError}</p>}
              {photo && <img src={photo.dataUrl} alt="Selected site photo" className="mt-2 max-h-40 border border-ws-rule" />}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant={cfg.variant} disabled={blocked || saving}>{saving ? 'Saving…' : cfg.confirm}</Button>
        </div>
      </form>
    </Modal>
  );
};
