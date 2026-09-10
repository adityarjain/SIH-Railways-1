import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { SIMULATION_EVENTS } from '../../data/simulationData';
import { usePlan } from '../../context/PlanContext';
import {
  PlayCircle,
  AlertTriangle,
  Radio,
  GitBranch,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Zap,
} from 'lucide-react';

// Each button maps to exactly one generated engine scenario, or to null when
// the event class has no scenario. Nothing renders another event's data.
const EVENT_SCENARIO_KEY = {
  NEW_TRAIN_SUCCESS: 'rerouteScenario',
  HELD_TRAIN: 'holdScenario',
  NEW_TRAIN_BLOCKED: 'replanScenario',
  BLOCK_UNAVAILABLE: 'blockUnavailableScenario',
  MAINTENANCE_EMERGENCY: null,
};

export const Simulator = ({ onNavigate }) => {
  const {
    triggerEvent, clearEvent, activeEvent, executeReplanFlow, isReplanned,
    rerouteScenario, holdScenario, replanScenario, blockUnavailableScenario,
  } = usePlan();
  const [selectedEventId, setSelectedEventId] = useState('NEW_TRAIN_BLOCKED');
  const [simStep, setSimStep] = useState(0); // 0 to 7 for animated progression

  const activeEvtData = SIMULATION_EVENTS.find((e) => e.id === selectedEventId) || SIMULATION_EVENTS[1];

  const scenarioByKey = {
    rerouteScenario, holdScenario, replanScenario, blockUnavailableScenario,
  };
  const scenarioKey = EVENT_SCENARIO_KEY[selectedEventId];
  const scenario = scenarioKey ? scenarioByKey[scenarioKey] : null;
  const hasScenario = Boolean(scenario);

  const inspected = (scenario?.reroute_results ?? []).flatMap((r) => r.inspected_candidates ?? []);
  const inspectedCount = inspected.length;
  const feasibleCount = inspected.filter((c) => c.status === 'FEASIBLE').length;
  const trainActions = scenario?.decision?.train_actions ?? [];

  const runSimulationFlow = (eventId) => {
    setSelectedEventId(eventId);
    triggerEvent(eventId);

    // Events with no generated engine scenario do not get an animated log --
    // there is no engine run to narrate.
    if (!EVENT_SCENARIO_KEY[eventId]) {
      setSimStep(0);
      return;
    }

    setSimStep(1);
    setTimeout(() => setSimStep(2), 500);
    setTimeout(() => setSimStep(3), 1100);
    setTimeout(() => setSimStep(4), 1700);
    setTimeout(() => setSimStep(5), 2300);
    setTimeout(() => setSimStep(6), 2900);
    setTimeout(() => {
      setSimStep(7);
      if (eventId === 'NEW_TRAIN_BLOCKED' || eventId === 'BLOCK_UNAVAILABLE') {
        executeReplanFlow();
      }
    }, 3500);
  };

  const stepsList = [
    { num: 1, name: 'Inject Operational Event', icon: Zap },
    { num: 2, name: 'Ritvik Collision Detection', icon: Radio },
    { num: 3, name: 'Topology Reroute Search', icon: GitBranch },
    { num: 4, name: 'Replan Request Triggered', icon: AlertTriangle },
    { num: 5, name: 'Arnav CP-SAT Re-Optimization', icon: Sparkles },
    { num: 6, name: 'Ritvik Re-Validation', icon: RefreshCw },
    { num: 7, name: 'Final Decision Emitted', icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-600 uppercase tracking-wider">
            <PlayCircle size={14} className="text-purple-600" />
            <span>SIH Interactive Demo Environment</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
            Operational Event Simulator
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Trigger dynamic railway disturbances to replay the multi-agent closed-loop response step by step.
          </p>
        </div>

        {/* Synthetic Simulation Environment Badge (Section 18 requirement) */}
        <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-3 py-1 rounded-full font-mono shadow-xs">
          Synthetic Simulation Environment
        </span>
      </div>

      {/* 5 Event Trigger Buttons (Section 18 requirement) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Select Operational Disturbance to Simulate:
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <button
            onClick={() => runSimulationFlow('NEW_TRAIN_SUCCESS')}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedEventId === 'NEW_TRAIN_SUCCESS'
                ? 'bg-blue-50 border-blue-600 shadow-xs ring-1 ring-blue-500'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="font-bold text-xs text-slate-900">New Train</div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Bypass Available</div>
            <div className="text-[10px] text-slate-500 mt-1">TRN-SIM-001 (Rerouted)</div>
          </button>

          <button
            onClick={() => runSimulationFlow('NEW_TRAIN_BLOCKED')}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedEventId === 'NEW_TRAIN_BLOCKED'
                ? 'bg-red-50 border-red-600 shadow-xs ring-1 ring-red-500'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="font-bold text-xs text-slate-900">New Train (Priority)</div>
            <div className="text-[10px] text-red-600 font-semibold mt-0.5">All Bypasses Blocked</div>
            <div className="text-[10px] text-slate-500 mt-1">Triggers Replan Loop</div>
          </button>

          <button
            onClick={() => runSimulationFlow('BLOCK_UNAVAILABLE')}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedEventId === 'BLOCK_UNAVAILABLE'
                ? 'bg-amber-50 border-amber-600 shadow-xs ring-1 ring-amber-500'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="font-bold text-xs text-slate-900">Block Unavailable</div>
            <div className="text-[10px] text-amber-700 font-semibold mt-0.5">Track Weld Fracture</div>
            <div className="text-[10px] text-slate-500 mt-1">BLK-009637 Closed</div>
          </button>

          <button
            onClick={() => runSimulationFlow('HELD_TRAIN')}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedEventId === 'HELD_TRAIN'
                ? 'bg-emerald-50 border-emerald-600 shadow-xs ring-1 ring-emerald-500'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="font-bold text-xs text-slate-900">Low-Priority Train</div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Held, Not Replanned</div>
            <div className="text-[10px] text-slate-500 mt-1">TRN-SIM-006 (HELD)</div>
          </button>

          <button
            onClick={() => runSimulationFlow('MAINTENANCE_EMERGENCY')}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedEventId === 'MAINTENANCE_EMERGENCY'
                ? 'bg-orange-50 border-orange-600 shadow-xs ring-1 ring-orange-500'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="font-bold text-xs text-slate-900">Maintenance Emergency</div>
            <div className="text-[10px] text-orange-700 font-semibold mt-0.5">OHE Catenary Sag</div>
            <div className="text-[10px] text-slate-500 mt-1">No engine scenario</div>
          </button>
        </div>
      </div>

      {/* Event with no generated engine scenario: show the event, not a fake run */}
      {!hasScenario && simStep === 0 && activeEvent && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            {activeEvtData.name}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono text-slate-700">
            <div>
              <span className="text-slate-400 block font-sans text-[10px]">Event type</span>
              {activeEvtData.eventType}
            </div>
            <div>
              <span className="text-slate-400 block font-sans text-[10px]">Section</span>
              {activeEvtData.sectionId}
            </div>
            <div className="col-span-2 sm:col-span-2">
              <span className="text-slate-400 block font-sans text-[10px]">Reason</span>
              {activeEvtData.reason}
            </div>
          </div>
          <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            No generated engine scenario for this event type. Ritvik's conflict / reroute / hold
            engine runs on maintenance-plan conflicts; the scenarios it actually solves are on the{' '}
            <button
              onClick={() => onNavigate('live-ops')}
              className="font-semibold underline hover:text-amber-950"
            >
              Live Operations
            </button>{' '}
            screen.
          </div>
        </div>
      )}

      {/* 7-Step Progress Flow */}
      <div
        className={`bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 ${
          hasScenario ? '' : 'hidden'
        }`}
      >
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
          <span>Multi-Agent 7-Step Closed-Loop Execution Chain</span>
          {simStep > 0 && (
            <span className="text-xs font-mono text-blue-600 font-bold">
              Progress: {simStep}/7 Steps Completed
            </span>
          )}
        </h4>

        <div className="grid grid-cols-7 gap-2">
          {stepsList.map((st) => {
            const Icon = st.icon;
            const isDone = simStep >= st.num;
            const isCurrent = simStep === st.num;

            return (
              <div
                key={st.num}
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  isCurrent
                    ? 'bg-blue-600 text-white border-blue-700 shadow-sm animate-pulse'
                    : isDone
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                }`}
              >
                <div className="flex justify-center mb-1">
                  <Icon size={16} />
                </div>
                <div className="text-[10px] font-bold font-mono">STEP {st.num}</div>
                <div className="text-[10px] font-medium leading-tight mt-0.5 line-clamp-2">
                  {st.name}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Step Commentary Box */}
        <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs space-y-2 border border-slate-800">
          <div className="text-blue-400 font-bold flex items-center justify-between">
            <span>TERMINAL REASONING LOG:</span>
            <span>SIMULATION_ACTIVE = {simStep > 0 ? 'TRUE' : 'IDLE'}</span>
          </div>
          {simStep === 0 && (
            <p className="text-slate-400">Select any event button above to launch the 7-step execution chain.</p>
          )}
          {simStep >= 1 && (
            <p className="text-slate-200">
              [STEP 1] Injected event: {activeEvtData.name} ({activeEvtData.eventType})
              {scenario?.event?.section_id ? ` on ${scenario.event.section_id}` : ''}.
            </p>
          )}
          {simStep >= 2 && (
            <p className="text-amber-300">
              [STEP 2] Ritvik conflict engine: {scenario?.conflict?.details || 'no conflict recorded for this event'}
            </p>
          )}
          {simStep >= 3 && (
            <p className="text-blue-300">
              [STEP 3] Ritvik route search:{' '}
              {scenario?.conflict?.conflict_type === 'BLOCK_UNAVAILABLE'
                ? 'skipped — the block itself is closed, so rerouting a train cannot help.'
                : `${inspectedCount} candidate bypass${inspectedCount === 1 ? '' : 'es'} evaluated over route_topology.json (${feasibleCount} feasible).`}
            </p>
          )}
          {simStep >= 4 && (
            <p className={activeEvtData.outcomeType === 'OPERATIONAL_UPDATE' ? 'text-emerald-300' : 'text-red-400'}>
              [STEP 4] Outcome: {activeEvtData.outcomeTitle}
            </p>
          )}
          {simStep >= 5 && (
            <p className="text-purple-300">
              [STEP 5] {trainActions.length > 0
                ? trainActions
                    .map((a) => `${a.train_id} ${a.action}` + (a.delay_estimate_minutes != null
                      ? ` (+${a.delay_estimate_minutes} min)` : ''))
                    .join('; ')
                : 'No feasible train action; possession handed to Arnav for replanning.'}
            </p>
          )}
          {simStep >= 6 && (
            <p className="text-emerald-400">
              [STEP 6] Ritvik decision: {scenario?.decision?.status || '—'} · maintenance plan valid:{' '}
              {String(scenario?.decision?.maintenance_plan_valid ?? '—')}
            </p>
          )}
          {simStep >= 7 && (
            <p className="text-emerald-400 font-bold">
              [STEP 7] Operational decision emitted (ritvik_operational_decision.json).
            </p>
          )}
        </div>
      </div>

      {/* Result Card & Shortcut to Planning */}
      {simStep === 7 && (
        <div className="bg-emerald-50 border border-emerald-300 p-5 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">
              Simulation Complete — Plan Synchronized
            </span>
            <p className="text-xs text-emerald-800 mt-0.5">
              TASK-000005 has been updated in the Automatic Block Planning timeline and Maintenance Portal.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onNavigate('replanning')}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              View Replanning Audit
            </button>
            <button
              onClick={() => onNavigate('block-planning')}
              className="px-3.5 py-2 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-all shadow-xs"
            >
              View in Block Planner
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
