import React, { createContext, useContext, useState } from 'react';
import { ROLES } from './AuthContext';

const DemoGuideContext = createContext();

export const DEMO_STEPS = [
  {
    step: 1,
    replanned: false,
    title: "1. Operations Overview",
    page: "overview",
    role: ROLES.AUTHORITY,
    description: "Start at the operations overview: the 14-day planning horizon, headline optimizer figures, corridor network status, and upcoming maintenance possessions.",
    tip: "These figures are the full 30,000-task optimizer run, recorded in benchmarks/full_run_metrics.json. The planning screen reports a smaller demo scenario and is captioned separately."
  },
  {
    step: 2,
    replanned: false,
    title: "2. Maintenance Demand Inventory",
    page: "demand",
    role: ROLES.AUTHORITY,
    description: "Browse the maintenance demand submitted by the civil, electrical, signal and mechanical departments. This screen ships a 163-task sample of the 30,000-task inventory.",
    tip: "Click 'TASK-000005' in the table to inspect its predicted failure risk."
  },
  {
    step: 3,
    replanned: false,
    title: "3. Predicted Failure Risk",
    page: "demand",
    role: ROLES.AUTHORITY,
    highlightTask: "TASK-000005",
    description: "Asset AST-120005 carries a risk score of 81.0 (CRITICAL), a 30-day failure probability of 81.03%, and a 30-day degradation forecast of 71.1.",
    tip: "The risk model supplies the objective signal that prioritizes this task for the optimizer."
  },
  {
    step: 4,
    replanned: false,
    title: "4. Automatic Block Planning Hero Screen",
    page: "block-planning",
    role: ROLES.AUTHORITY,
    description: "The core screen of the system. Visualizes the conflict-free maintenance schedule on a horizontal 24-hour Gantt timeline across railway sections.",
    tip: "See TASK-000005 scheduled on SEC-0004 in night blocks BLK-009637 + BLK-009638 (00:00 - 03:20)."
  },
  {
    step: 5,
    replanned: false,
    title: "5. Why This Block Was Selected",
    page: "block-planning",
    role: ROLES.AUTHORITY,
    openDecisionTrace: true,
    description: "Inspect the decision trace: risk input -> maintenance specification -> 12 candidate block windows, 10 rejected by constraint -> crew match -> the best feasible assignment.",
    tip: "Each rejection cites the rule that caused it: C002 train conflict, C003 track unavailable, C001/S002 duration coverage."
  },
  {
    step: 6,
    replanned: false,
    title: "6. Cross-Department Bundling",
    page: "block-planning",
    role: ROLES.AUTHORITY,
    description: "Examine SEC-0073: Track/Civil TASK-018159 and Electrical/TRD TASK-016913 are coordinated into one shared possession window, overlapping by 81 minutes against a 30-minute rule minimum.",
    tip: "No saving or disruption-avoided figure is reported: measuring one needs an unbundled counterfactual plan, which this project does not produce."
  },
  {
    step: 7,
    replanned: false,
    title: "7. Event Simulator: Inject Operational Disruption",
    page: "simulator",
    role: ROLES.AUTHORITY,
    description: "Open the Event Simulator. Each button loads one real engine run. Click 'New Train (Priority)' to inject the priority-1 movement TRN-SIM-002 into SEC-0004.",
    tip: "The button labelled 'No engine scenario' is deliberate: that event class is not a maintenance-plan conflict, so the conflict engine does not run on it."
  },
  {
    step: 8,
    replanned: false,
    title: "8. Live Operations: Conflict Detected",
    page: "live-ops",
    role: ROLES.AUTHORITY,
    description: "The interval-overlap check flags the collision between TRN-SIM-002 and the TASK-000005 possession on SEC-0004, and identifies it as the affected train.",
    tip: "Overlap test: train_arrival < possession_end AND train_departure > possession_start."
  },
  {
    step: 9,
    replanned: false,
    title: "9. Three Operational Outcomes: Reroute, Hold, Replan",
    page: "live-ops",
    role: ROLES.AUTHORITY,
    description: "There are three available responses. REROUTE (train TRN-SIM-001 via SEC-0007, +16 min computed from section length and line speed). HOLD (low-priority train waits 35 min, inside the 45-min limit). REPLAN when neither is feasible. The Criteria Coverage panel states exactly what is evaluated and what is not.",
    tip: "Every figure on this screen comes from a real engine run. Downstream-impact and sequencing are explicitly marked NOT_IMPLEMENTED."
  },
  {
    step: 10,
    replanned: false,
    title: "10. Rerouting and Holding Both Infeasible -> REPLAN REQUEST",
    page: "simulator",
    role: ROLES.AUTHORITY,
    description: "TRN-SIM-002 is priority 1 (never held) and every bypass is saturated, so the only safe option is to move the possession. A targeted replan request is emitted with the rejected routes attached.",
    tip: "The replanning layer is not a scheduler. It hands the decision back to the CP-SAT optimizer."
  },
  {
    step: 11,
    replanned: true,
    title: "11. CP-SAT Re-Optimization",
    page: "simulator",
    role: ROLES.AUTHORITY,
    description: "The optimizer consumes the replan request, blacklists BLK-009637 + BLK-009638, and re-optimizes TASK-000005 to 08 Sep (18:00 - 21:20) with TEAM-015.",
    tip: "Returns a feasible alternative in well under a second and writes the revised plan to replan_output/."
  },
  {
    step: 12,
    replanned: true,
    title: "12. Replanning Audit: Before, Disruption, After",
    page: "replanning",
    role: ROLES.AUTHORITY,
    description: "Side-by-side: original possession (07 Sep, TEAM-013) -> the conflict -> the re-optimized possession (08 Sep 18:00-21:20, BLK-012046+47, TEAM-015). The audit record below shows action taken, routes inspected, hold outcome, measured replan runtime, and 52/53 tasks unchanged (by construction).",
    tip: "Retention is 100% by construction, not a benchmark: the replan scope is a single task and every other record is copied unchanged."
  },
  {
    step: 13,
    replanned: true,
    title: "13. Ground Operations Receives the Updated Work Order",
    page: "my-tasks",
    role: ROLES.GROUND,
    description: "Hand off to Ground Operations. The TRD crew sees the re-optimized work order on 08 Sep (18:00 - 21:20) with TEAM-015, and can start, pause, report an issue or complete it.",
    tip: "The field view carries no optimizer internals or network analytics -- only what the crew needs to execute the possession."
  },
  {
    step: 14,
    replanned: true,
    title: "14. Authority Verifies the Completed Work",
    page: "general-verify",
    role: ROLES.AUTHORITY,
    description: "Back in Authority. Completed possessions are listed for verification -- approve, reject, or flag a closure for review. Decisions are held in session state only; nothing is written to an external register.",
    tip: "Closes the loop: predicted risk -> optimized possession -> operational conflict -> replan -> field execution -> verification."
  }
];

export const DemoGuideProvider = ({ children }) => {
  const [isGuideActive, setIsGuideActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentStep = DEMO_STEPS[currentStepIndex];

  const nextStep = () => {
    if (currentStepIndex < DEMO_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const setStep = (index) => {
    if (index >= 0 && index < DEMO_STEPS.length) {
      setCurrentStepIndex(index);
    }
  };

  /**
   * Opening the guide restarts it at step 1. This lives here rather than in an
   * effect inside DemoGuideBar because the bar is rendered by whichever role
   * shell is mounted, so it unmounts and remounts on every role switch — and a
   * mount-keyed reset sent the demo back to step 1 at the Ground handoff.
   */
  const toggleGuide = () => {
    setIsGuideActive((active) => {
      if (!active) setCurrentStepIndex(0);
      return !active;
    });
  };

  return (
    <DemoGuideContext.Provider
      value={{
        isGuideActive,
        toggleGuide,
        setIsGuideActive,
        currentStepIndex,
        currentStep,
        nextStep,
        prevStep,
        setStep,
        totalSteps: DEMO_STEPS.length,
      }}
    >
      {children}
    </DemoGuideContext.Provider>
  );
};

export const useDemoGuide = () => useContext(DemoGuideContext);
