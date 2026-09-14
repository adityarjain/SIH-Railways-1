import React, { useState } from 'react';
import { BlockTrainGantt } from '../../components/timeline/BlockTrainGantt';
import { BlockDrawer } from '../../components/timeline/BlockDrawer';
import { DecisionTraceModal } from '../../components/timeline/DecisionTraceModal';
import { TrafficContext } from '../../components/timeline/TrafficContext';
import { WeeklyViewWorksheet } from '../../components/planning/WeeklyViewWorksheet';
import { MonthlyHeatmapWorksheet } from '../../components/planning/MonthlyHeatmapWorksheet';
import { RecommendationActions } from '../../components/occ/RecommendationActions';
import { RegionHeader, SegmentedControl, StatFigure, WsSelect } from '../../components/ui/worksheet';
import teamsData from '../../data/teams.json';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import corridorsSectionsData from '../../data/corridors_sections.json';

// Both selectors are derived from the plan the optimizer actually produced, so
// every option renders a populated timeline.
const buildDateOptions = (tasks) => {
  const counts = {};
  tasks.forEach((t) => {
    if (t.date) counts[t.date] = (counts[t.date] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

const buildCorridorOptions = (tasks) => {
  const counts = {};
  tasks.forEach((t) => {
    if (t.corridor_id) counts[t.corridor_id] = (counts[t.corridor_id] || 0) + 1;
  });
  const names = {};
  corridorsSectionsData.corridors.forEach((c) => {
    names[c.corridor_id] = c.corridor_name;
  });
  return Object.entries(counts)
    .map(([id, count]) => ({ id, name: names[id] || id, count }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
};

export const BlockPlanning = ({ onNavigate }) => {
  const { scheduledTasks, metrics, activeEvent } = usePlan();
  const { t, isHindi } = useI18n();

  const dateOptions = React.useMemo(() => buildDateOptions(scheduledTasks), [scheduledTasks]);
  const corridorOptions = React.useMemo(() => buildCorridorOptions(scheduledTasks), [scheduledTasks]);

  const busiestDate =
    dateOptions.reduce((best, o) => (!best || o.count > best.count ? o : best), null)?.date ||
    '2026-09-03';
  const busiestCorridorOnDate = React.useMemo(() => {
    const counts = {};
    scheduledTasks.forEach((t) => {
      if (t.date === busiestDate) counts[t.corridor_id] = (counts[t.corridor_id] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'ALL';
  }, [scheduledTasks, busiestDate]);
  const [selectedDate, setSelectedDate] = useState(busiestDate);
  const [selectedCorridor, setSelectedCorridor] = useState(busiestCorridorOnDate);
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline', 'weekly', 'monthly'

  const [drawerTask, setDrawerTask] = useState(null);
  const [decisionTraceOpen, setDecisionTraceOpen] = useState(false);
  const [decisionTraceTask, setDecisionTraceTask] = useState(null);

  const activeSectionIds = React.useMemo(() => {
    const ids = new Set();
    scheduledTasks.forEach((task) => {
      if (task.date === selectedDate && (selectedCorridor === 'ALL' || task.corridor_id === selectedCorridor)) {
        ids.add(task.section_id);
      }
    });
    return ids;
  }, [scheduledTasks, selectedDate, selectedCorridor]);

  const sections = corridorsSectionsData.sections
    .filter((s) => activeSectionIds.has(s.section_id))
    .sort((a, b) => a.section_id.localeCompare(b.section_id));

  const corridorLabel = React.useMemo(() => {
    if (selectedCorridor === 'ALL') return t('common.allCorridors');
    const c = corridorsSectionsData.corridors.find((x) => x.corridor_id === selectedCorridor);
    return c ? `${c.corridor_id} ${c.corridor_name}` : selectedCorridor;
  }, [selectedCorridor, t]);

  const trafficSectionId = drawerTask?.section_id || sections[0]?.section_id || 'SEC-0004';

  const handleOpenDecisionTrace = (task) => {
    setDecisionTraceTask(task);
    setDecisionTraceOpen(true);
  };

  return (
    <div className="bg-ws-band min-h-full">
      {/* intro */}
      <div className="bg-ws-paper border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-2.5 flex items-center justify-between gap-4 flex-wrap">
        <p className="font-ws text-xs text-ws-mid max-w-3xl leading-relaxed flex-1 min-w-[240px]">{t('blockPlanning.subtitle')}</p>
        <div className="text-right shrink-0">
          <div className="font-mono text-[10px] text-ws-light uppercase">{t('blockPlanning.generatedOffline')}</div>
          <div className="font-mono text-[10px] text-ws-light">$ python demo.py</div>
        </div>
      </div>

      {/* 01 — scenario summary */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
        <RegionHeader number="01" title={t('blockPlanning.scenarioSummary')} meta={t('blockPlanning.scenarioScope')} isHindi={isHindi} />
        <div className="flex flex-wrap items-center gap-2.5 pb-3.5">
          <WsSelect value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
            {dateOptions.map((o) => (
              <option key={o.date} value={o.date}>{o.date} · {o.count} {t('common.tasks')}</option>
            ))}
          </WsSelect>
          <WsSelect value={selectedCorridor} onChange={(e) => setSelectedCorridor(e.target.value)}>
            <option value="ALL">{t('common.allCorridors')} · {scheduledTasks.length}</option>
            {corridorOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.id} — {o.name} · {o.count}</option>
            ))}
          </WsSelect>
          <span className="flex-1 min-w-2" />
          {dateOptions.length > 0 && (
            <span className="font-mono text-[10px] text-ws-light">
              {t('blockPlanning.planSpan', { from: dateOptions[0].date, to: dateOptions[dateOptions.length - 1].date })}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-x-5 gap-y-3.5 border-t border-ws-rule pt-3">
          <StatFigure value={metrics.risk_breakdown.critical_risk_scheduled} label={t('blockPlanning.criticalTasks')} tone="text-ws-critical" />
          <StatFigure value={metrics.risk_breakdown.high_risk_scheduled} label={t('blockPlanning.highRiskTasks')} tone="text-ws-warn" />
          <StatFigure value={metrics.summary.total_tasks_considered} label={t('blockPlanning.tasksConsidered')} />
          <StatFigure value={metrics.operational_metrics.unique_blocks_utilized} label={t('blockPlanning.plannedBlocks')} tone="text-ws-info" />
          <StatFigure value={metrics.summary.total_deferred.toLocaleString()} label={t('blockPlanning.deferred')} />
          <StatFigure value={`${metrics.operational_metrics.teams_utilized}/${teamsData.length}`} label={t('blockPlanning.crewsUtilized')} tone="text-ws-bundle" />
          <StatFigure value={activeEvent ? 1 : 0} label={t('blockPlanning.trainConflicts')} tone={activeEvent ? 'text-ws-warn' : 'text-ws-ok'} />
        </div>
      </div>

      {/* 02 — controller decision */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-3.5">
        <RecommendationActions taskId="TASK-000005" />
      </div>

      {/* 03 — timeline / weekly / monthly */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-3.5">
        <RegionHeader number="03" title={t('gantt.title')} isHindi={isHindi} />
        <SegmentedControl
          options={[
            { id: 'timeline', label: t('blockPlanning.viewTimeline') },
            { id: 'weekly', label: t('blockPlanning.viewWeekly') },
            { id: 'monthly', label: t('blockPlanning.viewMonthly') },
          ]}
          value={viewMode}
          onChange={setViewMode}
          isHindi={isHindi}
          size="sm"
        />
      </div>
      {viewMode === 'timeline' && (
        <div className="bg-ws-band px-3.5 md:px-4 xl:px-5 py-3.5">
          <BlockTrainGantt
            sections={sections}
            scheduledTasks={scheduledTasks}
            selectedDate={selectedDate}
            corridorLabel={corridorLabel}
            onSelectTask={setDrawerTask}
            scope={t('scope.demoScenario')}
          />
        </div>
      )}
      {viewMode === 'weekly' && (
        <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-3.5">
          <WeeklyViewWorksheet selectedDate={selectedDate} onSelectDate={(date) => { setSelectedDate(date); setViewMode('timeline'); }} />
        </div>
      )}
      {viewMode === 'monthly' && (
        <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-3.5">
          <MonthlyHeatmapWorksheet onSelectDate={(date) => { setSelectedDate(date); setViewMode('timeline'); }} />
        </div>
      )}

      {/* 04 — operational traffic context */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
        <RegionHeader number="04" title={t('blockPlanning.trafficContextTitle')} meta={`${trafficSectionId} · ${t('header.syntheticData')}`} isHindi={isHindi} />
        <TrafficContext sectionId={trafficSectionId} />
      </div>

      {/* cross-department bundling lives on Maintenance Blocks — link out rather than duplicate the register here */}
      <div className="bg-ws-paper border-t border-ws-rule px-3.5 md:px-4 xl:px-5 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <span className="font-ws text-xs text-ws-mid">{t('blockPlanning.bundlingHint')}</span>
        <button
          onClick={() => onNavigate && onNavigate('maintenance-blocks')}
          className="font-display text-[11px] font-bold uppercase tracking-wide text-ws-mid hover:text-ws-ink transition-colors shrink-0"
        >
          {t('nav.maintenanceBlocks')} →
        </button>
      </div>

      <BlockDrawer
        task={drawerTask}
        isOpen={Boolean(drawerTask)}
        onClose={() => setDrawerTask(null)}
        onOpenDecisionTrace={handleOpenDecisionTrace}
      />
      <DecisionTraceModal
        task={decisionTraceTask}
        isOpen={decisionTraceOpen}
        onClose={() => setDecisionTraceOpen(false)}
      />
    </div>
  );
};
