import React, { useState } from 'react';
import { SIMULATION_EVENTS } from '../../data/simulationData';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import {
  Panel, PanelHeader, PanelBody, StatusBadge, Button, Alert, ScopeCaption,
} from '../../components/ui';

// Each button maps to exactly one generated engine scenario, or to null when
// the event class has no scenario. Nothing renders another event's data.
const EVENT_SCENARIO_KEY = {
  NEW_TRAIN_SUCCESS: 'rerouteScenario',
  HELD_TRAIN: 'holdScenario',
  NEW_TRAIN_BLOCKED: 'replanScenario',
  BLOCK_UNAVAILABLE: 'blockUnavailableScenario',
  MAINTENANCE_EMERGENCY: null,
};

const EVENT_TONE = {
  NEW_TRAIN_SUCCESS: 'ok',
  NEW_TRAIN_BLOCKED: 'critical',
  BLOCK_UNAVAILABLE: 'warn',
  HELD_TRAIN: 'ok',
  MAINTENANCE_EMERGENCY: 'idle',
};

const EVENT_SUMMARY_KEYS = {
  NEW_TRAIN_SUCCESS: ['simulator.eventNewTrain', 'simulator.eventNewTrainState', 'simulator.eventNewTrainDetail'],
  NEW_TRAIN_BLOCKED: ['simulator.eventPriority', 'simulator.eventPriorityState', 'simulator.eventPriorityDetail'],
  BLOCK_UNAVAILABLE: ['simulator.eventBlockUnavailable', 'simulator.eventBlockUnavailableState', 'simulator.eventBlockUnavailableDetail'],
  HELD_TRAIN: ['simulator.eventLowPriority', 'simulator.eventLowPriorityState', 'simulator.eventLowPriorityDetail'],
  MAINTENANCE_EMERGENCY: ['simulator.eventEmergency', 'simulator.eventEmergencyState', 'simulator.eventEmergencyDetail'],
};

const STEP_KEYS = ['simulator.s1','simulator.s2','simulator.s3','simulator.s4','simulator.s5','simulator.s6','simulator.s7'];

