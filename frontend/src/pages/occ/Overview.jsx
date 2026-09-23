import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { ROLES } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { WorksheetHeader } from '../../components/layout/WorksheetHeader';
import { NAV_ITEMS_BY_ROLE } from '../../components/layout/Sidebar';
import { DaySheet } from '../../components/timeline/DaySheet';
import { RegionHeader, wsCase } from '../../components/ui/worksheet';
import { bandOf } from '../../utils/risk';
import corridorsSectionsData from '../../data/corridors_sections.json';
import teamsData from '../../data/teams.json';
import decisionTrace from '../../data/live/decisionTrace';
import { LIVE_DATES, TODAY } from '../../utils/dateShift';

/**
 * Authority Overview — "industrial worksheet" (design 2A).
 *
 * A lean at-a-glance surface, not a KPI wall and not a second copy of every
 * other Authority screen. Regions that duplicated Decision Trace, Resources
 * and Analytics almost verbatim were cut in the declutter pass; what remains
 * is either unique to this page (the day sheet, the ranked attention ledger)
 * or a genuine summary with a one-click path to the page that owns the detail.
 *
 * Reading order: PLAN (day sheet) -> DECISION (recommendation) -> OPERATIONAL
 * CONTEXT (attention, next out, corridor situation).
 *
 * Overview reports the FULL RUN (`baselineMetrics`) in its footer; the day
 * sheet and dossier report the DEMO SCENARIO (`metrics` / `decision_trace.json`).
 * Every figure keeps the scope it came from.
 */

const CORRIDOR_NAME = Object.fromEntries(
  corridorsSectionsData.corridors.map((c) => [c.corridor_id, c.corridor_name]),
);

/** "HH:MM–HH:MM" -> minutes span. Used only to derive prose from a real
 *  candidate window string, never to invent a duration. */
const windowSpanMinutes = (window) => {
  if (typeof window !== 'string') return null;
  const [a, b] = window.split(/[–-]/).map((s) => s.trim());
  const toMin = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
  };
  const start = toMin(a);
  let end = toMin(b);
  if (start == null || end == null) return null;
  if (end <= start) end += 24 * 60; // window wraps past midnight
  return end - start;
};

