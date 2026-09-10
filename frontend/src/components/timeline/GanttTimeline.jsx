import React from 'react';
import { Badge } from '../common/Badge';

export const GanttTimeline = ({
  sections = [],
  scheduledTasks = [],
  selectedDate = '2026-09-07',
  onSelectTask,
}) => {
  // Hours for 24-hour timeline ruler
  const hours = [
    '00:00', '02:00', '04:00', '06:00', '08:00', '10:00',
    '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '24:00',
  ];

  // Group scheduled tasks by section for the selected date
  const tasksBySection = React.useMemo(() => {
    const map = {};
    sections.forEach((sec) => {
      map[sec.section_id] = [];
    });

    scheduledTasks.forEach((task) => {
      if (task.date === selectedDate && map[task.section_id]) {
        map[task.section_id].push(task);
      }
    });
    return map;
  }, [sections, scheduledTasks, selectedDate]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Timeline Header Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
            BLOCK PLANNING TIMELINE — {selectedDate}
          </span>
          <span className="text-xs text-slate-500">
            ({sections.reduce((n, sec) => n + (tasksBySection[sec.section_id] || []).length, 0)} possessions
            {' '}across {sections.length} sections)
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] font-medium text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-blue-600"></span>
            <span>Planned Possession</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-purple-600"></span>
            <span>Bundled (Shared)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-red-600"></span>
            <span>Critical Risk (Neev &ge; 80)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-orange-600"></span>
            <span>Replanned Work</span>
          </div>
        </div>
      </div>

      {/* Main Gantt Grid */}
      <div className="overflow-x-auto custom-scrollbar">
        <div className="min-w-[960px]">
          {/* Hour Ruler */}
          <div className="flex border-b border-slate-200 bg-slate-100/70 text-[11px] font-mono text-slate-500 select-none">
            <div className="w-36 shrink-0 px-3 py-2 font-sans font-bold text-slate-700 border-r border-slate-200">
              Railway Section
            </div>
            <div className="flex-1 grid grid-cols-12 divide-x divide-slate-200">
              {hours.slice(0, 12).map((h) => (
                <div key={h} className="px-2 py-1.5 text-center">
                  {h}
                </div>
              ))}
            </div>
          </div>

          {/* Section Rows */}
          <div className="divide-y divide-slate-100">
            {sections.length === 0 && (
              <div className="px-4 py-10 text-center text-xs text-slate-400">
                No scheduled possessions for this date and corridor. Pick another option above.
              </div>
            )}
            {sections.map((sec) => {
              const tasks = tasksBySection[sec.section_id] || [];
              return (
                <div
                  key={sec.section_id}
                  className="flex items-center group hover:bg-slate-50/70 transition-colors h-14"
                >
                  {/* Section Label */}
                  <div className="w-36 shrink-0 px-3 py-2 border-r border-slate-200 font-mono text-xs">
                    <div className="font-bold text-slate-800">{sec.section_id}</div>
                    <div className="text-[10px] text-slate-400 truncate font-sans">{sec.section_name}</div>
                  </div>

                  {/* 24-Hour Time Track */}
                  <div className="flex-1 h-full relative grid grid-cols-12 divide-x divide-slate-100/80">
                    {/* Grid hour column slots for background guidelines */}
                    {Array.from({ length: 12 }).map((_, idx) => (
                      <div key={idx} className="h-full pointer-events-none" />
                    ))}

                    {/* Possession Block Bars */}
                    {tasks.map((task) => {
                      const leftPercent = (task.start_minute / 1440) * 100;
                      const widthPercent = Math.max((task.duration_minutes / 1440) * 100, 2.5);

                      // Semantic coloring rule
                      let barColor = 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700';
                      let badgeType = 'Normal';

                      if (task.is_bundled) {
                        barColor = 'bg-purple-600 hover:bg-purple-700 text-white border-purple-700';
                        badgeType = 'Bundled';
                      } else if (task.risk_score >= 80) {
                        barColor = 'bg-red-600 hover:bg-red-700 text-white border-red-700';
                        badgeType = 'Critical';
                      } else if (task.task_id === 'TASK-000005' && task.date === '2026-09-08') {
                        barColor = 'bg-orange-600 hover:bg-orange-700 text-white border-orange-700';
                        badgeType = 'Replanned';
                      }

                      return (
                        <div
                          key={task.task_id}
                          onClick={() => onSelectTask(task)}
                          style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                          }}
                          className={`absolute top-2 bottom-2 rounded-md shadow-xs border px-2 py-1 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md flex flex-col justify-center overflow-hidden z-10 ${barColor}`}
                          title={`${task.task_id} | ${task.department} | ${task.duration_minutes} min`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold leading-tight truncate">
                            <span className="font-mono">{task.task_id}</span>
                            {badgeType !== 'Normal' && (
                              <span className="text-[9px] bg-black/25 px-1 rounded uppercase tracking-wider">
                                {badgeType}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] opacity-90 truncate">
                            {task.duration_minutes}m • {task.department.split('/')[0]}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