export const Simulator = ({ onNavigate }) => {
  const {
    triggerEvent, activeEvent, executeReplanFlow,
    rerouteScenario, holdScenario, replanScenario, blockUnavailableScenario,
  } = usePlan();
  const { t } = useI18n();
  const [selectedEventId, setSelectedEventId] = useState('NEW_TRAIN_BLOCKED');
  const [simStep, setSimStep] = useState(0);

  // The narration is a chain of timers; clear them on unmount and before a
  // re-run so a second event cannot interleave with the first one's steps.
  const timers = React.useRef([]);
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  React.useEffect(() => clearTimers, []);

  const evt = SIMULATION_EVENTS.find((e) => e.id === selectedEventId) || SIMULATION_EVENTS[1];

  const scenarioByKey = { rerouteScenario, holdScenario, replanScenario, blockUnavailableScenario };
  const scenarioKey = EVENT_SCENARIO_KEY[selectedEventId];
  const scenario = scenarioKey ? scenarioByKey[scenarioKey] : null;
  const hasScenario = Boolean(scenario);

  const inspected = (scenario?.reroute_results ?? []).flatMap((r) => r.inspected_candidates ?? []);
  const inspectedCount = inspected.length;
  const feasibleCount = inspected.filter((c) => c.status === 'FEASIBLE').length;
  const trainActions = scenario?.decision?.train_actions ?? [];

  const run = (eventId) => {
    setSelectedEventId(eventId);
    triggerEvent(eventId);
    clearTimers();

    if (!EVENT_SCENARIO_KEY[eventId]) {
      setSimStep(0);
      return;
    }

    setSimStep(1);
    [[2, 500], [3, 1100], [4, 1700], [5, 2300], [6, 2900]].forEach(([step, delay]) => {
      timers.current.push(setTimeout(() => setSimStep(step), delay));
    });
    timers.current.push(setTimeout(() => {
      setSimStep(7);
      if (eventId === 'NEW_TRAIN_BLOCKED' || eventId === 'BLOCK_UNAVAILABLE') {
        executeReplanFlow();
      }
    }, 3500));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="t-section-title">{t('simulator.title')}</h2>
          <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
            {t('simulator.subtitle')}
          </p>
        </div>
        <StatusBadge tone="warn" size="md">{t('simulator.syntheticEnv')}</StatusBadge>
      </div>

      <Panel>
        <PanelHeader title={t('simulator.selectDisturbance')} scope={t('simulator.selectScope')} />
        <PanelBody>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
            {SIMULATION_EVENTS.map((e) => {
              const active = selectedEventId === e.id;
              const [tk, sk, dk] = EVENT_SUMMARY_KEYS[e.id] || [];
              const title = tk ? t(tk) : e.name;
              const state = sk ? t(sk) : '';
              const detail = dk ? t(dk) : '';
              return (
                <button
                  key={e.id}
                  onClick={() => run(e.id)}
                  className={`p-3 border text-left transition-colors ${
                    active
                      ? 'border-status-info bg-status-info-tint'
                      : 'border-line bg-surface-panel hover:border-line-strong hover:bg-surface-sunken'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-rail-900">{title}</div>
                  <div className="mt-1">
                    <StatusBadge tone={EVENT_TONE[e.id] || 'idle'} size="sm">{state}</StatusBadge>
                  </div>
                  <div className="text-[10px] text-rail-500 mt-1 font-mono">{detail}</div>
                </button>
              );
            })}
          </div>
        </PanelBody>
      </Panel>

      {/* Event with no generated engine scenario: show the event, not a fake run */}
      {!hasScenario && simStep === 0 && activeEvent && (
        <Panel>
          <PanelHeader title={evt.name} scope={`${evt.eventType} · ${evt.sectionId}`} />
          <PanelBody className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="t-label">{t('simulator.eventType')}</span>
                <div className="font-mono text-[11px] text-rail-900 mt-0.5">{evt.eventType}</div>
              </div>
              <div>
                <span className="t-label">{t('common.section')}</span>
                <div className="font-mono text-[11px] text-rail-900 mt-0.5">{evt.sectionId}</div>
              </div>
              <div>
                <span className="t-label">{t('common.reason')}</span>
                <div className="text-[11px] text-rail-700 mt-0.5">{evt.reason}</div>
              </div>
            </div>
            <Alert tone="idle" title={t('simulator.noScenarioTitle')}>
              {t('simulator.noScenarioBody', { link: '' })}{' '}
              <button onClick={() => onNavigate('live-ops')} className="font-semibold underline hover:text-rail-900">
                {t('nav.liveOps')}
              </button>
            </Alert>
          </PanelBody>
        </Panel>
      )}

      {/* Closed-loop response */}
      {hasScenario && (
        <Panel>
          <PanelHeader
            title={t('simulator.closedLoop')}
            scope={t('simulator.closedLoopScope')}
            action={simStep > 0 && (
              <span className="font-mono text-[10px] text-rail-500">{t('simulator.stepOf', { n: simStep })}</span>
            )}
          />
          <PanelBody className="space-y-3">
            <div className="grid grid-cols-7 gap-1.5">
              {STEP_KEYS.map((nameKey, i) => {
                const num = i + 1;
                const done = simStep >= num;
                const current = simStep === num;
                return (
                  <div
                    key={num}
                    className={`p-2 border text-center transition-colors ${
                      current
                        ? 'bg-rail-900 text-white border-rail-900'
                        : done
                        ? 'bg-status-ok-tint border-status-ok text-status-ok'
                        : 'bg-surface-sunken border-line text-rail-400'
                    }`}
                  >
                    <div className="font-mono text-[9px] font-bold">STEP {num}</div>
                    <div className="text-[9px] leading-tight mt-0.5">{t(nameKey)}</div>
                  </div>
                );
              })}
            </div>

            {/* Reasoning log — every line is bound to a real scenario field */}
            <div className="bg-rail-950 border border-rail-800 p-3 font-mono text-[11px] space-y-1.5">
              <div className="text-rail-500 flex items-center justify-between">
                <span>{t('simulator.reasoningLog')}</span>
                <span>{simStep > 0 ? t('simulator.running') : t('simulator.idle')}</span>
              </div>
              {simStep === 0 && (
                <p className="text-rail-500">{t('simulator.selectToRun')}</p>
              )}
              {simStep >= 1 && (
                <p className="text-rail-300">
                  [1] Injected: {evt.name} ({evt.eventType})
                  {scenario?.event?.section_id ? ` on ${scenario.event.section_id}` : ''}.
                </p>
              )}
              {simStep >= 2 && (
                <p className="text-rail-300">
                  [2] Conflict engine: {scenario?.conflict?.details || 'no conflict recorded for this event'}
                </p>
              )}
              {simStep >= 3 && (
                <p className="text-rail-300">
                  [3] Route search:{' '}
                  {scenario?.conflict?.conflict_type === 'BLOCK_UNAVAILABLE'
                    ? 'skipped — the block itself is closed, so rerouting a train cannot help.'
                    : `${inspectedCount} candidate bypass${inspectedCount === 1 ? '' : 'es'} evaluated over route_topology.json (${feasibleCount} feasible).`}
                </p>
              )}
              {simStep >= 4 && (
                <p className={evt.outcomeType === 'OPERATIONAL_UPDATE' ? 'text-status-ok' : 'text-status-critical'}>
                  [4] Outcome: {evt.outcomeTitle}
                </p>
              )}
              {simStep >= 5 && (
                <p className="text-rail-300">
                  [5] {trainActions.length > 0
                    ? trainActions
                        .map((a) => `${a.train_id} ${a.action}` + (a.delay_estimate_minutes != null ? ` (+${a.delay_estimate_minutes} min)` : ''))
                        .join('; ')
                    : 'No feasible train action; possession handed to the optimizer for replanning.'}
                </p>
              )}
              {simStep >= 6 && (
                <p className="text-rail-300">
                  [6] Decision: {scenario?.decision?.status || '—'} · plan valid:{' '}
                  {String(scenario?.decision?.maintenance_plan_valid ?? '—')}
                </p>
              )}
              {simStep >= 7 && (
                <p className="text-status-ok">
                  [7] Operational decision emitted (ritvik_operational_decision.json).
                </p>
              )}
            </div>
          </PanelBody>
        </Panel>
      )}

      {simStep === 7 && (
        <Alert tone="ok" title={t('simulator.completeTitle')}>
          {t('simulator.completeBody')}
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="primary" onClick={() => onNavigate('replanning')}>{t('simulator.replanAudit')}</Button>
            <Button size="sm" variant="secondary" onClick={() => onNavigate('block-planning')}>{t('simulator.blockPlanner')}</Button>
          </div>
        </Alert>
      )}

      <ScopeCaption className="block">
        Scenarios generated by scripts/generate_ritvik_scenarios.py · each is a real engine run.
      </ScopeCaption>
    </div>
  );
};
