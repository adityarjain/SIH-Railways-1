import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { ROLES } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { useMastheadSubtitle } from '../../components/layout/WorksheetHeader';
import { NAV_ITEMS_BY_ROLE } from '../../components/layout/Sidebar';
import { DaySheet } from '../../components/timeline/DaySheet';
import { RegionHeader, StatFigure, wsCase } from '../../components/ui/worksheet';
import { Button, NotAvailable } from '../../components/ui';
import { bandOf } from '../../utils/risk';
import corridorsSectionsData from '../../data/corridors_sections.json';
import teamsData from '../../data/teams.json';
import networkStats from '../../data/network_stats.json';
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
    () => [...tasksOnDate].sort((a, b) => a.start_minute - b.start_minute).slice(0, 6),
    [tasksOnDate],
  );

  // Corridor situation — every corridor touched on the active date, ranked by
  // possession count. Only the top 12 are drawn, in two columns; the rest are named in the
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
  const shownCorridors = corridorStats.slice(0, 12);
  const hiddenCorridors = corridorStats.slice(12);
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
  const dSum = decisionTrace.candidate_summary || {};
  const ruleMeta = Object.entries(dSum.rejected_by_rule || {})
    .sort((x, y) => y[1] - x[1])
    .map(([rule, count]) => `${rule} ×${count}`)
    .join(' · ');

  // Masthead scope line: this page's day sheet and live horizon, which must
  // track the rolling window rather than the artifact's frozen dates.
  const horizonStart = dateOptions[0]?.date;
  const horizonEnd = dateOptions[dateOptions.length - 1]?.date;

  useMastheadSubtitle(
    <>
      {t('overview.daySheetWord')}{' '}
      <span className="font-mono text-xs text-ws-body">{activeDate}</span>
      {' · '}{t('header.planHorizon').toLowerCase()}{' '}
      <span className="font-mono text-xs text-ws-body">{horizonStart} → {horizonEnd}</span>
      {' · '}<span className="font-mono text-xs text-ws-body">{scenario.summary.total_scheduled}</span> {t('status.scheduled').toLowerCase()},{' '}
      <span className="font-mono text-xs text-ws-body">{scenario.summary.total_deferred}</span> {t('status.deferred').toLowerCase()} {t('scope.demoScenario').toLowerCase()}
    </>,
    [activeDate, horizonStart, horizonEnd, scenario, t],
  );

  const pad = 'px-3.5 md:px-4 xl:px-5';
  const fieldLabel = `font-display text-[12px] font-semibold ${uc} ${tr} text-ws-light`;
  const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  return (
    <div className="bg-ws-paper">
      {/* Horizon strip: one flexible cell per plan date. */}
      <div className="bg-ws-band border-b border-ws-rule flex items-stretch">
        <div className={`hidden lg:flex items-center shrink-0 w-[150px] xl:w-[172px] ${pad} font-display text-[12px] font-semibold ${uc} ${tr} text-ws-light leading-tight`}>
          {t('overview.planHorizonTasks')}
        </div>
        <div className="flex flex-1 min-w-0 overflow-x-auto custom-scrollbar">
          {dateOptions.map((o) => {
            const d = new Date(`${o.date}T00:00:00`);
            const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
            const active = o.date === activeDate;
            return (
              <button
                key={o.date}
                onClick={() => setSelectedDate(o.date)}
                aria-pressed={active}
                className={`flex-1 min-w-[48px] border-l border-ws-rule px-1 pt-1.5 pb-2 text-center transition-colors ${
                  active ? 'bg-ws-surface shadow-[inset_0_-3px_0_#1F1C17]' : 'hover:bg-ws-surface'
                }`}
              >
                <span className={`block font-mono text-[11px] ${active ? 'font-bold text-ws-ink' : 'font-medium text-ws-body'}`}>{o.date.slice(8, 10)}</span>
                <span className="block text-[9px] uppercase text-ws-light">{weekday}</span>
                <span className={`block font-mono text-[9px] ${o.count ? 'text-ws-mid' : 'text-ws-disabled'}`}>{o.count || '—'}</span>
              </button>
            );
          })}
        </div>
        <div className="hidden 2xl:flex items-center shrink-0 border-l border-ws-rule px-5 font-mono text-[10px] uppercase text-ws-light">
          {t('scope.demoScenarioTasks', { count: scenario.summary.total_tasks_considered })}
        </div>
      </div>

      {/* 01 — day sheet, the hero */}
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

      {/* 02 recommendation dossier + 03 attention ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-[60fr_40fr] xl:grid-cols-[64fr_36fr] gap-px bg-ws-rule border-b border-ws-rule">
        <div className={`bg-ws-dossier border-t-[3px] border-ws-ink ${pad} pt-4 pb-4 min-w-0`}>
          <RegionHeader
            number="02"
            title={t('overview.recommendation')}
            meta={`${dReq.task_id} · ${dReq.section_id} · ${t('overview.pendingAuthorityDecision')}`}
          />

          <div className="flex items-start gap-x-8 gap-y-3 pb-3 border-b border-ws-rule flex-wrap">
            <div className="shrink-0">
              <div className={`font-display text-[12px] font-bold ${uc} ${tr} text-ws-ok`}>{t('overview.recommendedWindow')}</div>
              <div className="font-mono text-[30px] md:text-[36px] font-bold leading-[1.1] tracking-[-0.02em] text-ws-ink whitespace-nowrap">
                {dSel.window || '—'}
              </div>
              <div className="font-mono text-[12px] text-ws-mid">{dSel.date}</div>
            </div>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 flex-1 min-w-[260px] pt-1">
              <span className={fieldLabel}>{t('common.blocks')}</span>
              <span className="font-mono text-[12px] text-ws-ink">{(dSel.block_ids || []).join(' + ')}</span>
              <span className={fieldLabel}>{t('common.crew')}</span>
              <span className="font-mono text-[12px] text-ws-ink">
                {primaryCrew ? t('overview.crewSummary', {
                  team: primaryCrew.team_id, size: primaryCrew.team_size ?? '—',
                  required: dReq.required_team_size ?? '—', shift: primaryCrew.shift || '—',
                }) : '—'}
              </span>
              <span className={fieldLabel}>{t('common.risk')}</span>
              <span className="font-mono text-[12px] text-ws-critical">
                {dRisk.risk_score?.toFixed?.(1) ?? dRisk.risk_score} {dRisk.risk_level} · p(fail 30d) {dRisk.failure_probability_30d}
              </span>
              <span className={fieldLabel}>{t('common.trains')}</span>
              <span className="font-mono text-[12px] text-ws-ink">
                {t('overview.trainsField', {
                  conflicting: conflictingCount, adjacent: (dImpact.adjacent || []).length,
                  min: dImpact.adjacency_buffer_minutes ?? 60,
                })}
              </span>
            </div>
          </div>

          {/* Decision basis: hanging numerals, each clause from a trace field. */}
          <div className="pt-3">
            <div className={`font-display text-[14px] font-semibold ${uc} ${tr} text-ws-ink mb-1.5`}>{t('overview.decisionBasis')}</div>
            <div className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-[13px] text-ws-body leading-[1.45]">
              <span className="font-mono text-[11px] text-ws-light pt-px">01</span>
              <span>{t('overview.decisionBasis1', {
                score: dRisk.risk_score?.toFixed?.(1) ?? dRisk.risk_score,
                band: dRisk.risk_level, threshold: 80,
              })}</span>
              <span className="font-mono text-[11px] text-ws-light pt-px">02</span>
              <span>{t('overview.decisionBasis2', {
                required: dReq.required_duration_minutes, offered: offeredMinutes ?? '—',
                blocks: (dSel.block_ids || []).join(' + '),
              })}</span>
              <span className="font-mono text-[11px] text-ws-light pt-px">03</span>
              <span>{conflictingCount === 0
                ? t('overview.decisionBasis3', { buffer: dImpact.adjacency_buffer_minutes ?? 60 })
                : t('overview.decisionBasis3Alt', { count: conflictingCount })}</span>
              <span className="font-mono text-[11px] text-ws-light pt-px">04</span>
              <span>{primaryCrew ? t('overview.decisionBasis4', {
                team: primaryCrew.team_id, available: primaryCrew.team_size ?? '—',
                required: dReq.required_team_size ?? '—',
              }) : '—'}</span>
            </div>
          </div>

          {/* Constraint check: every candidate window and the rule that decided it. */}
          <div className="pt-3.5">
            <div className="flex items-baseline gap-2.5 mb-1.5 flex-wrap">
              <span className={`font-display text-[14px] font-semibold ${uc} ${tr} text-ws-ink`}>{t('overview.constraintCheck')}</span>
              <span className="font-mono text-[11px] text-ws-mid">
                {t('overview.constraintSummary', { considered: dSum.block_windows_considered, rejected: dSum.rejected, feasible: dSum.feasible })}
              </span>
              <span className="flex-1 min-w-2" />
              <span className="font-mono text-[10px] text-ws-light">{ruleMeta}</span>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <div className="min-w-[520px] bg-ws-surface border-t border-ws-rule">
                {dCandidates.map((c, i) => {
                  const color = c.status === 'SELECTED' ? 'text-ws-info' : c.status === 'FEASIBLE' ? 'text-ws-ok' : 'text-ws-critical';
                  const verdict = c.status === 'SELECTED' ? t('decisionTrace.selected') : c.status === 'FEASIBLE' ? t('decisionTrace.feasible') : t('decisionTrace.rejected');
                  return (
                    <div
                      key={`${(c.block_ids || []).join('-')}-${c.window}-${i}`}
                      className={`grid ${isHindi ? 'grid-cols-[86px_78px_72px_minmax(0,1fr)]' : 'grid-cols-[86px_70px_72px_minmax(0,1fr)]'} items-center gap-2 px-2 py-1 border-b border-ws-hairline last:border-b-0 ${
                        c.status === 'SELECTED' ? 'bg-ws-selected' : 'hover:bg-ws-surface'
                      }`}
                    >
                      <span className={`font-mono text-[11px] text-ws-ink ${c.status === 'SELECTED' ? 'font-bold' : 'font-medium'}`}>{c.window}</span>
                      <span className={`font-display text-[12px] font-bold ${uc} ${tr} ${color}`}>{verdict}</span>
                      <span className={`font-mono text-[10px] ${c.rule ? color : 'text-ws-disabled'}`}>{c.rule || '—'}</span>
                      <span className="font-mono text-[10px] text-ws-mid overflow-hidden text-ellipsis whitespace-nowrap" title={c.reason}>{c.reason}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-4 flex-wrap">
            <Button variant="primary" onClick={() => onNavigate && onNavigate('decision-trace')}>
              {t('overview.openDecisionTrace')}
            </Button>
            <Button variant="secondary" onClick={() => onNavigate && onNavigate('block-planning')}>
              {t('overview.goToBlockPlanning')}
            </Button>
            <span className="flex-1 min-w-2" />
            <span className="text-[12px] text-ws-light">{t('overview.decisionRecordedNote')}</span>
          </div>
        </div>

        <div className={`bg-ws-surface ${pad} pt-4 pb-4 min-w-0`}>
          <RegionHeader
            number="03"
            title={t('overview.requiresAttention')}
            meta={t('overview.rankedBySeverity', { count: attention.length })}
          />

          {attention.length === 0 ? (
            <div className="py-6">
              <div className="text-[13px] font-semibold text-ws-mid">{t('overview.nothingRequiresAttention')}</div>
              <div className="text-[12px] text-ws-light mt-1 leading-relaxed">{t('overview.nothingRequiresAttentionBody')}</div>
            </div>
          ) : (
            <div className="border-t border-ws-rule">
              {attention.map((a, i) => {
                const color = a.tone === 'critical' ? 'text-ws-critical' : a.tone === 'warn' ? 'text-ws-warn' : 'text-ws-idle';
                const rule = a.tone === 'critical' ? 'hover:border-l-ws-critical' : a.tone === 'warn' ? 'hover:border-l-ws-warn' : 'hover:border-l-ws-idle';
                return (
                  <button
                    key={`${a.kind}-${i}`}
                    onClick={() => onNavigate && onNavigate(a.go)}
                    className={`grid grid-cols-[24px_minmax(0,1fr)] gap-2 w-full text-left pt-2.5 pb-[11px] px-1 border-b border-ws-hairline border-l-[3px] border-l-transparent last:border-b-0 hover:bg-ws-paper transition-colors ${rule}`}
                  >
                    <span className={`font-mono text-[17px] font-bold leading-none ${color}`}>{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0">
                      <span className="flex items-baseline gap-2">
                        <span className={`font-display text-[12px] font-bold ${uc} ${tr} ${color}`}>{a.kind}</span>
                        <span className="flex-1" />
                        <span className="font-mono text-[10px] uppercase text-ws-light">{a.right}</span>
                      </span>
                      <span className="block text-[15px] font-medium text-ws-ink leading-[1.3] mt-0.5 [text-wrap:pretty]">{a.title}</span>
                      <span className="block text-[12px] text-ws-mid leading-[1.4] mt-0.5">{a.meta}</span>
                      <span className={`block font-display text-[11px] font-semibold ${uc} ${tr} text-ws-light mt-1`}>
                        → {t(NAV_ITEMS_BY_ROLE[ROLES.AUTHORITY].find((n) => n.id === a.go)?.labelKey || 'nav.overview')}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="pt-4">
            <RegionHeader
              number="04"
              title={t('overview.nextOut')}
              meta={`${activeDate} · ${nextOut.length} / ${tasksOnDate.length}`}
            />
            {nextOut.length === 0 ? (
              <div className="py-4 text-[13px] text-ws-mid">{t('overview.noPossessionOnDate')}</div>
            ) : (
              <div className="border-t border-ws-rule">
                {nextOut.map((task) => {
                  const critical = bandOf(task) === 'CRITICAL';
                  return (
                    <button
                      key={task.task_id}
                      onClick={() => onNavigate && onNavigate('block-planning')}
                      className="flex items-baseline gap-2.5 w-full text-left py-1.5 px-1 border-b border-ws-hairline last:border-b-0 hover:bg-ws-paper transition-colors"
                    >
                      <span className={`font-mono text-[11px] font-semibold shrink-0 ${critical ? 'text-ws-critical' : 'text-ws-ink'}`}>{task.task_id}</span>
                      <span className={`text-[12px] flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap ${critical ? 'text-ws-critical' : 'text-ws-mid'}`}>
                        {task.maintenance_type} · {task.section_id}{critical ? ` · risk ${task.risk_score}` : ''}
                      </span>
                      <span className={`font-mono text-[11px] shrink-0 ${critical ? 'text-ws-critical' : 'text-ws-body'}`}>{hhmm(task.start_minute)}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <Button variant="secondary" className="w-full mt-2.5" onClick={() => onNavigate && onNavigate('block-planning')}>
              {t('overview.allOnDate', { count: tasksOnDate.length })}
            </Button>
          </div>
        </div>
      </div>

      {/* 05 corridor situation + 06 plan state */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px] gap-px bg-ws-rule border-b border-ws-rule">
        <div className={`bg-ws-surface ${pad} pt-4 pb-3.5 min-w-0`}>
          <RegionHeader
            number="05"
            title={t('overview.corridorSituation')}
            meta={`${activeDate} · ${tasksOnDate.length} / ${corridorStats.length}`}
          />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 border-t border-ws-rule">
            {shownCorridors.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCorridor(c.id)}
                aria-pressed={c.id === activeCorridor}
                className={`grid grid-cols-[56px_minmax(0,1fr)_64px] sm:grid-cols-[64px_minmax(0,1fr)_80px] items-center gap-2.5 w-full text-left px-1 py-1.5 border-b border-ws-hairline transition-colors ${
                  c.id === activeCorridor ? 'bg-ws-selected' : 'hover:bg-ws-paper'
                }`}
              >
                <span className={`font-mono text-[11px] text-ws-ink ${c.id === activeCorridor ? 'font-bold' : 'font-medium'}`}>{c.id}</span>
                <span className="flex items-center gap-2 min-w-0">
                  <span className="flex h-2 w-16 sm:w-32 shrink-0 bg-ws-tick">
                    <span className="bg-ws-critical" style={{ width: `${(c.crit / maxPoss) * 100}%` }} />
                    <span className="bg-ws-body" style={{ width: `${((c.poss - c.crit) / maxPoss) * 100}%` }} />
                  </span>
                  <span className="text-[12px] text-ws-mid overflow-hidden text-ellipsis whitespace-nowrap">{c.name}</span>
                </span>
                <span className="font-mono text-[10px] text-ws-mid text-right">{c.poss} · {c.crit} · {c.sec}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 pt-2.5 flex-wrap">
            {hiddenCorridors.length > 0 && (
              <span className="text-[12px] text-ws-light">
                {allHiddenSingle
                  ? t('overview.corridorsNotListed', { count: hiddenCorridors.length })
                  : t('overview.corridorsNotListedGeneric', { count: hiddenCorridors.length })}
              </span>
            )}
            <span className="flex-1 min-w-2" />
            <span className="inline-flex items-center gap-1.5 text-[12px] text-ws-mid">
              <span className="w-3.5 h-2 bg-ws-critical" />{t('overview.legendCriticalLower')}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[12px] text-ws-mid">
              <span className="w-3.5 h-2 bg-ws-body" />{t('overview.otherPossessions')}
            </span>
            <span className="font-mono text-[10px] uppercase text-ws-light">poss · crit · sec</span>
          </div>
        </div>

        <div className={`bg-ws-surface ${pad} pt-4 pb-4 min-w-0`}>
          <RegionHeader
            number="06"
            title={t('overview.planState')}
            meta={t('scope.fullRunTasks', { count: metrics.summary.total_tasks_considered.toLocaleString() })}
          />
          <div className="grid grid-cols-2 gap-x-5 gap-y-4 border-t border-ws-rule pt-3">
            <StatFigure
              value={metrics.summary.total_scheduled.toLocaleString()}
              label={t('overview.tasksScheduledCaption', { pct: metrics.summary.scheduled_percentage })}
            />
            <StatFigure
              value={(risk.critical_risk_deferred ?? 0).toLocaleString()}
              label={t('overview.criticalDeferred')}
              tone={risk.critical_risk_deferred ? 'text-ws-critical' : 'text-ws-ink'}
            />
            <StatFigure
              value={`${op.teams_utilized ?? 0} / ${teamsData.length}`}
              label={t('overview.crewsUtilized')}
              tone={(op.teams_utilized ?? 0) >= teamsData.length ? 'text-ws-warn' : 'text-ws-ink'}
            />
            {networkStats.track_availability_percent != null ? (
              <StatFigure
                value={`${networkStats.track_availability_percent}%`}
                label={`${t('overview.trackAvailability')} · ${(networkStats.track_available_block_windows ?? 0).toLocaleString()} / ${(networkStats.total_block_windows ?? 0).toLocaleString()}`}
              />
            ) : (
              <NotAvailable label={t('overview.trackAvailability')} />
            )}
          </div>
        </div>
      </div>

      {/* Footer: headline scope vs day-sheet scope, and the run command. */}
      <div className={`bg-ws-band ${pad} py-2 flex flex-wrap items-center gap-x-3.5 gap-y-1`}>
        <span className="font-mono text-[10px] uppercase text-ws-mid">
          {t('overview.headlineScope', {
            full: metrics.summary.total_tasks_considered.toLocaleString(),
            scheduled: metrics.summary.total_scheduled.toLocaleString(),
            deferred: (risk.critical_risk_deferred ?? 0).toLocaleString(),
            demo: scenario.summary.total_tasks_considered,
          })}
        </span>
        <span className="flex-1 min-w-2" />
        <span className="font-mono text-[10px] text-ws-light break-all">
          {prov.scope} · $ {prov.command}
        </span>
      </div>
    </div>
  );
};
