import React from 'react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const WORKLOAD_TONE = {
  NONE: 'bg-ws-surface border-ws-rule text-ws-light',
  LOW: 'bg-ws-surface border-ws-rule text-ws-mid',
  MEDIUM: 'bg-ws-barPlannedBg border-ws-barPlannedBorder text-ws-barPlannedLabel',
  HIGH: 'bg-ws-barCriticalBg border-ws-barCriticalBorder text-ws-barCriticalLabel',
};

/**
 * Worksheet-idiom fork of `MonthlyHeatmap` (design 2A) — used only by the
 * Maintenance Blocks register. `MonthlyHeatmap` itself still serves
 * BlockPlanning, which is out of scope for this pass, so it is left as-is
 * rather than restyled in place.
 */
export const MonthlyHeatmapWorksheet = ({ onSelectDate }) => {
  const { scheduledTasks } = usePlan();
  const { t } = useI18n();

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
    return { day: dayNum, date: dateStr, tasks, critical, blocks, workload };
  });

  const workloadLabel = { NONE: 'workloadNone', LOW: 'workloadLow', MEDIUM: 'workloadMedium', HIGH: 'workloadHigh' };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3.5 font-mono text-[10px] text-ws-light">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 bg-ws-surface border border-ws-rule" /> {t('maintenanceBlocks.workloadLow')}</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 bg-ws-barPlannedBg border border-ws-barPlannedBorder" /> {t('maintenanceBlocks.workloadMedium')}</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 bg-ws-barCriticalBg border border-ws-barCriticalBorder" /> {t('maintenanceBlocks.workloadHigh')}</span>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className="font-display text-[10px] font-bold uppercase text-ws-light py-1">{d}</div>
        ))}
        {days.map((d) => (
          <button
            key={d.date}
            onClick={() => onSelectDate(d.date)}
            className={`p-1.5 border text-left transition-colors ${WORKLOAD_TONE[d.workload]}`}
          >
            <div className="flex justify-between items-center text-xs">
              <span className="font-mono font-bold">{d.day}</span>
              <span className="text-[8px] font-display font-bold opacity-70">{t(`maintenanceBlocks.${workloadLabel[d.workload]}`)}</span>
            </div>
            <div className="mt-1 space-y-0.5 text-[10px]">
              <div className="flex justify-between"><span>{t('common.tasks')}</span><span className="font-mono font-bold">{d.tasks}</span></div>
              {d.critical > 0 && (
                <div className="flex justify-between text-ws-critical font-medium"><span>{t('common.risk')}</span><span className="font-mono font-bold">{d.critical}</span></div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
