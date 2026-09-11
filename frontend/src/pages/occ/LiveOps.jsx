import React from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import { minToHhmm } from '../../utils/time';
import {
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

export const LiveOps = ({ onNavigate }) => {
  const {
    activeEvent, isReplanned, executeReplanFlow, triggerEvent,
    replanRequest, operationalDecision, rerouteScenario, holdScenario, replanScenario,
    criteriaCoverage,
  } = usePlan();
  const { t } = useI18n();

  // Train actions Ritvik actually produced for the rerouting-success scenario.
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="t-section-title">{t('liveOps.title')}</h2>
          <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
            {t('liveOps.subtitle')}
          </p>
        </div>
        <button
          onClick={() => onNavigate('simulator')}
          className="px-3 py-1.5 bg-rail-900 hover:bg-rail-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
        >
          <span>{t('liveOps.openSimulator')}</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Active operational status */}
      <div className="bg-surface-panel border border-line rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${activeEvent ? 'bg-status-warn' : 'bg-status-ok'}`} />
            <h3 className="t-label">{t('liveOps.networkState')}</h3>
          </div>
          <Badge variant="LOW" size="sm">{t('liveOps.validationActive')}</Badge>
        </div>

        {/* Dynamic Conflict Alert Banner */}
        {activeEvent ? (
          <div className="p-4 rounded-lg border border-status-warn bg-status-warn-tint space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-status-warn font-bold text-sm">
                <AlertTriangle size={18} className="text-status-warn" />
                <span>{t('liveOps.conflictDetected')}</span>
              </div>
              <Badge variant="danger" size="md">{t('liveOps.collisionConflict')}</Badge>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs bg-surface-panel p-3 rounded-lg border border-status-warn font-mono">
              <div>
                <span className="text-rail-500 block text-[11px]">{t('liveOps.affectedMaintenance')}</span>
                <span className="font-bold text-rail-900">{replanRequest.maintenance_task_id}</span>
              </div>
              <div>
                <span className="text-rail-500 block text-[11px]">{t('liveOps.occupiedBlocks')}</span>
                <span className="font-bold text-rail-900">{replanRequest.block_ids.join(', ')}</span>
              </div>
              <div>
                <span className="text-rail-500 block text-[11px]">{t('liveOps.conflictingTrains')}</span>
                <span className="font-bold text-status-critical">
                  {replanRequest.conflicting_trains.join(', ') || activeEvent.trainId}
                </span>
              </div>
            </div>

            <p className="text-xs text-status-warn">
              {activeEvent.details}
            </p>

            {/* Operational update: the possession is kept, the train is either
                rerouted or held. Text follows the engine's actual action. */}
            {activeEvent.outcomeType === 'OPERATIONAL_UPDATE' && (
              <div className="bg-status-ok-tint border border-status-ok p-3.5 rounded-lg text-status-ok space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <CheckCircle2 size={16} className="text-status-ok" />
                  <span>
                    OPERATIONAL UPDATE — TRAIN {activeHeld ? 'HELD' : 'REROUTED'}, POSSESSION RETAINED
                  </span>
                </div>
                {activeActions.length > 0 ? (
                  <div className="text-[11px] font-mono text-status-ok space-y-0.5">
                    {activeActions.map((a) => (
                      <div key={a.train_id}>
                        {a.train_id}: {a.action}
                        {a.action === 'REROUTED' && a.new_route?.length
                          ? ` via ${a.new_route.join(' → ')}`
                          : ''}
                        {' '}&middot;{' '}
                        {a.delay_estimate_minutes == null
                          ? 'delay not computable from available data'
                          : a.action === 'HELD'
                          ? `held ${a.delay_estimate_minutes} min until the block is handed back`
                          : `+${a.delay_estimate_minutes} min added running time`}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] font-mono text-status-ok">
                    Possession preserved. Run{' '}
                    <code>scripts/generate_ritvik_scenarios.py</code> to regenerate.
                  </div>
                )}
                <div className="text-[11px] text-status-ok">{activeScenario?.details}</div>
              </div>
            )}

            {activeEvent.outcomeType === 'REPLAN_REQUEST' && (
              <div className="bg-status-critical-tint border border-status-critical p-3.5 rounded-lg text-status-critical space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs text-status-critical">
                  <AlertTriangle size={16} className="text-status-critical" />
                  <span>REPLAN REQUEST — ALL ALTERNATE BYPASS ROUTES INFEASIBLE</span>
                </div>
                <p className="text-xs leading-relaxed">{replanRequest.notes}</p>

                {/* Every rejected bypass, with the reason the route search actually
                    recorded -- not a retyped summary. */}
                {replanRequest.rejected_route_candidates?.length > 0 && (
                  <div className="bg-surface-panel border border-status-critical rounded-md p-2 space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-status-critical">
                      Bypass routes evaluated ({replanRequest.rejected_route_candidates.length} rejected)
                    </span>
                    {replanRequest.rejected_route_candidates.map((c) => (
                      <div key={c.path} className="text-[11px] font-mono text-status-critical">
                        {c.path} — {c.reason}
                      </div>
                    ))}
                  </div>
                )}

                {/* Primary action: hand the conflict back to the optimizer */}
                {!isReplanned ? (
                  <button
                    onClick={executeReplanFlow}
                    className="flex items-center gap-2 px-4 py-2 bg-status-critical hover:bg-status-critical text-white rounded-lg text-xs font-bold transition-all "
                  >
                    <RefreshCw size={14} />
                    <span>{t('liveOps.requestReplan')}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-status-ok text-xs font-bold bg-surface-panel p-2 rounded border border-status-ok">
                    <CheckCircle2 size={14} />
                    <span>
                      Replan executed. {operationalDecision.maintenance_task_id} moved to blocks{' '}
                      {operationalDecision.block_ids.join(' + ')} &middot; Status:{' '}
                      {operationalDecision.status}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center bg-surface-sunken rounded-lg border border-line/80 space-y-2">
            <ShieldCheck size={36} className="text-status-ok mx-auto" />
            <h4 className="text-sm font-bold text-rail-800">All Sections Operating Conflict-Free</h4>
            <p className="text-xs text-rail-500 max-w-md mx-auto">
              Independent validation confirms that scheduled maintenance windows do not collide with scheduled train movements or track closures.
            </p>
            <div className="pt-2">
              <button
                onClick={() => triggerEvent('NEW_TRAIN_BLOCKED')}
                className="px-3.5 py-1.5 rounded-lg bg-status-info hover:bg-status-info text-white text-xs font-bold transition-all "
              >
                Inject Demo Conflict (TRN-SIM-002)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Three operational outcomes, each from a real engine run. REROUTE and
          HOLD keep the possession; REPLAN moves it. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          title="REROUTE — divert the train"
          subtitle="A bypass with capacity exists; possession kept"
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-surface-sunken rounded-lg border border-line font-mono text-[11px] space-y-1">
              <div>• Section: {rerouteScenario?.event?.section_id}</div>
              <div>
                • Conflict: {rerouteScenario?.event?.train_id} (
                {minToHhmm(rerouteScenario?.event?.arrival_minute)} -{' '}
                {minToHhmm(rerouteScenario?.event?.departure_minute)}), priority{' '}
                {rerouteScenario?.event?.priority_class}
              </div>
              <div>• Bypass: {rerouteActions[0]?.new_route?.join(' → ') || '—'}</div>
              <div className="text-status-ok font-bold">
                • {rerouteScenario?.decision?.status}
                {rerouteActions[0]?.delay_estimate_minutes != null
                  ? ` · +${rerouteActions[0].delay_estimate_minutes} min running time`
                  : ''}
              </div>
            </div>
            <button
              onClick={() => triggerEvent('NEW_TRAIN_SUCCESS')}
              className="w-full py-1.5 px-3 bg-surface-sunken hover:bg-line text-rail-800 rounded font-bold text-xs transition-colors"
            >
              Load this scenario
            </button>
          </div>
        </Card>

        <Card
          title="HOLD — make the train wait"
          subtitle="No bypass, but the wait is inside the 45-min limit"
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-surface-sunken rounded-lg border border-line font-mono text-[11px] space-y-1">
              <div>• Section: {holdScenario?.event?.section_id}</div>
              <div>
                • Conflict: {holdScenario?.event?.train_id} (
                {minToHhmm(holdScenario?.event?.arrival_minute)} -{' '}
                {minToHhmm(holdScenario?.event?.departure_minute)}), priority{' '}
                {holdScenario?.event?.priority_class}
              </div>
              <div>• Bypasses: {holdRejectedCount} rejected, 0 feasible</div>
              <div className="text-status-ok font-bold">
                • {holdScenario?.decision?.status}
                {holdActions[0]?.delay_estimate_minutes != null
                  ? ` · held ${holdActions[0].delay_estimate_minutes} min`
                  : ''}
              </div>
            </div>
            <button
              onClick={() => triggerEvent('HELD_TRAIN')}
              className="w-full py-1.5 px-3 bg-surface-sunken hover:bg-line text-rail-800 rounded font-bold text-xs transition-colors"
            >
              Load this scenario
            </button>
          </div>
        </Card>

        <Card
          title="REPLAN — move the possession"
          subtitle="Neither reroute nor hold is feasible"
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-surface-sunken rounded-lg border border-line font-mono text-[11px] space-y-1">
              <div>• Section: {replanScenario?.event?.section_id}</div>
              <div>
                • Conflict: {replanScenario?.event?.train_id} (
                {minToHhmm(replanScenario?.event?.arrival_minute)} -{' '}
                {minToHhmm(replanScenario?.event?.departure_minute)}), priority{' '}
                {replanScenario?.event?.priority_class}
              </div>
              <div>• Bypasses: {replanRejectedCount} rejected, 0 feasible · hold &gt; 45 min limit</div>
              <div className="text-status-critical font-bold">
                • {replanScenario?.decision?.status} &rarr; CP-SAT re-optimizes
              </div>
            </div>
            <button
              onClick={() => triggerEvent('NEW_TRAIN_BLOCKED')}
              className="w-full py-1.5 px-3 bg-surface-sunken hover:bg-line text-rail-800 rounded font-bold text-xs transition-colors"
            >
              Load this scenario
            </button>
          </div>
        </Card>
      </div>

      {/* What this layer evaluates, and what it does not. Stated so the demo does
          not imply coverage the implementation lacks. */}
      {criteriaCoverage && (
        <div className="bg-surface-panel rounded-lg border border-line p-4  space-y-2">
          <h4 className="text-xs font-bold text-rail-900 uppercase tracking-wider">
            Dynamic Allocation — Criteria Coverage
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(criteriaCoverage).map(([name, c]) => (
              <div
                key={name}
                className={`p-2.5 rounded-lg border text-[11px] ${
                  c.status === 'NOT_IMPLEMENTED'
                    ? 'bg-surface-sunken border-line'
                    : 'bg-status-ok-tint border-status-ok'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-rail-800 capitalize">
                    {name.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`font-mono text-[10px] font-bold ${
                      c.status === 'NOT_IMPLEMENTED' ? 'text-rail-500' : 'text-status-ok'
                    }`}
                  >
                    {c.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-rail-500 mt-0.5 leading-snug">{c.basis || c.limitation}</p>
                {c.basis && c.limitation && (
                  <p className="text-status-warn mt-0.5 leading-snug">{c.limitation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
