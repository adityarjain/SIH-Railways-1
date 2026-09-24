/**
 * Alerts are not stored separately: they are the events in the log that
 * matter to the person looking, excluding their own actions.
 *
 * Ground (per department): the controller's decisions on their tasks, a
 * replan that moves their block, and verification verdicts on their work.
 * Authority: work closed, issues and change requests from the field, photo
 * evidence, and revised requirements. Admin has no operational alerts.
 */
const AUTHORITY = 'Authority';
const GROUND = 'Ground Operations';

const ISSUE_STATUSES = new Set(['Issue Reported', 'Paused', 'Rejected by Field Crew']);

export const alertsFor = (user, events, deptOf) => {
  if (!user) return [];
  const out = [];
  for (const e of events) {
    if (e.actor?.username === user.username) continue;
    const p = e.payload || {};
    const task = e.task_id || p.task_id;
    const base = { id: e.id, ts: e.ts, task };

    if (user.role === GROUND) {
      if (!task || deptOf(task) !== user.department) continue;
      if (e.kind === 'decision_recorded') {
        out.push({ ...base, tone: p.decision === 'REJECTED' ? 'critical' : 'info', key: 'alerts.decision', params: { task, decision: p.decision }, tab: 'my-tasks' });
      } else if (e.kind === 'replan_toggled' && p.on) {
        out.push({ ...base, tone: 'warn', key: 'alerts.blockMoved', params: { task, date: p.date || '', window: p.window || '' }, tab: 'active-block' });
      } else if (e.kind === 'verification_submitted') {
        out.push({ ...base, tone: p.status === 'Approved' ? 'ok' : 'critical', key: 'alerts.verdict', params: { task, status: p.status }, tab: 'completed' });
      }
    } else if (user.role === AUTHORITY) {
      if (e.kind === 'status_changed') {
        if (p.status === 'Completed') {
          out.push({ ...base, tone: 'ok', key: 'alerts.closed', params: { task, by: e.actor?.department || '' }, tab: 'general-verify' });
        } else if (ISSUE_STATUSES.has(p.status) || String(p.status || '').startsWith('Reschedule')) {
          out.push({ ...base, tone: 'warn', key: 'alerts.fieldIssue', params: { task, status: p.status }, tab: 'history' });
        }
      } else if (e.kind === 'evidence_added') {
        out.push({ ...base, tone: 'info', key: 'alerts.evidence', params: { task }, tab: 'general-verify' });
      } else if (e.kind === 'requirement_submitted') {
        out.push({ ...base, tone: 'info', key: 'alerts.requirement', params: { task }, tab: 'history' });
      }
    }
  }
  return out.reverse(); // newest first
};

/** Which events a role may browse in the audit history. */
export const visibleInHistory = (user, e, deptOf) => {
  if (!user) return false;
  if (user.role !== GROUND) return true;
  const task = e.task_id || e.payload?.task_id;
  return !!task && deptOf(task) === user.department;
};
