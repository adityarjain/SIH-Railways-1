import React from 'react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * Worksheet-idiom fork of `WeeklyView` (design 2A) — used only by the
 * Maintenance Blocks register. `WeeklyView` itself still serves
 * BlockPlanning, which is out of scope for this pass, so it is left as-is
 * rather than restyled in place.
 */
export const WeeklyViewWorksheet = ({ selectedDate, onSelectDate }) => {
  const { scheduledTasks } = usePlan();
  const { t } = useI18n();

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
    <div className="space-y-2">
      <div className="font-mono text-[10px] text-ws-light">{t('maintenanceBlocks.weeklyCaption')}</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {days.map((d) => (
          <button
            key={d.date}
            onClick={() => onSelectDate(d.date)}
            className={`p-2.5 border text-left transition-colors ${
              d.active ? 'bg-ws-selected border-ws-ink' : 'bg-ws-surface border-ws-rule hover:border-ws-mid hover:bg-ws-paper'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-ws-ink">{d.day}</span>
              <span className="font-mono text-[10px] text-ws-light">{d.date.slice(8)}</span>
            </div>
            <div className="mt-2 space-y-0.5">
              <div className="flex justify-between text-[11px]">
                <span className="font-ws text-ws-mid">{t('common.tasks')}</span>
                <span className="font-mono font-bold text-ws-ink">{d.tasks}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="font-ws text-ws-mid">{t('common.blocks')}</span>
                <span className="font-mono font-bold text-ws-ink">{d.blocks}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="font-ws text-ws-mid">{t('common.risk')}</span>
                <span className={`font-mono font-bold ${d.critical > 0 ? 'text-ws-critical' : 'text-ws-ink'}`}>{d.critical}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
