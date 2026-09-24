import { describe, it, expect } from 'vitest';
import { alertsFor, visibleInHistory } from '../context/alerts';

const DEPT = { 'TASK-A': 'Electrical / TRD', 'TASK-B': 'Track / Civil Engineering' };
const deptOf = (t) => DEPT[t];
const ground = { username: 'sse_trd', role: 'Ground Operations', department: 'Electrical / TRD' };
const authority = { username: 'controller', role: 'Authority', department: 'Operations Control' };
const admin = { username: 'admin', role: 'Admin' };
const by = (u) => ({ username: u.username, department: u.department });
const ev = (id, kind, task_id, payload, actor) => ({ id, ts: '2026-09-25T10:00:00Z', kind, task_id, payload, actor });

const log = [
  ev(1, 'decision_recorded', 'TASK-A', { decision: 'REJECTED' }, by(authority)),
  ev(2, 'decision_recorded', 'TASK-B', { decision: 'APPROVED' }, by(authority)),
  ev(3, 'replan_toggled', null, { on: true, task_id: 'TASK-A', date: '2026-09-26', window: '18:00–21:20' }, by(authority)),
  ev(4, 'status_changed', 'TASK-A', { status: 'Completed' }, by(ground)),
  ev(5, 'evidence_added', 'TASK-A', { note: 'x' }, by(ground)),
  ev(6, 'verification_submitted', 'TASK-A', { status: 'False Closure Reported' }, by(authority)),
];

describe('alerts', () => {
  it('ground sees decisions, moves and verdicts on its own department only, newest first', () => {
    const a = alertsFor(ground, log, deptOf);
    expect(a.map((x) => x.id)).toEqual([6, 3, 1]);
    expect(a[0]).toMatchObject({ tone: 'critical', key: 'alerts.verdict' });
    expect(a[1]).toMatchObject({ key: 'alerts.blockMoved', params: { date: '2026-09-26' } });
  });

  it('authority sees field closures and evidence, not its own actions', () => {
    const a = alertsFor(authority, log, deptOf);
    expect(a.map((x) => x.key)).toEqual(['alerts.evidence', 'alerts.closed']);
  });

  it('admin has no operational alerts; signed-out has none', () => {
    expect(alertsFor(admin, log, deptOf)).toEqual([]);
    expect(alertsFor(null, log, deptOf)).toEqual([]);
  });

  it('ground history is limited to its department; others see all', () => {
    expect(log.filter((e) => visibleInHistory(ground, e, deptOf)).map((e) => e.id)).toEqual([1, 3, 4, 5, 6]);
    expect(log.filter((e) => visibleInHistory(authority, e, deptOf))).toHaveLength(6);
  });
});
