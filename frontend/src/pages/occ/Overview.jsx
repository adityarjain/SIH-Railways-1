import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import {
  Panel, PanelHeader, PanelBody, MetricRow, StatusBadge, Button,
  EmptyState, ProvenanceNote, ScopeCaption, Select,
} from '../../components/ui';
import { BlockTrainGantt } from '../../components/timeline/BlockTrainGantt';
import { minToHhmm } from '../../utils/time';
import { bandOf } from '../../utils/risk';
import corridorsSectionsData from '../../data/corridors_sections.json';
import networkStats from '../../data/network_stats.json';
import teamsData from '../../data/teams.json';
import decisionTrace from '../../data/decision_trace.json';

/**
 * Authority Overview.
 *
 * Not a KPI wall: a status strip (in the header), a hero timeline, a ranked
 * attention queue, then summary panels. Overview reports the FULL RUN; the
 * planning screen reports the demo scenario. Every figure carries the scope it
 * came from, because conflating the two is what previously produced a false
 * headline.
 */
export const Overview = ({ onNavigate }) => {
  const {
    baselineMetrics: metrics, metrics: scenario, scheduledTasks, activeEvent,
    isReplanned, replanRequest, replanScenario,
  } = usePlan();
  const { t } = useI18n();

  const risk = metrics.risk_breakdown || {};
  const op = metrics.operational_metrics || {};
  const reasons = metrics.deferral_reasons || {};
  const prov = metrics.provenance || {};

  // Default the hero timeline to the busiest plan date and corridor, so first
  // paint is dense rather than empty.
  const dateOptions = useMemo(() => {
    const counts = {};
    scheduledTasks.forEach((task) => { counts[task.date] = (counts[task.date] || 0) + 1; });
    return Object.entries(counts).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
  }, [scheduledTasks]);

  const busiestDate = useMemo(
    () => dateOptions.reduce((best, o) => (!best || o.count > best.count ? o : best), null)?.date,
    [dateOptions],
  );
  const [selectedDate, setSelectedDate] = useState(busiestDate);
  const activeDate = selectedDate || busiestDate;

  const busiestCorridor = useMemo(() => {
    const counts = {};
    scheduledTasks.forEach((task) => { if (task.date === activeDate) counts[task.corridor_id] = (counts[task.corridor_id] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  }, [scheduledTasks, activeDate]);

  const sections = useMemo(() => {
    const ids = new Set(
      scheduledTasks
        .filter((task) => task.date === activeDate && (!busiestCorridor || task.corridor_id === busiestCorridor))
        .map((task) => task.section_id),
    );
    return corridorsSectionsData.sections
      .filter((sec) => ids.has(sec.section_id))
      .sort((a, b) => a.section_id.localeCompare(b.section_id));
  }, [scheduledTasks, activeDate, busiestCorridor]);

  const corridorLabel = useMemo(() => {
    const c = corridorsSectionsData.corridors.find((x) => x.corridor_id === busiestCorridor);
    return c ? `${c.corridor_id} ${c.corridor_name}` : busiestCorridor || 'All corridors';
  }, [busiestCorridor]);

  /** Ranked by operational severity, merged from what the artifacts record. */
  const attention = useMemo(() => {
    const items = [];

    if (activeEvent) {
      const cf = replanScenario?.conflict;
      items.push({
        tone: 'critical',
        kind: t('overview.kindTrainConflict'),
        title: activeEvent.name,
        meta: cf?.details || `${activeEvent.sectionId || ''}`,
        go: 'live-ops',
      });
    }

    if (isReplanned || replanRequest?.action_required) {
      items.push({
        tone: 'warn',
        kind: t('overview.kindReplan'),
        title: isReplanned ? t('overview.possessionReoptimized') : t('overview.possessionNeedsReopt'),
        meta: t('overview.bypassRejected', { count: (replanRequest?.rejected_route_candidates || []).length }),
        go: 'replanning',
      });
    }

    if (risk.critical_risk_deferred) {
      items.push({
        tone: 'critical',
        kind: t('overview.kindCriticalDeferred'),
        title: t('overview.criticalDeferredTitle', { count: risk.critical_risk_deferred.toLocaleString() }),
        meta: t('overview.criticalDeferredMeta'),
        go: 'demand',
      });
    }

    if (reasons.team_capacity_exhausted) {
      items.push({
        tone: 'warn',
        kind: t('overview.kindCapacity'),
        title: t('overview.capacityTitle', { count: reasons.team_capacity_exhausted.toLocaleString() }),
        meta: t('overview.capacityMeta', { used: op.teams_utilized ?? 0, total: teamsData.length }),
        go: 'teams',
      });
    }

    if (reasons.no_qualifying_team_shift) {
      items.push({
        tone: 'idle',
        kind: t('overview.kindNoCrewShift'),
        title: t('overview.noCrewShiftTitle', { count: reasons.no_qualifying_team_shift.toLocaleString() }),
        meta: t('overview.noCrewShiftMeta'),
        go: 'teams',
      });
    }

    return items;
    // risk/reasons/op are stable slices of the static metrics import.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEvent, isReplanned, replanRequest, replanScenario, t]);

  const upcoming = useMemo(
    () => scheduledTasks
      .filter((task) => task.date === activeDate)
      .sort((a, b) => a.start_minute - b.start_minute)
      .slice(0, 6),
    [scheduledTasks, activeDate],
  );

  const impact = decisionTrace.train_impact || {};

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="t-section-title">{t('overview.title')}</h2>
          <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
            {t('overview.subtitle')}
          </p>
        </div>
        <Select label={t('overview.timelineDate')} value={activeDate || ''} onChange={(e) => setSelectedDate(e.target.value)}>
          {dateOptions.map((o) => (
            <option key={o.date} value={o.date}>{o.date} — {o.count} {t('common.tasks')}</option>
          ))}
        </Select>
      </div>

      {/* hero row: timeline + attention queue */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
        <BlockTrainGantt
          sections={sections}
          scheduledTasks={scheduledTasks}
          selectedDate={activeDate}
          corridorLabel={corridorLabel}
          onSelectTask={() => onNavigate && onNavigate('block-planning')}
          scope={t('scope.demoScenario')}
          compact
        />

        <Panel>
          <PanelHeader title={t('overview.criticalAttention')} scope={t('overview.criticalAttentionScope')} />
          {attention.length === 0 ? (
            <EmptyState title={t('overview.nothingRequiresAttention')}>
              {t('overview.nothingRequiresAttentionBody')}
            </EmptyState>
          ) : (
            <div className="divide-y divide-line">
              {attention.map((a, i) => (
                <button
                  key={`${a.kind}-${i}`}
                  onClick={() => onNavigate && onNavigate(a.go)}
                  className="w-full text-left px-3 py-2.5 flex gap-2.5 hover:bg-surface-sunken transition-colors"
                >
                  <span className={`w-[3px] shrink-0 ${
                    a.tone === 'critical' ? 'bg-status-critical' : a.tone === 'warn' ? 'bg-status-warn' : 'bg-status-idle'
                  }`} />
                  <span className="min-w-0">
                    <StatusBadge tone={a.tone} size="sm">{a.kind}</StatusBadge>
                    <span className="block text-xs font-medium text-rail-900 mt-1">{a.title}</span>
                    <span className="block font-mono text-[9px] text-rail-400 mt-0.5">{a.meta}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* summary panels — each captioned with its own scope */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Panel>
          <PanelHeader title={t('overview.maintenanceRisk')} scope={t('scope.fullRunTasks', { count: metrics.summary.total_tasks_considered.toLocaleString() })} />
          <MetricRow label={t('overview.criticalScheduled')} value={(risk.critical_risk_scheduled ?? 0).toLocaleString()} tone="ok" />
          <MetricRow label={t('overview.criticalDeferred')} value={(risk.critical_risk_deferred ?? 0).toLocaleString()} tone="critical" />
          <MetricRow label={t('overview.highRiskScheduled')} value={(risk.high_risk_scheduled ?? 0).toLocaleString()} />
          {/* Reported by the run artifact rather than recomputed here, so the
              screen cannot drift from the recorded figure. */}
          <MetricRow
            label={t('overview.criticalScheduledRate')}
            value={risk.critical_scheduled_rate != null ? `${risk.critical_scheduled_rate}%` : '—'}
            tone="warn"
          />
        </Panel>

        <Panel>
          <PanelHeader title={t('overview.blockStatus')} scope={t('overview.blockStatusScope')} />
          <MetricRow label={t('overview.possessionsUsed')} value={(op.unique_blocks_utilized ?? 0).toLocaleString()} onClick={() => onNavigate && onNavigate('maintenance-blocks')} />
          <MetricRow label={t('overview.nightWindowTasks')} value={(op.night_maintenance_tasks ?? 0).toLocaleString()} />
          <MetricRow label={t('overview.crewsUtilized')} value={`${op.teams_utilized ?? 0} / ${teamsData.length}`} tone="warn" onClick={() => onNavigate && onNavigate('teams')} />
          <MetricRow
            label={t('overview.trackAvailability')}
            value={`${networkStats.track_availability_percent}%`}
            tone="ok"
            sub={t('overview.trackAvailabilitySub', { avail: networkStats.track_available_block_windows.toLocaleString(), total: networkStats.total_block_windows.toLocaleString() })}
          />
        </Panel>

        <Panel>
          <PanelHeader title={t('overview.trainImpact')} scope={t('overview.trainImpactScope', { task: decisionTrace.request?.task_id || '' })} />
          <MetricRow label={t('overview.conflictingServices')} value={(impact.conflicting || []).length} tone={(impact.conflicting || []).length ? 'critical' : 'ok'} sub={t('overview.conflictingServicesSub')} />
          <MetricRow label={t('overview.adjacentServices')} value={(impact.adjacent || []).length} tone="ok" sub={t('overview.adjacentServicesSub', { min: impact.adjacency_buffer_minutes ?? 60 })} />
          <MetricRow label={t('overview.estimatedDelay')} value="0 min" tone="ok" />
          <MetricRow label={t('overview.downstreamImpact')} value={t('common.notImplemented')} tone="idle" sub={t('overview.downstreamImpactSub')} onClick={() => onNavigate && onNavigate('train-impact')} />
        </Panel>

        <Panel>
          <PanelHeader title={t('overview.optimization')} scope={t('overview.optimizationScope')} />
          <MetricRow label={t('overview.solverStatus')} value={metrics.summary.solver_status} tone={metrics.summary.solver_status === 'OPTIMAL' ? 'ok' : 'warn'} />
          <MetricRow label={t('overview.runtime')} value={`${metrics.summary.runtime_seconds} s`} sub={t('overview.runtimeSub')} />
          <MetricRow label={t('overview.scheduled')} value={`${metrics.summary.total_scheduled.toLocaleString()} (${metrics.summary.scheduled_percentage}%)`} onClick={() => onNavigate && onNavigate('performance')} />
          <MetricRow label={t('overview.postSolveValidation')} value={prov.post_solve_validation || 'not recorded'} tone="ok" onClick={() => onNavigate && onNavigate('system-verification')} />
        </Panel>
      </div>

      {/* decision + upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
        <Panel>
          <PanelHeader
            title={t('overview.recommendation')}
            scope={`${decisionTrace.request?.task_id} · ${decisionTrace.request?.section_id} · ${decisionTrace.candidate_summary?.date_evaluated}`}
            action={<Button size="sm" variant="secondary" onClick={() => onNavigate && onNavigate('decision-trace')}>{t('overview.openDecisionTrace')}</Button>}
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line">
            {[
              [t('overview.windowsConsidered'), decisionTrace.candidate_summary?.block_windows_considered, undefined],
              [t('overview.rejectedByConstraint'), decisionTrace.candidate_summary?.rejected, 'text-status-critical'],
              [t('overview.feasible'), decisionTrace.candidate_summary?.feasible, 'text-status-ok'],
              [t('overview.selectedWindow'), decisionTrace.selected?.window, undefined],
            ].map(([label, value, cls]) => (
              <div key={label} className="bg-surface-panel px-3 py-2.5">
                <div className="t-label">{label}</div>
                <div className={`font-mono text-sm font-semibold mt-0.5 ${cls || 'text-rail-900'}`}>{value ?? '—'}</div>
              </div>
            ))}
          </div>
          {decisionTrace.explanation && (
            <PanelBody className="border-t border-line">
              <p className="text-[11px] text-rail-600 leading-relaxed">{decisionTrace.explanation}</p>
            </PanelBody>
          )}
        </Panel>

        <Panel>
          <PanelHeader title={t('overview.upcoming')} scope={t('overview.upcomingScope', { date: activeDate })} />
          {upcoming.length === 0 ? (
            <EmptyState title={t('overview.noPossessionOnDate')} />
          ) : (
            <div className="divide-y divide-line">
              {upcoming.map((task) => (
                <button
                  key={task.task_id}
                  onClick={() => onNavigate && onNavigate('block-planning')}
                  className="w-full text-left px-3 py-2 flex items-center justify-between gap-3 hover:bg-surface-sunken transition-colors"
                >
                  <span className="min-w-0">
                    <span className="t-mono-id block">{task.task_id}</span>
                    <span className="block text-[10px] text-rail-400 truncate">
                      {task.maintenance_type} · {task.section_id}
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="font-mono text-[11px] text-rail-900 block">
                      {minToHhmm(task.start_minute)}–{minToHhmm(task.end_minute)}
                    </span>
                    {bandOf(task) === 'CRITICAL' && <StatusBadge tone="critical" size="sm">{t('risk.critical')}</StatusBadge>}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ScopeCaption>
          {t('overview.headlineScope', { full: metrics.summary.total_tasks_considered.toLocaleString(), demo: scenario.summary.total_tasks_considered })}
        </ScopeCaption>
        <ProvenanceNote generatedBy={prov.scope} command={prov.command} dataset={prov.dataset} />
      </div>
    </div>
  );
};
