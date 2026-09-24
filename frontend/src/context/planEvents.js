/**
 * The plan's shared state as a fold over the event log.
 *
 * Every action in the app is appended as an event (to the Operations API when
 * it is running, or kept in memory in browser-only mode). The state below is
 * rebuilt by replaying events in order, so a refresh, a second browser or a
 * second role all see the same thing. The audit history and alerts read the
 * same events rather than keeping their own copies.
 */

const hhmm = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
const stamp = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const initialPlanState = {
  isReplanned: false,
  activeEventId: null,
  replanRequestActive: false,
  taskStatusOverrides: {},
  // One verification ships with the dataset so the verification screen is not
  // empty on a fresh start; it is labelled as seeded wherever it is shown.
  verifications: {
    'TASK-000421': { status: 'Verified', comments: 'Track alignment certified by station master', reportedAt: '2026-09-04 11:30', seeded: true },
  },
  planDecisions: {},
  requirements: {},
  evidence: {},
};

export const applyEvent = (state, e) => {
  const p = e.payload || {};
  const by = e.actor?.name || '';
  const tid = e.task_id;
  switch (e.kind) {
    case 'status_changed':
      return {
        ...state,
        taskStatusOverrides: {
          ...state.taskStatusOverrides,
          [tid]: { status: p.status, reason: p.reason || '', proposedDate: p.proposedDate || '', updatedAt: hhmm(e.ts), by },
        },
      };
    case 'decision_recorded': {
      const next = {
        ...state,
        planDecisions: { ...state.planDecisions, [tid]: { decision: p.decision, note: p.note || '', decidedAt: hhmm(e.ts), by } },
      };
      if (p.decision === 'REJECTED') next.replanRequestActive = true;
      if (p.decision === 'RE_OPTIMIZED') Object.assign(next, { isReplanned: true, replanRequestActive: false });
      return next;
    }
    case 'verification_submitted':
      return {
        ...state,
        verifications: { ...state.verifications, [tid]: { status: p.status, comments: p.comments || '', reportedAt: stamp(e.ts), by } },
      };
    case 'replan_toggled':
      return { ...state, isReplanned: !!p.on, replanRequestActive: p.on ? false : state.replanRequestActive };
    case 'event_triggered':
      return { ...state, activeEventId: p.event_id, replanRequestActive: p.replan_request ? true : state.replanRequestActive };
    case 'event_cleared':
      return { ...state, activeEventId: null, replanRequestActive: false };
    case 'requirement_submitted':
      return {
        ...state,
        requirements: {
          ...state.requirements,
          [tid]: {
            duration: p.duration, teamSize: p.teamSize, window: p.window, canBundle: p.canBundle,
            note: p.note || '', submittedAt: stamp(e.ts), by,
          },
        },
      };
    case 'evidence_added':
      return {
        ...state,
        evidence: {
          ...state.evidence,
          [tid]: [...(state.evidence[tid] || []), { note: p.note || '', fileId: p.file_id ?? null, dataUrl: p.data_url || null, at: stamp(e.ts), by }],
        },
      };
    default:
      return state; // unknown kinds from a newer server are ignored, not fatal
  }
};

export const replay = (events, base = initialPlanState) => events.reduce(applyEvent, base);
