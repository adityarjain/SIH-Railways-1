import React, { createContext, useContext, useState, useMemo } from 'react';
import initialPlanJson from '../data/optimized_block_plan.json';
// Two distinct optimizer runs, deliberately kept separate. `metrics` describes
// the scenario subset this UI actually renders; `baselineMetrics` describes the
// full 30,000-task run. Mixing them is what previously produced contradictory
// KPI figures, so each screen must state which one it is showing.
import metricsJson from '../data/optimization_metrics.json';
import fullRunMetricsJson from '../data/full_run_metrics.json';
import initialTasks from '../data/tasks_inventory.json';
import completedWorkJson from '../data/completed_work.json';
// Ritvik's actual outputs. These are produced by demo_closed_loop.py and were
// previously shipped but never read, so the operational screens retyped their
// contents as prose. Every conflict, route rejection and delay figure the UI
// shows must come from here.
import operationalDecisionJson from '../data/ritvik_operational_decision.json';
import replanRequestJson from '../data/replan_request.json';
import demoEventsJson from '../data/ritvik_demo_events.json';
// Both operational scenarios, each produced by an actual Ritvik engine run
// (scripts/generate_ritvik_scenarios.py).
import ritvikScenariosJson from '../data/ritvik_scenarios.json';
import { SIMULATION_EVENTS } from '../data/simulationData';

const PlanContext = createContext();

export const PlanContext_Provider = ({ children }) => {
  // Toggle between original schedule (07 Sep) and replanned schedule (08 Sep) for TASK-000005
  const [isReplanned, setIsReplanned] = useState(false);

  // Active operational event simulated
  const [activeEvent, setActiveEvent] = useState(null);

  // Status overrides for maintenance tasks (e.g. accepted, in_progress, completed)
  const [taskStatusOverrides, setTaskStatusOverrides] = useState({});

  // General user verification actions (approvals, false closure reports)
  const [verifications, setVerifications] = useState({
    'TASK-000421': { status: 'Verified', comments: 'Track alignment certified by station master', reportedAt: '2026-09-04 11:30' },
  });

  // Replan request state
  const [replanRequestActive, setReplanRequestActive] = useState(false);

  // Controller decisions on optimizer recommendations, keyed by task id.
  const [planDecisions, setPlanDecisions] = useState({});

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

  // Actions
  const toggleReplan = (state) => {
    const newState = state !== undefined ? state : !isReplanned;
    setIsReplanned(newState);
    if (newState) {
      setReplanRequestActive(false);
    }
  };

  const triggerEvent = (eventId) => {
    const ev = SIMULATION_EVENTS.find((e) => e.id === eventId);
    if (ev) {
      setActiveEvent(ev);
      if (ev.outcomeType === 'REPLAN_REQUEST') {
        setReplanRequestActive(true);
      }
    }
  };

  const clearEvent = () => {
    setActiveEvent(null);
    setReplanRequestActive(false);
  };

  const executeReplanFlow = () => {
    setIsReplanned(true);
    setReplanRequestActive(false);
  };

  const updateTaskStatus = (taskId, newStatus, reason = '', proposedDate = '') => {
    setTaskStatusOverrides((prev) => ({
      ...prev,
      [taskId]: {
        status: newStatus,
        reason,
        proposedDate,
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    }));
  };

  // --- OCC recommendation workflow -------------------------------------------
  // The controller accepts, amends or rejects the optimizer's recommendation.
  // Session state only, like the verification flow: nothing is written to an
  // external system, and the UI says so.
  const recordDecision = (taskId, decision, note = '') => {
    setPlanDecisions((prev) => ({
      ...prev,
      [taskId]: {
        decision,
        note,
        decidedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    }));
  };

  const approveRecommendation = (taskId, note = '') => recordDecision(taskId, 'APPROVED', note);
  const rejectRecommendation = (taskId, note = '') => {
    recordDecision(taskId, 'REJECTED', note);
    // A rejected possession is no longer an accepted plan; surface it as needing
    // re-optimization rather than silently leaving it approved.
    setReplanRequestActive(true);
  };
  const modifyRecommendation = (taskId, note = '') => recordDecision(taskId, 'MODIFIED', note);

  /**
   * Re-optimize. This does not run CP-SAT in the browser -- the solver is Python.
   * It applies the replan that `demo_closed_loop.py` actually produced, which is
   * committed as ritvik_operational_decision.json / replan_request.json, so the
   * resulting schedule is the optimizer's real output rather than a mock.
   */
  const reoptimize = (taskId = 'TASK-000005') => {
    setIsReplanned(true);
    setReplanRequestActive(false);
    recordDecision(taskId, 'RE_OPTIMIZED', 'Applied replan produced by optimizer.replan (replan_output/)');
  };

  const submitVerification = (taskId, action, comments = '') => {
    setVerifications((prev) => ({
      ...prev,
      [taskId]: {
        status: action === 'approve' ? 'Approved' : action === 'false_closure' ? 'False Closure Reported' : 'Rejected',
        comments,
        reportedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      },
    }));
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
        demoEvents: demoEventsJson.events || [],
        updateTaskStatus,
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
