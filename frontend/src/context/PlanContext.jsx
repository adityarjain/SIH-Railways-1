import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import initialPlanRaw from '../data/optimized_block_plan.json';
// Two distinct optimizer runs, deliberately kept separate. `metrics` describes
// the scenario subset this UI actually renders; `baselineMetrics` describes the
// full 30,000-task run. Mixing them is what previously produced contradictory
// KPI figures, so each screen must state which one it is showing.
import metricsJson from '../data/optimization_metrics.json';
import fullRunMetricsJson from '../data/full_run_metrics.json';
import initialTasksRaw from '../data/tasks_inventory.json';
import completedWorkJson from '../data/live/completedWork';
// Ritvik's actual outputs. These are produced by demo_closed_loop.py and were
// previously shipped but never read, so the operational screens retyped their
// contents as prose. Every conflict, route rejection and delay figure the UI
// shows must come from here.
import operationalDecisionJson from '../data/ritvik_operational_decision.json';
import replanRequestJson from '../data/replan_request.json';
import demoEventsRaw from '../data/ritvik_demo_events.json';
// Both operational scenarios, each produced by an actual Ritvik engine run
// (scripts/generate_ritvik_scenarios.py).
import ritvikScenariosRaw from '../data/ritvik_scenarios.json';
import { SIMULATION_EVENTS } from '../data/simulationData';
import { shiftDatesDeep } from '../utils/dateShift';
import { minToHhmm } from '../utils/time';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';
import { replay } from './planEvents';
import { alertsFor, visibleInHistory } from './alerts';

// The demo scenario's own artifacts are date-shifted onto a live rolling
// window (see utils/dateShift.js) so the 14-day dataset keeps re-presenting
// itself on today's real dates instead of drifting stale. The full
// 30,000-task run (fullRunMetricsJson) is a real historical run and stays
// untouched.
const initialPlanJson = shiftDatesDeep(initialPlanRaw);
const initialTasks = shiftDatesDeep(initialTasksRaw);
const demoEventsJson = shiftDatesDeep(demoEventsRaw);
const ritvikScenariosJson = shiftDatesDeep(ritvikScenariosRaw);

const PlanContext = createContext();

const TASK_DEPT = Object.fromEntries(initialTasks.map((t) => [t.task_id, t.department]));
export const deptOf = (taskId) => TASK_DEPT[taskId];

/** Merge freshly fetched events into the list, keeping id order, no dupes. */
const mergeEvents = (prev, fresh) => {
  if (!fresh.length) return prev;
  const seen = new Set(prev.map((e) => e.id));
  const add = fresh.filter((e) => !seen.has(e.id));
  return add.length ? [...prev, ...add].sort((x, y) => x.id - y.id) : prev;
};

const POLL_MS = 10_000;

