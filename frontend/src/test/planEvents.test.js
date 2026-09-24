import { describe, it, expect } from 'vitest';
import { applyEvent, replay, initialPlanState } from '../context/planEvents';

const ev = (id, kind, task_id, payload = {}, actor = { name: 'Tester', username: 't' }) =>
  ({ id, ts: '2026-09-25T10:15:00Z', kind, task_id, payload, actor });

describe('plan event replay', () => {
  it('records status changes per task', () => {
    const s = replay([ev(1, 'status_changed', 'TASK-1', { status: 'In Progress', reason: 'r' })]);
    expect(s.taskStatusOverrides['TASK-1']).toMatchObject({ status: 'In Progress', reason: 'r', by: 'Tester' });
  });

  it('a rejected recommendation raises a replan request; re-optimizing applies the replan', () => {
    const rejected = replay([ev(1, 'decision_recorded', 'TASK-5', { decision: 'REJECTED' })]);
    expect(rejected.replanRequestActive).toBe(true);
    const reopt = applyEvent(rejected, ev(2, 'decision_recorded', 'TASK-5', { decision: 'RE_OPTIMIZED' }));
    expect(reopt.isReplanned).toBe(true);
    expect(reopt.replanRequestActive).toBe(false);
  });

  it('replan toggles on and off', () => {
    const on = replay([ev(1, 'replan_toggled', null, { on: true })]);
    expect(on.isReplanned).toBe(true);
    expect(applyEvent(on, ev(2, 'replan_toggled', null, { on: false })).isReplanned).toBe(false);
  });

  it('keeps the latest verification and requirement, and appends evidence', () => {
    const s = replay([
      ev(1, 'verification_submitted', 'TASK-2', { status: 'Rejected', comments: 'a' }),
      ev(2, 'verification_submitted', 'TASK-2', { status: 'Approved' }),
      ev(3, 'requirement_submitted', 'TASK-2', { duration: 90, teamSize: 4, window: 'night', canBundle: false }),
      ev(4, 'evidence_added', 'TASK-2', { note: 'one', file_id: 7 }),
      ev(5, 'evidence_added', 'TASK-2', { note: 'two' }),
    ]);
    expect(s.verifications['TASK-2'].status).toBe('Approved');
    expect(s.requirements['TASK-2']).toMatchObject({ duration: 90, teamSize: 4, window: 'night', canBundle: false });
    expect(s.evidence['TASK-2'].map((x) => x.note)).toEqual(['one', 'two']);
    expect(s.evidence['TASK-2'][0].fileId).toBe(7);
  });

  it('keeps the seeded verification and ignores unknown kinds', () => {
    const s = replay([ev(1, 'from_the_future', 'TASK-9', {})]);
    expect(s).toEqual(initialPlanState);
  });

  it('a disruption with a replan request raises it; clearing drops both', () => {
    const s = replay([ev(1, 'event_triggered', null, { event_id: 'E1', replan_request: true })]);
    expect(s.activeEventId).toBe('E1');
    expect(s.replanRequestActive).toBe(true);
    const c = applyEvent(s, ev(2, 'event_cleared', null));
    expect(c.activeEventId).toBe(null);
    expect(c.replanRequestActive).toBe(false);
  });
});
