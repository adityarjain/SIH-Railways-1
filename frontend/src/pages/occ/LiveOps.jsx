import React from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { usePlan } from '../../context/PlanContext';
import { minToHhmm } from '../../utils/time';
import {
  Radio,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  Train,
  Clock,
  Sparkles,
} from 'lucide-react';

export const LiveOps = ({ onNavigate }) => {
  const {
    activeEvent, replanRequestActive, isReplanned, executeReplanFlow, triggerEvent,
    replanRequest, operationalDecision, rerouteScenario, holdScenario, replanScenario,
    criteriaCoverage,
  } = usePlan();

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
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-600 uppercase tracking-wider">
            <Radio size={14} className="text-red-500 animate-pulse" />
            <span>Ritvik Dynamic Operations & Replanning Engine</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
            Live Operations & Conflict Resolution
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational validation layer. Evaluates simulated railway state against maintenance possessions, reroutes conflicting trains, or triggers automated replan requests.
          </p>
        </div>

        {/* Quick Simulator Link */}
        <button
          onClick={() => onNavigate('simulator')}
          className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
        >
          <span>Open Event Simulator</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Active Operational Status Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
            </span>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Simulated Network Operational State
            </h3>
          </div>
          <Badge variant="LOW" size="sm">Ritvik Validation Active</Badge>
        </div>

        {/* Dynamic Conflict Alert Banner */}
        {activeEvent ? (
          <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/70 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <AlertTriangle size={18} className="text-amber-600 animate-bounce" />
                <span>ACTIVE OPERATIONAL CONFLICT DETECTED BY RITVIK</span>
              </div>
              <Badge variant="danger" size="md">Collision Conflict</Badge>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs bg-white/80 p-3 rounded-lg border border-amber-200 font-mono">
              <div>
                <span className="text-slate-500 block text-[11px]">Affected Maintenance:</span>
                <span className="font-bold text-slate-900">{replanRequest.maintenance_task_id}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Occupied Blocks:</span>
                <span className="font-bold text-slate-900">{replanRequest.block_ids.join(', ')}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Conflicting Train(s):</span>
                <span className="font-bold text-red-600">
                  {replanRequest.conflicting_trains.join(', ') || activeEvent.trainId}
                </span>
              </div>
            </div>

            <p className="text-xs text-amber-950">
              {activeEvent.details}
            </p>

            {/* Operational update: the possession is kept, the train is either
                rerouted or held. Text follows the engine's actual action. */}
            {activeEvent.outcomeType === 'OPERATIONAL_UPDATE' && (
              <div className="bg-emerald-100 border border-emerald-300 p-3.5 rounded-lg text-emerald-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <CheckCircle2 size={16} className="text-emerald-700" />
                  <span>
                    OPERATIONAL UPDATE — TRAIN {activeHeld ? 'HELD' : 'REROUTED'}, POSSESSION RETAINED
                  </span>
                </div>
                {activeActions.length > 0 ? (
                  <div className="text-[11px] font-mono text-emerald-800 space-y-0.5">
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
                  <div className="text-[11px] font-mono text-emerald-800">
                    Possession preserved. Run{' '}
                    <code>scripts/generate_ritvik_scenarios.py</code> to regenerate.
                  </div>
                )}
                <div className="text-[11px] text-emerald-800">{activeScenario?.details}</div>
              </div>
            )}

            {activeEvent.outcomeType === 'REPLAN_REQUEST' && (
              <div className="bg-red-50 border border-red-300 p-3.5 rounded-lg text-red-950 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs text-red-900">
                  <AlertTriangle size={16} className="text-red-600" />
                  <span>REPLAN REQUEST — ALL ALTERNATE BYPASS ROUTES INFEASIBLE</span>
                </div>
                <p className="text-xs leading-relaxed">{replanRequest.notes}</p>

                {/* Every rejected bypass, with the reason the route search actually
                    recorded -- not a retyped summary. */}
                {replanRequest.rejected_route_candidates?.length > 0 && (
                  <div className="bg-white/70 border border-red-200 rounded-md p-2 space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-red-800">
                      Bypass routes evaluated ({replanRequest.rejected_route_candidates.length} rejected)
                    </span>
                    {replanRequest.rejected_route_candidates.map((c) => (
                      <div key={c.path} className="text-[11px] font-mono text-red-900">
                        {c.path} — {c.reason}
                      </div>
                    ))}
                  </div>
                )}

                {/* Primary Action Button to trigger Arnav replanning */}
                {!isReplanned ? (
                  <button
                    onClick={executeReplanFlow}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                  >
                    <RefreshCw size={14} />
                    <span>Request Replan from Arnav Optimizer</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold bg-white p-2 rounded border border-emerald-200">
                    <CheckCircle2 size={14} />
                    <span>
                      Replan executed. {operationalDecision.maintenance_task_id} moved to blocks{' '}
                      {operationalDecision.block_ids.join(' + ')} &middot; Ritvik status:{' '}
                      {operationalDecision.status}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <ShieldCheck size={36} className="text-emerald-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">All Sections Operating Conflict-Free</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Ritvik has verified that scheduled maintenance windows do not collide with scheduled train movements or track closures.
            </p>
            <div className="pt-2">
              <button
                onClick={() => triggerEvent('NEW_TRAIN_BLOCKED')}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
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
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1">
              <div>• Section: {rerouteScenario?.event?.section_id}</div>
              <div>
                • Conflict: {rerouteScenario?.event?.train_id} (
                {minToHhmm(rerouteScenario?.event?.arrival_minute)} -{' '}
                {minToHhmm(rerouteScenario?.event?.departure_minute)}), priority{' '}
                {rerouteScenario?.event?.priority_class}
              </div>
              <div>• Bypass: {rerouteActions[0]?.new_route?.join(' → ') || '—'}</div>
              <div className="text-emerald-700 font-bold">
                • {rerouteScenario?.decision?.status}
                {rerouteActions[0]?.delay_estimate_minutes != null
                  ? ` · +${rerouteActions[0].delay_estimate_minutes} min running time`
                  : ''}
              </div>
            </div>
            <button
              onClick={() => triggerEvent('NEW_TRAIN_SUCCESS')}
              className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-xs transition-colors"
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
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1">
              <div>• Section: {holdScenario?.event?.section_id}</div>
              <div>
                • Conflict: {holdScenario?.event?.train_id} (
                {minToHhmm(holdScenario?.event?.arrival_minute)} -{' '}
                {minToHhmm(holdScenario?.event?.departure_minute)}), priority{' '}
                {holdScenario?.event?.priority_class}
              </div>
              <div>• Bypasses: {holdRejectedCount} rejected, 0 feasible</div>
              <div className="text-emerald-700 font-bold">
                • {holdScenario?.decision?.status}
                {holdActions[0]?.delay_estimate_minutes != null
                  ? ` · held ${holdActions[0].delay_estimate_minutes} min`
                  : ''}
              </div>
            </div>
            <button
              onClick={() => triggerEvent('HELD_TRAIN')}
              className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-xs transition-colors"
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
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1">
              <div>• Section: {replanScenario?.event?.section_id}</div>
              <div>
                • Conflict: {replanScenario?.event?.train_id} (
                {minToHhmm(replanScenario?.event?.arrival_minute)} -{' '}
                {minToHhmm(replanScenario?.event?.departure_minute)}), priority{' '}
                {replanScenario?.event?.priority_class}
              </div>
              <div>• Bypasses: {replanRejectedCount} rejected, 0 feasible · hold &gt; 45 min limit</div>
              <div className="text-red-700 font-bold">
                • {replanScenario?.decision?.status} &rarr; Arnav CP-SAT re-optimizes
              </div>
            </div>
            <button
              onClick={() => triggerEvent('NEW_TRAIN_BLOCKED')}
              className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-xs transition-colors"
            >
              Load this scenario
            </button>
          </div>
        </Card>
      </div>

      {/* What this layer evaluates, and what it does not. Stated so the demo does
          not imply coverage the implementation lacks. */}
      {criteriaCoverage && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Dynamic Allocation — Criteria Coverage
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(criteriaCoverage).map(([name, c]) => (
              <div
                key={name}
                className={`p-2.5 rounded-lg border text-[11px] ${
                  c.status === 'NOT_IMPLEMENTED'
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-emerald-50/50 border-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800 capitalize">
                    {name.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`font-mono text-[10px] font-bold ${
                      c.status === 'NOT_IMPLEMENTED' ? 'text-slate-500' : 'text-emerald-700'
                    }`}
                  >
                    {c.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-slate-500 mt-0.5 leading-snug">{c.basis || c.limitation}</p>
                {c.basis && c.limitation && (
                  <p className="text-amber-700 mt-0.5 leading-snug">{c.limitation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