export const PlanContext_Provider = ({ children }) => {
  const { mode, currentUser } = useAuth();

  // The event log. Everything below the fold of this component is derived
  // from it (see planEvents.js), so there is exactly one source of truth.
  const [events, setEvents] = useState([]);
  const [saveError, setSaveError] = useState(null);
  const [alertsSeenId, setAlertsSeenId] = useState(0);
  const localSeq = useRef(1);

  const username = currentUser?.username;

  // API mode: load the shared log on sign-in, then poll for other people's
  // actions. Browser-only mode keeps its in-memory log across role switches.
  useEffect(() => {
    if (mode !== 'api' || !username) return undefined;
    let live = true;
    let last = 0;
    let first = true;
    const pull = async () => {
      try {
        const fresh = await api.events(last);
        if (!live) return;
        // The first load replaces whatever a previous account left in memory.
        if (first) { first = false; setEvents(fresh); }
        else if (fresh.length) setEvents((prev) => mergeEvents(prev, fresh));
        if (fresh.length) last = fresh[fresh.length - 1].id;
      } catch (err) {
        if (live && err.status !== 401) setSaveError(err.message);
      }
    };
    pull();
    api.alertsSeen().then((r) => live && setAlertsSeenId(r.last_event_id)).catch(() => {});
    const timer = setInterval(pull, POLL_MS);
    return () => { live = false; clearInterval(timer); };
  }, [mode, username]);

  const emit = useCallback(async (kind, taskId, payload = {}) => {
    if (mode === 'api') {
      try {
        const ev = await api.appendEvent(kind, taskId, payload);
        setEvents((prev) => mergeEvents(prev, [ev]));
        setSaveError(null);
        return ev;
      } catch (err) {
        setSaveError(err.message);
        return null;
      }
    }
    const ev = {
      id: localSeq.current++,
      ts: new Date().toISOString(),
      kind,
      task_id: taskId ?? null,
      payload,
      actor: {
        username: currentUser?.username, name: currentUser?.name,
        role: currentUser?.role, department: currentUser?.department,
      },
    };
    setEvents((prev) => [...prev, ev]);
    return ev;
  }, [mode, currentUser]);

  const state = useMemo(() => replay(events), [events]);
  const {
    isReplanned, activeEventId, replanRequestActive, taskStatusOverrides,
    verifications, planDecisions, requirements, evidence,
  } = state;
  const activeEvent = useMemo(
    () => SIMULATION_EVENTS.find((e) => e.id === activeEventId) || null,
    [activeEventId],
  );

  // Derive scheduled tasks based on isReplanned state
  // The replanned record is the optimizer's actual output, captured by
  // scripts/generate_ritvik_scenarios.py -- not a hand-written stand-in.
  const replannedRecord = ritvikScenariosJson.replanned_record;

  const scheduledTasks = useMemo(() => {
    return initialPlanJson.scheduled_tasks.map((task) =>
      task.task_id === replannedRecord.task_id && isReplanned ? replannedRecord : task
    );
  }, [isReplanned, replannedRecord]);

  // Derive all tasks inventory with live status overrides
  const tasksInventory = useMemo(() => {
    return initialTasks.map((t) => {
      let currentStatus = t.status;
      if (taskStatusOverrides[t.task_id]) {
        currentStatus = taskStatusOverrides[t.task_id].status;
      }
      const isReplannedTask = t.task_id === replannedRecord.task_id && isReplanned;
      if (isReplannedTask) {
        currentStatus = 'Replanned';
      }
      return {
        ...t,
        // Replanning moves the window, blocks and crew; the maintenance portal
        // must show the new ones rather than the original with a new label.
        ...(isReplannedTask
          ? {
              scheduled_date: replannedRecord.date,
              start_minute: replannedRecord.start_minute,
              end_minute: replannedRecord.end_minute,
              block_ids: replannedRecord.block_ids,
              assigned_teams: replannedRecord.assigned_teams,
            }
          : {}),
        status: currentStatus,
        statusMeta: taskStatusOverrides[t.task_id] || null,
      };
    });
  }, [isReplanned, taskStatusOverrides, replannedRecord]);

  // Actions. Each appends one event; the replay above does the rest.
  const replanMove = {
    task_id: replannedRecord.task_id,
    date: replannedRecord.date,
    window: `${minToHhmm(replannedRecord.start_minute)}–${minToHhmm(replannedRecord.end_minute)}`,
  };

  const toggleReplan = (on) => emit('replan_toggled', null, { on: on !== undefined ? !!on : !isReplanned, ...replanMove });

  const triggerEvent = (eventId) => {
    const ev = SIMULATION_EVENTS.find((e) => e.id === eventId);
    if (ev) emit('event_triggered', null, { event_id: eventId, replan_request: ev.outcomeType === 'REPLAN_REQUEST' });
  };

  const clearEvent = () => emit('event_cleared', null, {});

  const executeReplanFlow = () => toggleReplan(true);

  const updateTaskStatus = (taskId, newStatus, reason = '', proposedDate = '') =>
    emit('status_changed', taskId, { status: newStatus, reason, proposedDate });

  // --- OCC recommendation workflow -------------------------------------------
  // The controller accepts, amends or rejects the optimizer's recommendation.
  // A rejection raises a replan request (applied in planEvents.js).
  const recordDecision = (taskId, decision, note = '') => emit('decision_recorded', taskId, { decision, note });

  const approveRecommendation = (taskId, note = '') => recordDecision(taskId, 'APPROVED', note);
  const rejectRecommendation = (taskId, note = '') => recordDecision(taskId, 'REJECTED', note);
  const modifyRecommendation = (taskId, note = '') => recordDecision(taskId, 'MODIFIED', note);

  /**
   * Re-optimize. This does not run CP-SAT in the browser -- the solver is Python.
   * It applies the replan that `demo_closed_loop.py` actually produced, which is
   * committed as ritvik_operational_decision.json / replan_request.json, so the
   * resulting schedule is the optimizer's real output rather than a mock.
   */
  const reoptimize = async (taskId = 'TASK-000005') => {
    await emit('replan_toggled', null, { on: true, ...replanMove });
    await recordDecision(taskId, 'RE_OPTIMIZED', 'Applied replan produced by optimizer.replan (replan_output/)');
  };

  const submitVerification = (taskId, action, comments = '') =>
    emit('verification_submitted', taskId, {
      status: { approve: 'Approved', flag: 'Flagged', false_closure: 'False Closure Reported' }[action] || 'Rejected',
      comments,
    });

  /** Field crew revises what a task needs before it is planned. */
  const submitRequirement = (taskId, req) => emit('requirement_submitted', taskId, req);

  /**
   * Completion evidence: a note and an optional photo. With the API the photo
   * is uploaded and referenced by id; browser-only mode keeps the (already
   * downscaled) data URL in memory.
   */
  const addEvidence = async (taskId, { note = '', photo = null }) => {
    let extra = {};
    if (photo) {
      if (mode === 'api') {
        try {
          const f = await api.uploadPhoto(photo.name, photo.dataUrl);
          extra = { file_id: f.id };
        } catch (err) {
          setSaveError(err.message);
          return null;
        }
      } else {
        extra = { data_url: photo.dataUrl };
      }
    }
    return emit('evidence_added', taskId, { note, ...extra });
  };

  const photoSrc = (item) => (item.fileId != null ? api.fileUrl(item.fileId) : item.dataUrl);

  const alerts = useMemo(() => alertsFor(currentUser, events, deptOf), [currentUser, events]);
  const unseenAlerts = alerts.filter((a) => a.id > alertsSeenId).length;
  const markAlertsSeen = () => {
    const top = events.length ? events[events.length - 1].id : 0;
    setAlertsSeenId(top);
    if (mode === 'api') api.markAlertsSeen(top).catch(() => {});
  };

  const historyEvents = useMemo(
    () => events.filter((e) => visibleInHistory(currentUser, e, deptOf)),
    [currentUser, events],
  );

  const resetSaved = async () => {
    if (mode === 'api') await api.reset();
    setEvents([]);
    setAlertsSeenId(0);
  };

  return (
    <PlanContext.Provider
      value={{
        isReplanned,
        toggleReplan,
        activeEvent,
        triggerEvent,
        clearEvent,
        executeReplanFlow,
        replanRequestActive,
        scheduledTasks,
        tasksInventory,
        metrics: metricsJson,
        baselineMetrics: fullRunMetricsJson,
        completedWork: completedWorkJson,
        // Ritvik pipeline outputs, read rather than retyped
        operationalDecision: operationalDecisionJson,
        replanRequest: replanRequestJson,
        rerouteScenario: ritvikScenariosJson.reroute,
        holdScenario: ritvikScenariosJson.hold,
        replanScenario: ritvikScenariosJson.replan,
        blockUnavailableScenario: ritvikScenariosJson.block_unavailable,
        replanMetadata: ritvikScenariosJson.replan_metadata,
        criteriaCoverage: ritvikScenariosJson.criteria_coverage,
        // The timeline colours the replanned possession from this rather than
        // from a hardcoded task id / date pair.
        replannedRecord,
        scenarioProvenance: ritvikScenariosJson.provenance,
        demoEvents: demoEventsJson.events || [],
        updateTaskStatus,
        events,
        historyEvents,
        saveError,
        clearSaveError: () => setSaveError(null),
        requirements,
        submitRequirement,
        evidence,
        addEvidence,
        photoSrc,
        alerts,
        unseenAlerts,
        markAlertsSeen,
        resetSaved,
        verifications,
        submitVerification,
        planDecisions,
        approveRecommendation,
        rejectRecommendation,
        modifyRecommendation,
        reoptimize,
      }}
    >
      {children}
    </PlanContext.Provider>
  );
};

export const usePlan = () => useContext(PlanContext);
