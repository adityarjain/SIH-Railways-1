import React, { useState } from 'react';
import { BlockTrainGantt } from '../../components/timeline/BlockTrainGantt';
import { MetricCard } from '../../components/common/MetricCard';
import { ScopeCaption, FilterBar, Select } from '../../components/ui';
import teamsData from '../../data/teams.json';
import { BlockDrawer } from '../../components/timeline/BlockDrawer';
import { DecisionTraceModal } from '../../components/timeline/DecisionTraceModal';
import { BundlingView } from '../../components/timeline/BundlingView';
import { TrafficContext } from '../../components/timeline/TrafficContext';
import { WeeklyView } from '../../components/planning/WeeklyView';
import { MonthlyHeatmap } from '../../components/planning/MonthlyHeatmap';
import { RecommendationActions } from '../../components/occ/RecommendationActions';
import { usePlan } from '../../context/PlanContext';
import corridorsSectionsData from '../../data/corridors_sections.json';

// Both selectors are derived from the plan the optimizer actually produced, so
// every option renders a populated timeline. Previously the date and corridor
// lists were hardcoded to values the demo plan does not use, leaving 11 of 12
// combinations empty.
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

export const BlockPlanning = () => {
  const { scheduledTasks, metrics, activeEvent } = usePlan();

  const dateOptions = React.useMemo(() => buildDateOptions(scheduledTasks), [scheduledTasks]);
  const corridorOptions = React.useMemo(() => buildCorridorOptions(scheduledTasks), [scheduledTasks]);

  // Default to the busiest day and its busiest corridor, so the first view is
  // dense but scannable (one corridor, a handful of section rows) rather than
  // every section in the plan. "All corridors" stays one click away.
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

  // Only show sections that carry a scheduled possession on the selected date,
  // optionally narrowed to one corridor. This keeps the timeline dense instead
  // of rendering dozens of empty section rows.
  const activeSectionIds = React.useMemo(() => {
    const ids = new Set();
    scheduledTasks.forEach((t) => {
      if (t.date === selectedDate && (selectedCorridor === 'ALL' || t.corridor_id === selectedCorridor)) {
        ids.add(t.section_id);
      }
    });
    return ids;
  }, [scheduledTasks, selectedDate, selectedCorridor]);

  const sections = corridorsSectionsData.sections
    .filter((s) => activeSectionIds.has(s.section_id))
    .sort((a, b) => a.section_id.localeCompare(b.section_id));

  // Human-readable corridor for the timeline header.
  const corridorLabel = React.useMemo(() => {
    if (selectedCorridor === 'ALL') return 'All corridors';
    const c = corridorsSectionsData.corridors.find((x) => x.corridor_id === selectedCorridor);
    return c ? `${c.corridor_id} ${c.corridor_name}` : selectedCorridor;
  }, [selectedCorridor]);

  // Show traffic for the section the operator is looking at: the selected
  // possession's section, else the first section in the corridor.
  const trafficSectionId = drawerTask?.section_id || sections[0]?.section_id || 'SEC-0004';

  const handleSelectTask = (task) => {
    setDrawerTask(task);
  };

  const handleOpenDecisionTrace = (task) => {
    setDecisionTraceTask(task);
    setDecisionTraceOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="t-section-title">Block Planning</h2>
          <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
            Maintenance scheduling constrained by asset risk, block availability, train operations
            and crew shifts. Solved by OR-Tools CP-SAT.
          </p>
        </div>
        {/* The solver is Python and is not run from the browser, so this states
            where the rendered plan came from rather than implying it solved here. */}
        <div className="text-right shrink-0">
          <ScopeCaption>Plan generated offline by CP-SAT</ScopeCaption>
          <p className="font-mono text-[10px] text-rail-400 mt-0.5">$ python demo.py</p>
        </div>
      </div>

      {/* Filter bar & view toggles */}
      <FilterBar className="justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-stretch border border-line">
            {[['timeline', 'Timeline'], ['weekly', 'Weekly'], ['monthly', 'Monthly']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                className={`px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                  viewMode === id ? 'bg-rail-900 text-white' : 'text-rail-500 hover:bg-surface-sunken'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <Select label="Date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
            {dateOptions.map((o) => (
              <option key={o.date} value={o.date}>
                {o.date} · {o.count} {o.count === 1 ? 'task' : 'tasks'}
              </option>
            ))}
          </Select>

          <Select label="Corridor" value={selectedCorridor} onChange={(e) => setSelectedCorridor(e.target.value)}>
            <option value="ALL">All corridors · {scheduledTasks.length}</option>
            {corridorOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.id} — {o.name} · {o.count}
              </option>
            ))}
          </Select>
        </div>

        {dateOptions.length > 0 && (
          <ScopeCaption>
            Plan span {dateOptions[0].date} – {dateOptions[dateOptions.length - 1].date}
          </ScopeCaption>
        )}
      </FilterBar>

      {/* Scenario summary — scoped to the subset rendered below */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="t-label">Demo scenario — solved subset</h3>
        <ScopeCaption>
          Full-dataset baseline is on the Overview screen · reproduce with python demo.py
        </ScopeCaption>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          ['Critical tasks', metrics.risk_breakdown.critical_risk_scheduled, 'Risk score \u2265 80', 'red'],
          ['High-risk tasks', metrics.risk_breakdown.high_risk_scheduled, 'Risk score 60\u201379', 'amber'],
          ['Tasks considered', metrics.summary.total_tasks_considered, 'Scenario subset', 'slate'],
          ['Planned blocks', metrics.operational_metrics.unique_blocks_utilized, 'Block windows used', 'blue'],
          ['Deferred', metrics.summary.total_deferred.toLocaleString(), 'Not placed in scenario', 'slate'],
          ['Crews utilized', `${metrics.operational_metrics.teams_utilized}/${teamsData.length}`, 'Of the full roster', 'purple'],
          ['Train conflicts', activeEvent ? 1 : 0, activeEvent ? 'Simulated event active' : 'None recorded', activeEvent ? 'amber' : 'green'],
        ].map(([title, value, subtext, color]) => (
          <MetricCard key={title} title={title} value={value} subtext={subtext} color={color} />
        ))}
      </div>

      {/* Main Centerpiece Area: Gantt Timeline / Weekly / Monthly */}
      <RecommendationActions taskId="TASK-000005" />

      {viewMode === 'timeline' && (
        <BlockTrainGantt
          sections={sections}
          scheduledTasks={scheduledTasks}
          selectedDate={selectedDate}
          corridorLabel={corridorLabel}
          onSelectTask={handleSelectTask}
          scope="Demo scenario"
        />
      )}

      {viewMode === 'weekly' && (
        <WeeklyView
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setViewMode('timeline');
          }}
        />
      )}

      {viewMode === 'monthly' && (
        <MonthlyHeatmap
          onSelectDate={(date) => {
            setSelectedDate(date);
            setViewMode('timeline');
          }}
        />
      )}

      {/* Traffic Context Box (Section 13) */}
      <TrafficContext sectionId={trafficSectionId} />

      {/* Smart Bundling Visualization Component (Section 12) */}
      <BundlingView />

      {/* Drawers & Decision Trace Modals */}
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
