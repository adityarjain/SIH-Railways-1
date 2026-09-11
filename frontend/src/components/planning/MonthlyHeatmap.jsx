import React from 'react';
import { Calendar } from 'lucide-react';
import { usePlan } from '../../context/PlanContext';

export const MonthlyHeatmap = ({ onSelectDate }) => {
  // Real per-day workload from the plan. This block previously generated its
  // values from Math.sin(i), which produced a plausible-looking chart that
  // described nothing.
  const { scheduledTasks } = usePlan();

  const byDate = scheduledTasks.reduce((acc, task) => {
    (acc[task.date] = acc[task.date] || []).push(task);
    return acc;
  }, {});

  const days = Array.from({ length: 30 }, (_, i) => {
    const dayNum = i + 1;
    const dateStr = `2026-09-${String(dayNum).padStart(2, '0')}`;
    const dayTasks = byDate[dateStr] || [];
    const tasks = dayTasks.length;
    const critical = dayTasks.filter((x) => (x.risk_score ?? 0) >= 80).length;
    const blocks = new Set(dayTasks.flatMap((x) => x.block_ids || [])).size;
    const workload = tasks === 0 ? 'NONE' : tasks > 16 ? 'HIGH' : tasks > 8 ? 'MEDIUM' : 'LOW';

    return {
      day: dayNum,
      date: dateStr,
      tasks,
      critical,
      blocks,
      workload,
    };
  });

  const getWorkloadBg = (workload) => {
    switch (workload) {
      case 'HIGH':
        return 'bg-status-info-tint border-status-info text-status-info';
      case 'MEDIUM':
        return 'bg-status-info-tint border-status-info text-status-info';
      default:
        return 'bg-surface-sunken border-line text-rail-700';
    }
  };

  return (
    <div className="bg-surface-panel rounded-lg border border-line p-4  space-y-3">
      <div className="flex items-center justify-between border-b border-line-subtle pb-2">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-status-info" />
          <h4 className="text-xs font-bold text-rail-800 uppercase tracking-wider">
            Monthly Workload Heatmap — September 2026
          </h4>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-rail-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-surface-sunken border border-line-strong"></span> Low Workload
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-status-info-tint border border-status-info"></span> Medium Workload
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-status-info-tint border border-status-info"></span> High Workload
          </span>
        </div>
      </div>

      {/* 7-column calendar grid */}
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="text-[10px] font-bold text-rail-400 uppercase py-1">
            {d}
          </div>
        ))}

        {days.map((d) => (
          <div
            key={d.date}
            onClick={() => onSelectDate(d.date)}
            className={`p-2 rounded-lg border text-left cursor-pointer transition-all hover:scale-105 hover: ${getWorkloadBg(
              d.workload
            )}`}
          >
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold font-mono">{d.day}</span>
              <span className="text-[9px] uppercase font-bold tracking-wider opacity-70">
                {d.workload}
              </span>
            </div>
            <div className="mt-1 space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>Tasks:</span>
                <span className="font-bold font-mono">{d.tasks}</span>
              </div>
              <div className="flex justify-between text-status-critical font-medium">
                <span>Crit:</span>
                <span className="font-bold font-mono">{d.critical}</span>
              </div>
              <div className="flex justify-between opacity-80">
                <span>Blocks:</span>
                <span className="font-bold font-mono">{d.blocks}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
