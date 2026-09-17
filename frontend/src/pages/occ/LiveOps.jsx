import React from 'react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import { RegionHeader, Pill } from '../../components/ui/worksheet';
import { minToHhmm } from '../../utils/time';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';

export const LiveOps = ({ onNavigate }) => {
  const {
    activeEvent, isReplanned, executeReplanFlow, triggerEvent,
    replanRequest, operationalDecision, rerouteScenario, holdScenario, replanScenario,
    criteriaCoverage,
  } = usePlan();
  const { t, isHindi } = useI18n();

  const rerouteActions = rerouteScenario?.decision?.train_actions ?? [];
  const holdActions = holdScenario?.decision?.train_actions ?? [];
  const holdRejectedCount = (holdScenario?.reroute_results ?? [])
    .flatMap((r) => r.inspected_candidates ?? [])
    .filter((c) => c.status === 'REJECTED').length;
  const replanRejectedCount = (replanScenario?.reroute_results ?? [])
    .flatMap((r) => r.inspected_candidates ?? [])
    .filter((c) => c.status === 'REJECTED').length;

  const ACTIVE_SCENARIO = {
    NEW_TRAIN_SUCCESS: rerouteScenario,
    HELD_TRAIN: holdScenario,
    NEW_TRAIN_BLOCKED: replanScenario,
  };
  const activeScenario = activeEvent ? ACTIVE_SCENARIO[activeEvent.id] : null;
  const activeActions = activeScenario?.decision?.train_actions ?? [];
  const activeHeld = activeActions.some((a) => a.action === 'HELD');

  const OUTCOME = [
    { key: 'reroute', title: t('liveOps.rerouteTitle'), subtitle: t('liveOps.rerouteSubtitle'), scenario: rerouteScenario, event: 'NEW_TRAIN_SUCCESS' },
    { key: 'hold', title: t('liveOps.holdTitle'), subtitle: t('liveOps.holdSubtitle'), scenario: holdScenario, event: 'HELD_TRAIN' },
    { key: 'replan', title: t('liveOps.replanTitle'), subtitle: t('liveOps.replanSubtitle'), scenario: replanScenario, event: 'NEW_TRAIN_BLOCKED' },
  ];

  return (
    <div className="bg-ws-band min-h-full">
      <div className="bg-ws-paper border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-2.5">
        <p className="font-ws text-xs text-ws-mid max-w-3xl leading-relaxed">{t('liveOps.subtitle')}</p>
      </div>

      {/* 01 — network state */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
        <div className="flex items-center justify-between gap-2.5 flex-wrap pb-2">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[11px] font-bold text-ws-light">01</span>
            <span className={`font-display text-base font-semibold ${isHindi ? '' : 'uppercase tracking-[0.1em]'} text-ws-ink`}>{t('liveOps.networkState')}</span>
            <span className={`h-2 w-2 rounded-full ${activeEvent ? 'bg-ws-warn' : 'bg-ws-ok'}`} />
          </div>
          <Pill tone="ok">{t('liveOps.validationActive')}</Pill>
        </div>
        <div className="h-px bg-ws-rule mb-3.5" />

        {activeEvent ? (
          <div className="border border-ws-warn bg-[#F5ECD6] p-3.5 space-y-3">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-ws-warn font-display font-bold text-sm">
                <AlertTriangle size={18} /> {t('liveOps.conflictDetected')}
              </div>
              <Pill tone="critical">{t('liveOps.collisionConflict')}</Pill>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs bg-ws-surface p-3 border border-ws-warn">
              <div>
                <span className="font-ws text-ws-mid block text-[11px]">{t('liveOps.affectedMaintenance')}</span>
                <span className="font-bold text-ws-ink">{replanRequest.maintenance_task_id}</span>
              </div>
              <div>
                <span className="font-ws text-ws-mid block text-[11px]">{t('liveOps.occupiedBlocks')}</span>
                <span className="font-bold text-ws-ink">{replanRequest.block_ids.join(', ')}</span>
              </div>
              <div>
                <span className="font-ws text-ws-mid block text-[11px]">{t('liveOps.conflictingTrains')}</span>
                <span className="font-bold text-ws-critical">{replanRequest.conflicting_trains.join(', ') || activeEvent.trainId}</span>
              </div>
            </div>

            <p className="font-ws text-xs text-ws-warn">{activeEvent.details}</p>

            {activeEvent.outcomeType === 'OPERATIONAL_UPDATE' && (
              <div className="bg-[#E1EDE6] border border-ws-ok p-3.5 text-ws-ok space-y-2">
                <div className="flex items-center gap-2 font-display font-bold text-xs">
                  <CheckCircle2 size={16} /> {t('liveOps.operationalUpdate', { action: activeHeld ? t('liveOps.held') : t('liveOps.rerouted') })}
                </div>
                {activeActions.length > 0 ? (
                  <div className="font-mono text-[11px] space-y-0.5">
                    {activeActions.map((a) => (
                      <div key={a.train_id}>
                        {a.train_id}: {a.action}
                        {a.action === 'REROUTED' && a.new_route?.length ? ` via ${a.new_route.join(' → ')}` : ''}
                        {' '}·{' '}
                        {a.delay_estimate_minutes == null
                          ? t('liveOps.delayNotComputable')
                          : a.action === 'HELD'
                          ? t('liveOps.heldFor', { min: a.delay_estimate_minutes })
                          : t('liveOps.addedRunning', { min: a.delay_estimate_minutes })}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="font-mono text-[11px]">{t('liveOps.possessionPreserved')}</div>
                )}
                <div className="font-ws text-[11px]">{activeScenario?.details}</div>
              </div>
            )}

            {activeEvent.outcomeType === 'REPLAN_REQUEST' && (
              <div className="bg-ws-barCriticalBg border border-ws-critical p-3.5 text-ws-critical space-y-3">
                <div className="flex items-center gap-2 font-display font-bold text-xs">
                  <AlertTriangle size={16} /> {t('liveOps.replanRequest')}
                </div>
                <p className="font-ws text-xs leading-relaxed">{replanRequest.notes}</p>

                {replanRequest.rejected_route_candidates?.length > 0 && (
                  <div className="bg-ws-surface border border-ws-critical p-2 space-y-1">
                    <span className="font-display text-[10px] uppercase font-bold tracking-wide">
                      {t('liveOps.bypassEvaluated', { count: replanRequest.rejected_route_candidates.length })}
                    </span>
                    {replanRequest.rejected_route_candidates.map((c) => (
                      <div key={c.path} className="font-mono text-[11px]">{c.path} — {c.reason}</div>
                    ))}
                  </div>
                )}

                {!isReplanned ? (
                  <button
                    onClick={executeReplanFlow}
                    className="flex items-center gap-2 px-4 py-2 bg-ws-critical text-white font-display text-xs font-bold uppercase tracking-wide hover:brightness-95 transition-[filter]"
                  >
                    <RefreshCw size={14} /> {t('liveOps.requestReplan')}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-ws-ok font-display text-xs font-bold bg-ws-surface p-2 border border-ws-ok">
                    <CheckCircle2 size={14} />
                    {t('liveOps.replanExecuted', {
                      task: operationalDecision.maintenance_task_id,
                      blocks: operationalDecision.block_ids.join(' + '),
                      status: operationalDecision.status,
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center bg-ws-paper border border-ws-hairline space-y-2">
            <ShieldCheck size={36} className="text-ws-ok mx-auto" />
            <h4 className="font-display text-sm font-bold text-ws-ink">{t('liveOps.conflictFree')}</h4>
            <p className="font-ws text-xs text-ws-mid max-w-md mx-auto">{t('liveOps.conflictFreeBody')}</p>
            <div className="pt-2">
              <button
                onClick={() => triggerEvent('NEW_TRAIN_BLOCKED')}
                className="px-3.5 py-1.5 bg-ws-info text-white font-display text-xs font-bold uppercase tracking-wide hover:brightness-95 transition-[filter]"
              >
                {t('liveOps.injectConflict')} (TRN-SIM-002)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 02 — three operational outcomes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 bg-ws-rule gap-px border-b border-ws-rule">
        {OUTCOME.map((o) => (
          <div key={o.key} className="bg-ws-surface px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
            <div className="font-display text-sm font-semibold text-ws-ink">{o.title}</div>
            <div className="font-ws text-xs text-ws-mid mt-0.5 mb-3">{o.subtitle}</div>
            <div className="border border-ws-hairline bg-ws-dossier p-3 font-mono text-[11px] space-y-1 text-ws-body">
              <div>• {t('common.section')}: {o.scenario?.event?.section_id}</div>
              <div>
                • {o.scenario?.event?.train_id} ({minToHhmm(o.scenario?.event?.arrival_minute)} - {minToHhmm(o.scenario?.event?.departure_minute)}), {t('common.priority').toLowerCase()} {o.scenario?.event?.priority_class}
              </div>
              {o.key === 'reroute' && <div>• {t('liveOps.bypassLabel')}: {rerouteActions[0]?.new_route?.join(' → ') || '—'}</div>}
              {o.key === 'hold' && <div>• {t('liveOps.bypassesLabel')}: {holdRejectedCount} {t('liveOps.rejected0Feasible')}</div>}
              {o.key === 'replan' && <div>• {t('liveOps.bypassesLabel')}: {replanRejectedCount} {t('liveOps.rejected0Feasible')} · {t('liveOps.holdOver45')}</div>}
              <div className={o.key === 'replan' ? 'text-ws-critical font-bold' : 'text-ws-ok font-bold'}>
                • {o.scenario?.decision?.status}
                {o.key === 'reroute' && rerouteActions[0]?.delay_estimate_minutes != null ? ` · +${rerouteActions[0].delay_estimate_minutes} ${t('common.min')}` : ''}
                {o.key === 'hold' && holdActions[0]?.delay_estimate_minutes != null ? ` · ${t('liveOps.heldFor', { min: holdActions[0].delay_estimate_minutes })}` : ''}
                {o.key === 'replan' ? ` → CP-SAT` : ''}
              </div>
            </div>
            <button
              onClick={() => triggerEvent(o.event)}
              className="w-full mt-2 py-1.5 px-3 bg-ws-paper hover:bg-ws-tick text-ws-ink font-display font-bold text-xs uppercase tracking-wide transition-colors"
            >
              {t('liveOps.loadScenario')}
            </button>
          </div>
        ))}
      </div>

      {/* 03 — criteria coverage */}
      {criteriaCoverage && (
        <div className="bg-ws-surface px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
          <RegionHeader number="03" title={t('liveOps.criteriaCoverage')} isHindi={isHindi} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 border-t border-ws-rule pt-3">
            {Object.entries(criteriaCoverage).map(([name, c]) => (
              <div key={name} className={`p-2.5 border text-[11px] ${c.status === 'NOT_IMPLEMENTED' ? 'bg-ws-paper border-ws-hairline' : 'bg-[#E1EDE6] border-ws-ok'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display font-semibold text-ws-ink capitalize">{name.replace(/_/g, ' ')}</span>
                  <span className={`font-mono text-[10px] font-bold ${c.status === 'NOT_IMPLEMENTED' ? 'text-ws-light' : 'text-ws-ok'}`}>{c.status.replace(/_/g, ' ')}</span>
                </div>
                <p className="font-ws text-ws-mid mt-0.5 leading-snug">{c.basis || c.limitation}</p>
                {c.basis && c.limitation && <p className="font-ws text-ws-warn mt-0.5 leading-snug">{c.limitation}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
