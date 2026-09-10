import React, { createContext, useContext, useState } from 'react';

const DemoGuideContext = createContext();

export const DEMO_STEPS = [
  {
    step: 1,
    replanned: false,
    title: "1. Operations Control Center Overview",
    page: "overview",
    role: "Operations Control",
    description: "Start at the OCC dashboard. Overview of the 7-day planning horizon, 6 critical KPIs, active corridor network status, and upcoming maintenance possessions.",
    tip: "These KPIs are the full 30,000-task Arnav optimizer run, recorded in benchmarks/full_run_metrics.json."
  },
  {
    step: 2,
    replanned: false,
    title: "2. Maintenance Demand Inventory",
    page: "demand",
    role: "Operations Control",
    description: "Browse the 30,000-task inventory submitted by civil, electrical, signal, and mechanical maintenance departments.",
    tip: "Click on 'TASK-000005' in the table to inspect its AI predictive risk profile."
  },
  {
    step: 3,
    replanned: false,
    title: "3. Neev AI Predictive Risk Drawer",
    page: "demand",
    role: "Operations Control",
    highlightTask: "TASK-000005",
    description: "Asset AST-120005 is diagnosed by Neev with 81.0% Failure Risk (CRITICAL) and a 30-day degradation forecast of 71.1.",
    tip: "Neev provides the objective risk signal that prioritizes this task in the optimizer."
  },
  {
    step: 4,
    replanned: false,
    title: "4. Automatic Block Planning Hero Screen",
    page: "block-planning",
    role: "Operations Control",
    description: "The core screen of the system. Visualizes the conflict-free maintenance schedule on a horizontal 24-hour Gantt timeline across railway sections.",
    tip: "See TASK-000005 scheduled on SEC-0004 in night blocks BLK-009637 + BLK-009638 (00:00 - 03:20)."
  },
  {
    step: 5,
    replanned: false,
    title: "5. 'Why Did Arnav Select This Block?' Trace",
    page: "block-planning",
    role: "Operations Control",
    openWhyArnav: true,
    description: "Inspect the mathematical decision trace: Neev risk input -> maintenance specs -> pruning table of 9 rejected blocks -> crew match -> best feasible assignment.",
    tip: "Shows exact physical reasons for rejections: train conflicts, track unavailable, shift mismatch."
  },
  {
    step: 6,
    replanned: false,
    title: "6. Smart Cross-Department Bundling",
    page: "block-planning",
    role: "Operations Control",
    description: "Examine SEC-0073 (Bhopal–Itarsi): Track/Civil TASK-018159 and Electrical/TRD TASK-016913 coordinated into ONE shared possession window.",
    tip: "Eliminates 120 minutes of redundant track disruption and prevents a second train stoppage."
  },
  {
    step: 7,
    replanned: false,
    title: "7. Event Simulator: Inject Operational Disruption",
    page: "simulator",
    role: "Operations Control",
    description: "Open the Event Simulator. Each button loads one real Ritvik engine run. Click 'New Train (Priority)' to inject the priority-1 movement TRN-SIM-002 into SEC-0004.",
    tip: "The button labelled 'No engine scenario' is deliberate: that event class is not a maintenance-plan conflict, so Ritvik does not run on it."
  },
  {
    step: 8,
    replanned: false,
    title: "8. Live Operations: Conflict Detected",
    page: "live-ops",
    role: "Operations Control",
    description: "Ritvik's interval-overlap engine flags the collision between TRN-SIM-002 and the TASK-000005 possession on SEC-0004, and identifies it as the affected train.",
    tip: "Overlap test: train_arrival < possession_end AND train_departure > possession_start."
  },
  {
    step: 9,
    replanned: false,
    title: "9. Three Operational Outcomes: Reroute, Hold, Replan",
    page: "live-ops",
    role: "Operations Control",
    description: "Ritvik has three responses. REROUTE (train TRN-SIM-001 via SEC-0007, +16 min computed from section length and line speed). HOLD (low-priority train waits 35 min, inside the 45-min limit). REPLAN when neither is feasible. The Criteria Coverage panel states exactly what the layer evaluates and what it does not.",
    tip: "Every figure on this screen comes from a real engine run in ritvik_scenarios.json. Downstream-impact and sequencing are explicitly marked NOT_IMPLEMENTED."
  },
  {
    step: 10,
    replanned: false,
    title: "10. Rerouting and Holding Both Infeasible -> REPLAN REQUEST",
    page: "simulator",
    role: "Operations Control",
    description: "TRN-SIM-002 is priority 1 (never held) and every bypass is saturated, so the only safe option is to move the possession. Ritvik emits a targeted replan_request.json with the rejected routes attached.",
    tip: "Ritvik is not a scheduler. It hands the decision back to Arnav's CP-SAT optimizer."
  },
  {
    step: 11,
    replanned: true,
    title: "11. Arnav CP-SAT Re-Optimization",
    page: "simulator",
    role: "Operations Control",
    description: "Arnav consumes replan_request.json, blacklists BLK-009637 + BLK-009638, and re-optimizes TASK-000005 to 08 Sep (18:00 - 21:20) with TEAM-015.",
    tip: "Returns a feasible alternative in well under a second and writes the revised plan to replan_output/."
  },
  {
    step: 12,
    replanned: true,
    title: "12. Replanning Audit: Before, Disruption, After",
    page: "replanning",
    role: "Operations Control",
    description: "Side-by-side: original possession (07 Sep, TEAM-013) -> the conflict -> the re-optimized possession (08 Sep 18:00-21:20, BLK-012046+47, TEAM-015). The audit record below shows action taken, routes inspected, hold outcome, measured replan runtime, and 52/53 tasks unchanged (by construction).",
    tip: "Retention is 100% by construction, not a benchmark: the replan scope is a single task and every other record is copied unchanged."
  },
  {
    step: 13,
    replanned: true,
    title: "13. Independent Verification of Completed Work",
    page: "general-verify",
    role: "General User",
    description: "Switch to the General User role. Completed possessions are listed for independent certification -- approve, reject, or report a false closure. Records are held for the session only; nothing is written to an external register.",
    tip: "This closes the loop on the operational side before the field crew picks up the revised work order."
  },
  {
    step: 14,
    replanned: true,
    title: "14. Maintenance Portal Receives Updated Schedule",
    page: "my-tasks",
    role: "Maintenance Personnel",
    description: "Switch to the Maintenance Personnel role. The TRD crew sees the updated work order on 08 Sep (18:00 - 21:20) and can accept or update task status.",
    tip: "Demonstrates seamless end-to-end integration from AI prediction to field execution!"
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

  const toggleGuide = () => {
    setIsGuideActive(!isGuideActive);
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
