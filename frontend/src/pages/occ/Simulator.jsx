import React, { useState } from 'react';
import { SIMULATION_EVENTS } from '../../data/simulationData';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import { RegionHeader, Pill, AdvisoryNote } from '../../components/ui/worksheet';
import { Button } from '../../components/ui';

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

const STEP_KEYS = ['simulator.s1', 'simulator.s2', 'simulator.s3', 'simulator.s4', 'simulator.s5', 'simulator.s6', 'simulator.s7'];

export const Simulator = ({ onNavigate }) => {
  const {
    triggerEvent, activeEvent, executeReplanFlow,
    rerouteScenario, holdScenario, replanScenario, blockUnavailableScenario,
  } = usePlan();
  const { t, isHindi } = useI18n();
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
    <div className="bg-ws-band min-h-full">
      <div className="bg-ws-paper border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-2.5 flex items-center justify-between gap-4 flex-wrap">
        <p className="font-ws text-xs text-ws-mid max-w-3xl leading-relaxed flex-1 min-w-[240px]">{t('simulator.subtitle')}</p>
        <Pill tone="warn">{t('simulator.syntheticEnv')}</Pill>
      </div>

      {/* 01 — select disturbance */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
        <RegionHeader number="01" title={t('simulator.selectDisturbance')} meta={t('simulator.selectScope')} isHindi={isHindi} />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 border-t border-ws-rule pt-3">
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
                className={`p-3 border text-left transition-colors ${active ? 'border-ws-ink bg-ws-selected' : 'border-ws-rule bg-ws-surface hover:border-ws-mid hover:bg-ws-paper'}`}
              >
                <div className="font-ws text-[11px] font-semibold text-ws-ink">{title}</div>
                <div className="mt-1"><Pill tone={EVENT_TONE[e.id] || 'idle'} size="sm">{state}</Pill></div>
                <div className="font-mono text-[10px] text-ws-light mt-1">{detail}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Event with no generated engine scenario: show the event, not a fake run */}
      {!hasScenario && simStep === 0 && activeEvent && (
        <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
          <RegionHeader number="02" title={evt.name} meta={`${evt.eventType} · ${evt.sectionId}`} isHindi={isHindi} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-ws-rule pt-3">
            <div>
              <span className="font-display text-[11px] font-semibold uppercase tracking-wide text-ws-light">{t('simulator.eventType')}</span>
              <div className="font-mono text-[11px] text-ws-ink mt-0.5">{evt.eventType}</div>
            </div>
            <div>
              <span className="font-display text-[11px] font-semibold uppercase tracking-wide text-ws-light">{t('common.section')}</span>
              <div className="font-mono text-[11px] text-ws-ink mt-0.5">{evt.sectionId}</div>
            </div>
            <div>
              <span className="font-display text-[11px] font-semibold uppercase tracking-wide text-ws-light">{t('common.reason')}</span>
              <div className="font-ws text-[11px] text-ws-body mt-0.5">{evt.reason}</div>
            </div>
          </div>
          <div className="pt-3">
            <AdvisoryNote tone="idle" title={t('simulator.noScenarioTitle')}>
              {t('simulator.noScenarioBody', { link: '' })}{' '}
              <button onClick={() => onNavigate('live-ops')} className="font-display font-bold underline underline-offset-2 hover:text-ws-ink">{t('nav.liveOps')}</button>
            </AdvisoryNote>
          </div>
        </div>
      )}

      {/* 02/03 — closed-loop response */}
      {hasScenario && (
        <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
          <RegionHeader
            number="02"
            title={t('simulator.closedLoop')}
            meta={simStep > 0 ? t('simulator.stepOf', { n: simStep }) : t('simulator.closedLoopScope')}
            isHindi={isHindi}
          />
          <div className="grid grid-cols-7 gap-1.5 border-t border-ws-rule pt-3">
            {STEP_KEYS.map((nameKey, i) => {
              const num = i + 1;
              const done = simStep >= num;
              const current = simStep === num;
              return (
                <div
                  key={num}
                  className={`p-2 border text-center transition-colors ${
                    current ? 'bg-ws-ink text-white border-ws-ink' : done ? 'bg-[#E1EDE6] border-ws-ok text-ws-ok' : 'bg-ws-tick border-ws-hairline text-ws-light'
                  }`}
                >
                  <div className="font-mono text-[9px] font-bold">STEP {num}</div>
                  <div className="font-ws text-[9px] leading-tight mt-0.5">{t(nameKey)}</div>
                </div>
              );
            })}
          </div>

          {/* Reasoning log — every line is bound to a real scenario field */}
          <div className="bg-ws-ink border border-ws-body p-3 font-mono text-[11px] space-y-1.5 mt-3">
            <div className="text-ws-light flex items-center justify-between">
              <span>{t('simulator.reasoningLog')}</span>
              <span>{simStep > 0 ? t('simulator.running') : t('simulator.idle')}</span>
            </div>
            {simStep === 0 && <p className="text-ws-light">{t('simulator.selectToRun')}</p>}
            {simStep >= 1 && (
              <p className="text-white/80">
                {t('simulator.logInjected', { name: evt.name, type: evt.eventType, where: scenario?.event?.section_id ? ` on ${scenario.event.section_id}` : '' })}
              </p>
            )}
            {simStep >= 2 && (
              <p className="text-white/80">{t('simulator.logConflict', { details: scenario?.conflict?.details || t('simulator.logNoConflict') })}</p>
            )}
            {simStep >= 3 && (
              <p className="text-white/80">
                {scenario?.conflict?.conflict_type === 'BLOCK_UNAVAILABLE'
                  ? t('simulator.logRouteSkipped')
                  : t('simulator.logRouteSearch', { inspected: inspectedCount, feasible: feasibleCount })}
              </p>
            )}
            {simStep >= 4 && (
              <p className={evt.outcomeType === 'OPERATIONAL_UPDATE' ? 'text-ws-ok' : 'text-ws-critical'}>
                {t('simulator.logOutcome', { title: evt.outcomeTitle })}
              </p>
            )}
            {simStep >= 5 && (
              <p className="text-white/80">
                {trainActions.length > 0
                  ? trainActions.map((a) => `${a.train_id} ${a.action}` + (a.delay_estimate_minutes != null ? ` (+${a.delay_estimate_minutes} min)` : '')).join('; ')
                  : t('simulator.logNoAction')}
              </p>
            )}
            {simStep >= 6 && (
              <p className="text-white/80">
                {t('simulator.logDecision', { status: scenario?.decision?.status || '—', valid: String(scenario?.decision?.maintenance_plan_valid ?? '—') })}
              </p>
            )}
            {simStep >= 7 && <p className="text-ws-ok">{t('simulator.logEmitted')}</p>}
          </div>
        </div>
      )}

      {simStep === 7 && (
        <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-3.5">
          <AdvisoryNote
            tone="ok"
            title={t('simulator.completeTitle')}
            action={
              <div className="flex gap-2">
                <Button size="sm" variant="primary" onClick={() => onNavigate('replanning')}>{t('simulator.replanAudit')}</Button>
                <Button size="sm" variant="secondary" onClick={() => onNavigate('block-planning')}>{t('simulator.blockPlanner')}</Button>
              </div>
            }
          >
            {t('simulator.completeBody')}
          </AdvisoryNote>
        </div>
      )}

      <div className="bg-ws-band px-3.5 md:px-4 xl:px-5 py-2">
        <span className="font-mono text-[10px] text-ws-mid">{t('simulator.scenariosScope')}</span>
      </div>
    </div>
  );
};
