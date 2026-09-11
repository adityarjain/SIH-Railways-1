import React from 'react';
import { Calendar } from 'lucide-react';
import { usePlan } from '../../context/PlanContext';

export const WeeklyView = ({ selectedDate, onSelectDate }) => {
  // Aggregated from the plan the optimizer produced. These counts were fixed
  // literals (with conflicts: 0 asserted on every day) and moved with nothing.
  const { scheduledTasks } = usePlan();

  const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const byDate = scheduledTasks.reduce((acc, task) => {
    (acc[task.date] = acc[task.date] || []).push(task);
    return acc;
  }, {});

  const days = Object.keys(byDate)
    .sort()
    .map((date) => {
      const tasks = byDate[date];
      const blocks = new Set(tasks.flatMap((x) => x.block_ids || []));
      return {
        day: DAY_LABELS[new Date(`${date}T00:00:00`).getDay()],
        date,
        tasks: tasks.length,
        blocks: blocks.size,
        critical: tasks.filter((x) => (x.risk_score ?? 0) >= 80).length,
        active: selectedDate === date,
      };
    });

  return (
    <div className="bg-surface-panel rounded-lg border border-line p-4  space-y-3">
      <div className="flex items-center justify-between border-b border-line-subtle pb-2">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-status-info" />
          <h4 className="text-xs font-bold text-rail-800 uppercase tracking-wider">
            7-Day Rolling Horizon Planning View
          </h4>
        </div>
        <span className="text-[11px] text-rail-500">Click a day to filter Gantt timeline</span>
      </div>

      <div className="grid grid-cols-7 gap-2.5">
        {days.map((d) => (
          <div
            key={d.date}
            onClick={() => onSelectDate(d.date)}
            className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
              d.active
                ? 'bg-status-info-tint border-status-info'
                : 'bg-surface-sunken border-line hover:border-status-info hover:bg-surface-sunken'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rail-800 font-mono">{d.day}</span>
              <span className="text-[10px] text-rail-500">{d.date.slice(8)} Sep</span>
            </div>

            <div className="mt-2.5 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-rail-500">Tasks:</span>
                <span className="font-bold text-rail-900 font-mono">{d.tasks}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-rail-500">Blocks:</span>
                <span className="font-bold text-rail-900 font-mono">{d.blocks}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-rail-500">Critical:</span>
                <span className="font-bold text-status-critical font-mono">{d.critical}</span>
              </div>
              <div className="flex justify-between text-xs pt-0.5">
                <span className="text-rail-500">Blocks:</span>
                <span className="font-bold text-status-info font-mono">{d.blocks}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
