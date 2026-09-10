import React, { useState } from 'react';
import { GanttTimeline } from '../../components/timeline/GanttTimeline';
import { BlockDrawer } from '../../components/timeline/BlockDrawer';
import { WhyArnavModal } from '../../components/timeline/WhyArnavModal';
import { BundlingView } from '../../components/timeline/BundlingView';
import { TrafficContext } from '../../components/timeline/TrafficContext';
import { WeeklyView } from '../../components/planning/WeeklyView';
import { MonthlyHeatmap } from '../../components/planning/MonthlyHeatmap';
import { MetricCard } from '../../components/common/MetricCard';
import { RecommendationActions } from '../../components/occ/RecommendationActions';
import { usePlan } from '../../context/PlanContext';
import corridorsSectionsData from '../../data/corridors_sections.json';
import {
  Calendar,
  Sparkles,
  Filter,
  Layers,
  AlertTriangle,
  Clock,
  Users,
  CheckCircle2,
  CalendarDays,
  Grid,
} from 'lucide-react';

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
  const { scheduledTasks, metrics, isReplanned, activeEvent } = usePlan();

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
  const [whyArnavOpen, setWhyArnavOpen] = useState(false);
  const [whyArnavTask, setWhyArnavTask] = useState(null);

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

  // Show traffic for the section the operator is looking at: the selected
  // possession's section, else the first section in the corridor.
  const trafficSectionId = drawerTask?.section_id || sections[0]?.section_id || 'SEC-0004';

  const handleSelectTask = (task) => {
    setDrawerTask(task);
  };

  const handleOpenWhyArnav = (task) => {
    setWhyArnavTask(task);
    setWhyArnavOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Title Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-600 uppercase tracking-wider">
            <Sparkles size={14} className="text-blue-500" />
            <span>Google OR-Tools CP-SAT Scheduling Engine</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
            Automatic Block Planning
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            AI-assisted maintenance scheduling based on asset risk, railway blocks, train operations and team availability.
          </p>
        </div>

        {/* Plan provenance. The solver is Python and is not run from the browser,
            so this states where the rendered plan came from instead of offering a
            button that only claims to have solved it. */}
        <div className="text-right shrink-0">
          <div className="flex items-center gap-1.5 justify-end text-xs font-semibold text-slate-700">
            <Sparkles size={14} className="text-blue-600" />
            <span>Plan generated offline by CP-SAT</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            <code className="font-mono">python demo.py</code> &middot; controller actions below
          </p>
        </div>
      </div>

      {/* Top Filter Bar & View Toggles */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                viewMode === 'timeline'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gantt Timeline
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                viewMode === 'weekly'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Weekly Planning
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                viewMode === 'monthly'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Heatmap
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* Date Selector — options and counts come from the plan */}
          <div className="flex items-center gap-1.5 text-xs text-slate-700">
            <Calendar size={14} className="text-slate-400" />
            <span className="font-semibold">Planning Date:</span>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono font-bold text-slate-800"
            >
              {dateOptions.map((o) => (
                <option key={o.date} value={o.date}>
                  {o.date} ({o.count} {o.count === 1 ? 'task' : 'tasks'})
                </option>
              ))}
            </select>
          </div>

          {/* Corridor Selector — options and counts come from the plan */}
          <div className="flex items-center gap-1.5 text-xs text-slate-700">
            <span className="font-semibold">Corridor:</span>
            <select
              value={selectedCorridor}
              onChange={(e) => setSelectedCorridor(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 font-medium text-slate-800"
            >
              <option value="ALL">All corridors ({scheduledTasks.length})</option>
              {corridorOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id} — {o.name} ({o.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Callout — the span the demo plan actually covers */}
        <div className="text-xs text-slate-500 font-mono">
          {dateOptions.length > 0 && (
            <>Plan span: <strong>{dateOptions[0].date} – {dateOptions[dateOptions.length - 1].date}</strong></>
          )}
        </div>
      </div>

      {/* Planning Summary Cards — scoped to the scenario rendered below */}
      <div className="flex items-center justify-between flex-wrap gap-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Demo Scenario — Solved Subset
        </h3>
        <p className="text-[11px] text-slate-500">
          Reproduce with <code className="font-mono text-slate-600">python demo.py</code> · full-dataset
          baseline shown on the Overview screen
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold text-red-600 tracking-wider block">Critical Tasks</span>
          <span className="text-xl font-bold font-mono text-red-600 mt-1 block">
            {metrics.risk_breakdown.critical_risk_scheduled}
          </span>
          <span className="text-[10px] text-slate-400">Neev score &ge; 80</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold text-orange-600 tracking-wider block">High Risk Tasks</span>
          <span className="text-xl font-bold font-mono text-orange-600 mt-1 block">
            {metrics.risk_breakdown.high_risk_scheduled}
          </span>
          <span className="text-[10px] text-slate-400">Neev score 60-79</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider block">Tasks Considered</span>
          <span className="text-xl font-bold font-mono text-slate-800 mt-1 block">
            {metrics.summary.total_tasks_considered}
          </span>
          <span className="text-[10px] text-slate-400">Scenario subset</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider block">Planned Blocks</span>
          <span className="text-xl font-bold font-mono text-blue-600 mt-1 block">
            {metrics.operational_metrics.unique_blocks_utilized}
          </span>
          <span className="text-[10px] text-slate-400">Conflict-free</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Deferred Tasks</span>
          <span className="text-xl font-bold font-mono text-slate-700 mt-1 block">
            {metrics.summary.total_deferred.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400">Not placed in scenario</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold text-purple-600 tracking-wider block">Teams Utilized</span>
          <span className="text-xl font-bold font-mono text-purple-600 mt-1 block">
            {metrics.operational_metrics.teams_utilized}/39
          </span>
          <span className="text-[10px] text-slate-400">Specialist crews</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider block">Train Conflicts</span>
          <span className="text-xl font-bold font-mono text-emerald-600 mt-1 block">
            {activeEvent ? 1 : 0}
          </span>
          <span className="text-[10px] text-slate-400">
            {activeEvent ? 'Simulated alert' : '100% Resolved'}
          </span>
        </div>
      </div>

      {/* Main Centerpiece Area: Gantt Timeline / Weekly / Monthly */}
      <RecommendationActions taskId="TASK-000005" />

      {viewMode === 'timeline' && (
        <GanttTimeline
          sections={sections}
          scheduledTasks={scheduledTasks}
          selectedDate={selectedDate}
          onSelectTask={handleSelectTask}
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
        onOpenWhyArnav={handleOpenWhyArnav}
      />

      <WhyArnavModal
        task={whyArnavTask}
        isOpen={whyArnavOpen}
        onClose={() => setWhyArnavOpen(false)}
      />
    </div>
  );
};