export const Overview = ({ onNavigate }) => {
  const {
    baselineMetrics: metrics, metrics: scenario, scheduledTasks, activeEvent,
    isReplanned, replanRequest, replanScenario, replannedRecord,
  } = usePlan();
  const { t, isHindi } = useI18n();

  const risk = metrics.risk_breakdown || {};
  const op = metrics.operational_metrics || {};
  const reasons = metrics.deferral_reasons || {};
  const prov = metrics.provenance || {};

  const { uc, tr } = wsCase(isHindi);

  // Task counts per date the plan actually schedules something on.
  const taskCounts = useMemo(() => {
    const counts = {};
    scheduledTasks.forEach((task) => { counts[task.date] = (counts[task.date] || 0) + 1; });
    return counts;
  }, [scheduledTasks]);

  const busiestDate = useMemo(() => {
    const entries = Object.entries(taskCounts);
    return entries.reduce((best, [date, count]) => (!best || count > best.count ? { date, count } : best), null)?.date;
  }, [taskCounts]);
  // Land on today, not the busiest day -- an ops screen should open on "now".
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const activeDate = selectedDate || busiestDate;

  // Every calendar date in the run's live plan horizon, not just the ones
  // with a scheduled task — the horizon strip is a 14-day ruler, and a day
  // with no work still needs its own honest "—" cell. LIVE_DATES is the
  // demo scenario's 14-day dataset re-anchored onto a rolling real-calendar
  // window (utils/dateShift.js), not the frozen 2026-09-03..16 dates baked
  // into the artifact.
  const dateOptions = useMemo(
    () => LIVE_DATES.map((date) => ({ date, count: taskCounts[date] || 0 })),
    [taskCounts],
  );

  // Busiest day in the horizon — the calendar's load bars are drawn relative to it.
  const maxDayCount = Math.max(1, ...dateOptions.map((o) => o.count));

  const tasksOnDate = useMemo(
    () => scheduledTasks.filter((task) => task.date === activeDate),
    [scheduledTasks, activeDate],
  );

  // Corridor selector: options are corridors actually touched on this date.
  const corridorOptions = useMemo(() => {
    const counts = new Map();
    tasksOnDate.forEach((task) => counts.set(task.corridor_id, (counts.get(task.corridor_id) || 0) + 1));
    return [...counts.entries()]
      .map(([id, count]) => ({ id, count, label: `${id} ${CORRIDOR_NAME[id] || ''}`.trim() }))
      .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
  }, [tasksOnDate]);

  const busiestCorridor = corridorOptions[0]?.id;
  const [selectedCorridor, setSelectedCorridor] = useState(busiestCorridor);
  const activeCorridor = corridorOptions.some((c) => c.id === selectedCorridor) ? selectedCorridor : busiestCorridor;

  const sections = useMemo(() => {
    const ids = new Set(
      tasksOnDate.filter((task) => task.corridor_id === activeCorridor).map((task) => task.section_id),
    );
    return corridorsSectionsData.sections
      .filter((sec) => ids.has(sec.section_id))
      .sort((a, b) => a.section_id.localeCompare(b.section_id));
  }, [tasksOnDate, activeCorridor]);

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
        right: activeEvent.trainId || activeEvent.sectionId || '',
        go: 'live-ops',
      });
    }

    if (isReplanned || replanRequest?.action_required) {
      items.push({
        tone: 'warn',
        kind: t('overview.kindReplan'),
        title: isReplanned ? t('overview.possessionReoptimized') : t('overview.possessionNeedsReopt'),
        meta: t('overview.bypassRejected', { count: (replanRequest?.rejected_route_candidates || []).length }),
        right: decisionTrace.request?.task_id || replannedRecord?.task_id || '',
        go: 'replanning',
      });
    }

    if (risk.critical_risk_deferred) {
      items.push({
        tone: 'critical',
        kind: t('overview.kindCriticalDeferred'),
        title: t('overview.criticalDeferredTitle', { count: risk.critical_risk_deferred.toLocaleString() }),
        meta: t('overview.criticalDeferredMeta'),
        right: t('scope.fullRun'),
        go: 'demand',
      });
    }

    if (reasons.team_capacity_exhausted) {
      items.push({
        tone: 'warn',
        kind: t('overview.kindCapacity'),
        title: t('overview.capacityTitle', { count: reasons.team_capacity_exhausted.toLocaleString() }),
        meta: t('overview.capacityMeta', { used: op.teams_utilized ?? 0, total: teamsData.length }),
        right: `${op.teams_utilized ?? 0} / ${teamsData.length} ${t('common.crew')}`,
        go: 'teams',
      });
    }

    if (reasons.no_qualifying_team_shift) {
      items.push({
        tone: 'idle',
        kind: t('overview.kindNoCrewShift'),
        title: t('overview.noCrewShiftTitle', { count: reasons.no_qualifying_team_shift.toLocaleString() }),
        meta: t('overview.noCrewShiftMeta'),
        right: t('scope.fullRun'),
        go: 'teams',
      });
    }

    return items;
    // risk/reasons/op are stable slices of the static metrics import.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEvent, isReplanned, replanRequest, replanScenario, replannedRecord, t]);

  const nextOut = useMemo(
    () => [...tasksOnDate].sort((a, b) => a.start_minute - b.start_minute).slice(0, 4),
    [tasksOnDate],
  );

  // Corridor situation — every corridor touched on the active date, ranked by
  // possession count. Only the top 6 are drawn; the rest are named in the
  // footnote so the count is never silently dropped.
  const corridorStats = useMemo(() => {
    const map = new Map();
    tasksOnDate.forEach((task) => {
      const entry = map.get(task.corridor_id) || { poss: 0, crit: 0, sections: new Set() };
      entry.poss += 1;
      if (bandOf(task) === 'CRITICAL') entry.crit += 1;
      entry.sections.add(task.section_id);
      map.set(task.corridor_id, entry);
    });
    return [...map.entries()]
      .map(([id, e]) => ({ id, poss: e.poss, crit: e.crit, sec: e.sections.size, name: CORRIDOR_NAME[id] || '' }))
      .sort((a, b) => b.poss - a.poss || a.id.localeCompare(b.id));
  }, [tasksOnDate]);

  const maxPoss = Math.max(1, corridorStats[0]?.poss || 1);
  const shownCorridors = corridorStats.slice(0, 6);
  const hiddenCorridors = corridorStats.slice(6);
  const allHiddenSingle = hiddenCorridors.length > 0 && hiddenCorridors.every((c) => c.poss === 1);

  // Decision basis — four clauses, each derived from a real decision_trace.json
  // field rather than hand-written narrative. Never fabricated.
  const dReq = decisionTrace.request || {};
  const dRisk = decisionTrace.risk_signal || {};
  const dSel = decisionTrace.selected || {};
  const dImpact = decisionTrace.train_impact || {};
  const dCandidates = decisionTrace.candidates || [];
  const selectedCandidate = dCandidates.find((c) => c.status === 'SELECTED');
  const offeredMinutes = windowSpanMinutes(selectedCandidate?.window);
  const primaryCrew = (dSel.teams || [])[0];
  const conflictingCount = (dImpact.conflicting || []).length;

  // Masthead subtitle date range — the shared WorksheetHeader computes its
  // own run-state line (full-run scope, static); this is the day-sheet's
  // own live horizon and must track the rolling window, not that one.
  const horizonStart = dateOptions[0]?.date;
  const horizonEnd = dateOptions[dateOptions.length - 1]?.date;

  const overviewSubtitle = (
    <>
      {t('overview.daySheetWord')}{' '}
      <span className="font-mono text-xs text-ws-body">{activeDate}</span>
      {' · '}{t('header.planHorizon').toLowerCase()}{' '}
      <span className="font-mono text-xs text-ws-body">{horizonStart} → {horizonEnd}</span>
      {' · '}<span className="font-mono text-xs text-ws-body">{scenario.summary.total_scheduled}</span> {t('status.scheduled').toLowerCase()},{' '}
      <span className="font-mono text-xs text-ws-body">{scenario.summary.total_deferred}</span> {t('status.deferred').toLowerCase()} {t('scope.demoScenario').toLowerCase()}
    </>
  );

  return (
    <div className="bg-ws-band min-h-full">
      <WorksheetHeader activeTab="overview" onNavigate={onNavigate} subtitle={overviewSubtitle} />

      {/* Horizon calendar. Separate cards rather than a single ruled grid:
          each day is a target, and the grid lines were doing no work that the
          gaps don't. The active day is a filled accent chip, not a black block. */}
      <div className="bg-ws-paper px-4 md:px-5 xl:px-6 pt-4 pb-5">
        <div className="flex items-baseline gap-3 pb-2.5 flex-wrap">
          <span className="font-display text-[13px] font-semibold text-ws-body">
            {t('overview.planHorizonTasks')}
          </span>
          <span className="text-[12px] text-ws-mid ml-auto">
            {t('scope.demoScenarioTasks', { count: scenario.summary.total_tasks_considered })}
          </span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          {dateOptions.map((o) => {
            const d = new Date(`${o.date}T00:00:00`);
            const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
            const weekend = d.getDay() === 0 || d.getDay() === 6;
            const day = o.date.slice(8, 10);
            const active = o.date === activeDate;
            return (
              <button
                key={o.date}
                onClick={() => setSelectedDate(o.date)}
                aria-pressed={active}
                className={`flex-1 min-w-[58px] rounded-md px-1.5 pt-2.5 pb-3 text-center transition-all duration-150 ${
                  active
                    ? 'bg-accent translate-y-[1px] shadow-[inset_3px_3px_6px_rgba(150,50,0,0.45),inset_-2px_-2px_4px_rgba(255,170,120,0.5)]'
                    : weekend
                    ? 'bg-ws-tick shadow-key hover:text-status-info'
                    : 'bg-ws-surface shadow-key hover:text-status-info'
                }`}
              >
                <span className={`block font-display text-[10px] font-semibold ${active ? 'text-accent-ink/80' : 'text-ws-light'}`}>
                  {weekday}
                </span>
                <span className={`block font-mono text-[20px] font-semibold leading-none mt-1 tracking-[-0.02em] ${active ? 'text-accent-ink' : 'text-ws-ink'}`}>
                  {day}
                </span>
                <span className={`block h-[3px] rounded-full mt-2.5 ${active ? 'bg-accent-ink/20' : 'bg-ws-tick'}`}>
                  {o.count > 0 && (
                    <span
                      className={`block h-full rounded-full ${active ? 'bg-accent-ink' : 'bg-ws-steel/70'}`}
                      style={{ width: `${Math.max(10, (o.count / maxDayCount) * 100)}%` }}
                    />
                  )}
                </span>
                <span className={`block font-mono text-[11px] mt-1.5 ${active ? 'text-accent-ink' : o.count ? 'text-ws-mid' : 'text-ws-disabled'}`}>
                  {o.count || '0'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* day sheet (region 01 of the design, rendered by DaySheet itself) */}
      <DaySheet
        corridorOptions={corridorOptions}
        corridorId={activeCorridor}
        onCorridorChange={setSelectedCorridor}
        sections={sections}
        scheduledTasks={scheduledTasks}
        date={activeDate}
        replannedTaskId={replannedRecord?.task_id && isReplanned ? replannedRecord.task_id : null}
        onSelectTask={() => onNavigate && onNavigate('block-planning')}
      />

      {/* Recommendation + attention ledger. Two cards side by side rather than
          two panes divided by a rule: the 3px ink band that used to cap this
          row was the heaviest line on the page. */}
      <div className="grid grid-cols-1 lg:grid-cols-[60fr_40fr] xl:grid-cols-[64fr_36fr] gap-6 px-4 md:px-5 xl:px-6 pt-6">
        <div className="bg-ws-surface rounded-lg shadow-panel px-6 pt-6 pb-7 min-w-0">
          <RegionHeader
            title={t('overview.recommendation')}
            meta={`${dReq.task_id} · ${dReq.section_id} · ${t('overview.pendingAuthorityDecision')}`}
          />

          <div className="flex items-end gap-5 pt-0.5 pb-3 border-b border-ws-rule flex-wrap">
            <div>
              {/* The one number a controller acts on, set as an instrument readout. */}
              <div className="crt px-5 pt-3 pb-4 min-w-[260px]">
                <div className="flex items-center gap-2">
                  <span className="led bg-[#22C55E] shadow-led-ok" aria-hidden="true" />
                  <span className={`font-mono text-[11px] font-bold ${uc} ${tr} text-[#A8B2D1]`}>{t('overview.recommendedWindow')}</span>
                </div>
                <div className="crt-glow font-mono text-[40px] font-bold leading-[1.1] tracking-[-0.02em] mt-2">
                  {dSel.window || '—'}
                </div>
                <div className="font-mono text-xs text-[#A8B2D1] mt-1">{dSel.date}</div>
              </div>
            </div>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5 flex-1 min-w-[280px]">
              <span className={`font-display text-xs font-semibold ${uc} ${tr} text-ws-light`}>{t('common.blocks')}</span>
              <span className="font-mono text-xs text-ws-ink">{(dSel.block_ids || []).join(' + ')}</span>
              <span className={`font-display text-xs font-semibold ${uc} ${tr} text-ws-light`}>{t('common.crew')}</span>
              <span className="font-mono text-xs text-ws-ink">
                {primaryCrew ? t('overview.crewSummary', {
                  team: primaryCrew.team_id, size: primaryCrew.team_size ?? '—',
                  required: dReq.required_team_size ?? '—', shift: primaryCrew.shift || '—',
                }) : '—'}
              </span>
              <span className={`font-display text-xs font-semibold ${uc} ${tr} text-ws-light`}>{t('common.risk')}</span>
              <span className="font-mono text-xs text-ws-critical">
                {dRisk.risk_score?.toFixed?.(1) ?? dRisk.risk_score} {dRisk.risk_level} · p(fail 30d) {dRisk.failure_probability_30d}
              </span>
              <span className={`font-display text-xs font-semibold ${uc} ${tr} text-ws-light`}>{t('common.trains')}</span>
              <span className="font-mono text-xs text-ws-ink">
                {t('overview.trainsField', {
                  conflicting: conflictingCount, adjacent: (dImpact.adjacent || []).length,
                  min: dImpact.adjacency_buffer_minutes ?? 60,
                })}
              </span>
            </div>
          </div>

          <div className="pt-3.5 pb-0.5">
            <div className={`font-display text-sm font-semibold ${uc} ${tr} text-ws-ink mb-1.5`}>{t('overview.decisionBasis')}</div>
            <div className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-2.5 gap-y-2.5 font-ws text-[13px] text-ws-body leading-[1.5]">
              <span className="font-mono text-[11px] text-ws-light">01</span>
              <span>{t('overview.decisionBasis1', {
                score: dRisk.risk_score?.toFixed?.(1) ?? dRisk.risk_score,
                band: dRisk.risk_level, threshold: 80,
              })}</span>
              <span className="font-mono text-[11px] text-ws-light">02</span>
              <span>{t('overview.decisionBasis2', {
                required: dReq.required_duration_minutes, offered: offeredMinutes ?? '—',
                blocks: (dSel.block_ids || []).join(' + '),
              })}</span>
              <span className="font-mono text-[11px] text-ws-light">03</span>
              <span>{conflictingCount === 0
                ? t('overview.decisionBasis3', { buffer: dImpact.adjacency_buffer_minutes ?? 60 })
                : t('overview.decisionBasis3Alt', { count: conflictingCount })}</span>
              <span className="font-mono text-[11px] text-ws-light">04</span>
              <span>{primaryCrew ? t('overview.decisionBasis4', {
                team: primaryCrew.team_id, available: primaryCrew.team_size ?? '—',
                required: dReq.required_team_size ?? '—',
              }) : '—'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-[15px] flex-wrap">
            <button
              onClick={() => onNavigate && onNavigate('decision-trace')}
              className="px-4 py-2 rounded-md font-display text-[13px] font-semibold text-accent-ink bg-accent shadow-key-accent hover:bg-accent-hover active:translate-y-[1px] active:shadow-pressed transition-all"
            >
              {t('overview.openDecisionTrace')}
            </button>
            <button
              onClick={() => onNavigate && onNavigate('block-planning')}
              className="px-4 py-2 rounded-md font-display text-[13px] font-semibold text-ws-ink bg-ws-surface shadow-key hover:text-status-info active:translate-y-[1px] active:shadow-pressed transition-all duration-150"
            >
              {t('overview.goToBlockPlanning')}
            </button>
            <span className="flex-1 min-w-2" />
            <span className="font-ws text-xs text-ws-light">{t('overview.decisionRecordedNote')}</span>
          </div>
        </div>

        {/* Attention ledger + next out */}
        <div className="bg-ws-surface rounded-lg shadow-panel px-6 pt-6 pb-7 min-w-0">
          <RegionHeader
            title={t('overview.requiresAttention')}
            meta={t('overview.rankedBySeverity', { count: attention.length })}
          />

          {attention.length === 0 ? (
            <div className="py-6">
              <div className="font-ws text-xs font-semibold text-ws-mid">{t('overview.nothingRequiresAttention')}</div>
              <div className="font-ws text-[11px] text-ws-light mt-1 leading-relaxed">{t('overview.nothingRequiresAttentionBody')}</div>
            </div>
          ) : (
            <div className="border-t border-ws-rule">
              {attention.map((a, i) => {
                const color = a.tone === 'critical' ? 'text-ws-critical' : a.tone === 'warn' ? 'text-ws-warn' : 'text-ws-idle';
                const borderHover = a.tone === 'critical' ? 'hover:border-l-ws-critical' : a.tone === 'warn' ? 'hover:border-l-ws-warn' : 'hover:border-l-ws-idle';
                return (
                  <button
                    key={`${a.kind}-${i}`}
                    onClick={() => onNavigate && onNavigate(a.go)}
                    className={`grid grid-cols-[24px_minmax(0,1fr)] gap-2.5 w-full text-left py-3 px-1.5 border-b border-ws-hairline border-l-[3px] border-l-transparent last:border-b-0 hover:bg-ws-paper transition-colors ${borderHover}`}
                  >
                    <span className={`font-mono text-[17px] font-bold leading-none ${color}`}>{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0">
                      <span className="flex items-baseline gap-2">
                        <span className={`font-display text-xs font-bold ${uc} ${tr} ${color}`}>{a.kind}</span>
                        <span className="flex-1" />
                        <span className="text-[12px] text-ws-mid">{a.right}</span>
                      </span>
                      <span className="block font-ws text-[15px] font-medium text-ws-ink leading-[1.3] mt-0.5">{a.title}</span>
                      <span className="block font-ws text-xs text-ws-mid leading-[1.4] mt-0.5">{a.meta}</span>
                      <span className={`block font-display text-[11px] font-semibold ${uc} tracking-[0.08em] text-ws-light mt-1`}>
                        → {t(NAV_ITEMS_BY_ROLE[ROLES.AUTHORITY].find((n) => n.id === a.go)?.labelKey || 'nav.overview')}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="pt-[18px]">
            <RegionHeader
              number="04"
              title={t('overview.nextOut')}
              isHindi={isHindi}
              meta={`${activeDate} · ${nextOut.length} / ${tasksOnDate.length}`}
            />
            {nextOut.length === 0 ? (
              <div className="py-4 font-ws text-xs text-ws-mid">{t('overview.noPossessionOnDate')}</div>
            ) : (
              <div className="border-t border-ws-rule">
                {nextOut.map((task) => {
                  const critical = bandOf(task) === 'CRITICAL';
                  return (
                    <button
                      key={task.task_id}
                      onClick={() => onNavigate && onNavigate('block-planning')}
                      className="flex items-baseline gap-2.5 w-full text-left py-2 px-1.5 border-b border-ws-hairline last:border-b-0 hover:bg-ws-paper transition-colors"
                    >
                      <span className={`font-mono text-[11px] font-semibold shrink-0 ${critical ? 'text-ws-critical' : 'text-ws-ink'}`}>{task.task_id}</span>
                      <span className="font-ws text-xs text-ws-mid flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                        {task.maintenance_type} · {task.section_id}{critical ? ` · risk ${task.risk_score}` : ''}
                      </span>
                      <span className={`font-mono text-[11px] shrink-0 ${critical ? 'text-ws-critical' : 'text-ws-body'}`}>
                        {String(Math.floor(task.start_minute / 60)).padStart(2, '0')}:{String(task.start_minute % 60).padStart(2, '0')}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <button
              onClick={() => onNavigate && onNavigate('block-planning')}
              className={`w-full mt-2 py-1.5 font-display text-[13px] font-bold ${uc} ${tr} text-ws-mid bg-transparent border border-ws-rule hover:bg-ws-paper hover:text-ws-ink transition-colors`}
            >
              {t('overview.allOnDate', { count: tasksOnDate.length })}
            </button>
          </div>
        </div>
      </div>

      {/* Corridor situation */}
      <div className="bg-ws-surface rounded-lg shadow-panel mx-4 md:mx-5 xl:mx-6 mt-6 px-6 pt-6 pb-6">
        <RegionHeader
          title={t('overview.corridorSituation')}
          meta={`${activeDate} · ${tasksOnDate.length} / ${corridorStats.length}`}
        />
        <div className="max-w-2xl">
          {shownCorridors.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCorridor(c.id)}
              className={`grid grid-cols-[52px_minmax(0,1fr)_58px] sm:grid-cols-[72px_minmax(0,1fr)_104px] items-center gap-2 sm:gap-2.5 w-full text-left px-1.5 py-1.5 border-b border-ws-hairline hover:bg-ws-paper ${
                c.id === activeCorridor ? 'bg-ws-selected' : ''
              }`}
            >
              <span className={`font-mono text-[11px] ${c.id === activeCorridor ? 'font-bold' : 'font-medium'} text-ws-ink`}>{c.id}</span>
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="flex h-[9px] w-8 sm:w-32 shrink-0 gap-px bg-ws-tick">
                  <span className="bg-ws-critical" style={{ width: `${(c.crit / maxPoss) * 100}%` }} />
                  <span className="bg-ws-body" style={{ width: `${((c.poss - c.crit) / maxPoss) * 100}%` }} />
                </span>
                <span className="font-ws text-xs text-ws-mid overflow-hidden text-ellipsis whitespace-nowrap">{c.name}</span>
              </span>
              <span className="text-[12px] text-ws-mid text-right">{c.poss} · {c.crit} · {c.sec}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 pt-[9px] flex-wrap">
          {hiddenCorridors.length > 0 && (
            <span className="font-ws text-xs text-ws-light">
              {allHiddenSingle
                ? t('overview.corridorsNotListed', { count: hiddenCorridors.length })
                : t('overview.corridorsNotListedGeneric', { count: hiddenCorridors.length })}
            </span>
          )}
          <span className="flex-1 min-w-2" />
          <span className="inline-flex items-center gap-1.5 font-ws text-xs text-ws-mid">
            <span className="w-3.5 h-[9px] bg-ws-critical" />{t('overview.legendCriticalLower')}
          </span>
          <span className="inline-flex items-center gap-1.5 font-ws text-xs text-ws-mid">
            <span className="w-3.5 h-[9px] bg-ws-body" />{t('overview.otherPossessions')}
          </span>
        </div>
      </div>

      {/* footer */}
      <div className="px-4 md:px-5 xl:px-6 pt-4 pb-5 mt-2 flex flex-wrap items-center gap-3.5">
        <span className="text-[12px] text-ws-mid">
          {t('overview.headlineScope', {
            full: metrics.summary.total_tasks_considered.toLocaleString(),
            scheduled: metrics.summary.total_scheduled.toLocaleString(),
            deferred: (risk.critical_risk_deferred ?? 0).toLocaleString(),
            demo: scenario.summary.total_tasks_considered,
          })}
        </span>
        <span className="flex-1 min-w-2" />
        <span className="text-[12px] text-ws-mid break-all">
          {prov.scope} · $ {prov.command}
        </span>
      </div>
    </div>
  );
};
