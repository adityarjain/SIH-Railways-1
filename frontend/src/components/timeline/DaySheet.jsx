import React, { useMemo, useState } from 'react';
import { useI18n } from '../../i18n';
import { makeScale, ticksFor, packLanes, possessionDomain } from '../../utils/timeScale';
import { minToHhmm } from '../../utils/time';
import { bandOf } from '../../utils/risk';
import sectionTrains from '../../data/live/sectionTrains';

/**
 * Day sheet — the "industrial worksheet" (design 2A) hero timeline for the
 * Authority Overview screen only.
 *
 * This is a deliberate visual fork of `BlockTrainGantt`, not a restyle of it:
 * `BlockTrainGantt` is still the timeline BlockPlanning renders, and that
 * screen is out of scope for this pass. The two share their underlying maths
 * (`utils/timeScale`, `utils/risk`) and data (`section_trains.json`) — only
 * the shell, palette and geometry differ.
 */

const LANE_H = 24;
const TRAIN_H = 6;
const NIGHT_BAND = { start: 0, end: 360 }; // 00:00–06:00

const DOMAINS = {
  day: { start: 0, end: 1440 },
  night: { start: 0, end: 360 },
};

const barTone = (task, replannedTaskId) => {
  if (replannedTaskId && task.task_id === replannedTaskId) {
    return { bg: 'bg-status-warn/10', border: 'border-status-warn', rule: 'border-l-status-warn', label: 'text-status-warn' };
  }
  if (task.is_bundled) {
    return { bg: 'bg-ws-barBundledBg', border: 'border-ws-barBundledBorder', rule: 'border-l-ws-bundle', label: 'text-ws-barBundledLabel' };
  }
  if (bandOf(task) === 'CRITICAL') {
    return { bg: 'bg-ws-barCriticalBg', border: 'border-ws-barCriticalBorder', rule: 'border-l-ws-critical', label: 'text-ws-barCriticalLabel' };
  }
  return { bg: 'bg-ws-barPlannedBg', border: 'border-ws-barPlannedBorder', rule: 'border-l-ws-info', label: 'text-ws-barPlannedLabel' };
};

const LegendSwatch = ({ bg, border, rule, h = 10 }) => (
  <span
    className={`inline-block w-4 shrink-0 border ${bg} ${border || ''}`}
    style={{ height: h, borderLeftWidth: rule ? 3 : 1, borderLeftColor: rule }}
  />
);

export const DaySheet = ({
  corridorOptions = [],
  corridorId,
  onCorridorChange,
  sections = [],
  scheduledTasks = [],
  date,
  replannedTaskId,
  onSelectTask,
}) => {
  const { t, isHindi } = useI18n();
  const [domainId, setDomainId] = useState('day');

  const tasksBySection = useMemo(() => {
    const map = new Map(sections.map((s) => [s.section_id, []]));
    for (const task of scheduledTasks) {
      if (date && task.date !== date) continue;
      if (!map.has(task.section_id)) continue;
      map.get(task.section_id).push(task);
    }
    return map;
  }, [sections, scheduledTasks, date]);

  const visibleTasks = useMemo(() => [...tasksBySection.values()].flat(), [tasksBySection]);
  const hasPossessionDomain = possessionDomain(visibleTasks) != null;

  const domain = useMemo(() => {
    if (domainId === 'night') return DOMAINS.night;
    if (domainId === 'possession') return possessionDomain(visibleTasks) || DOMAINS.day;
    return DOMAINS.day;
  }, [domainId, visibleTasks]);

  const scale = useMemo(() => makeScale(domain.start, domain.end), [domain]);
  const hourTicks = useMemo(() => ticksFor(scale, 60), [scale]);
  const labelStep = domain.end - domain.start <= 480 ? 60 : 180;
  const labelTicks = useMemo(() => ticksFor(scale, labelStep), [scale, labelStep]);

  const nightVisible = scale.intersects(NIGHT_BAND.start, NIGHT_BAND.end);
  const [nightA, nightB] = nightVisible ? scale.clamp(NIGHT_BAND.start, NIGHT_BAND.end) : [0, 0];

  const totalBlocks = useMemo(
    () => new Set(visibleTasks.flatMap((t) => t.block_ids || [])).size,
    [visibleTasks],
  );
  const totalTrains = useMemo(
    () => sections.reduce((n, s) => n + (sectionTrains.sections?.[s.section_id]?.[date]?.length || 0), 0),
    [sections, date],
  );

  const corridorLabel = corridorOptions.find((c) => c.id === corridorId)?.label || corridorId;
  const domainHours = Math.round((domain.end - domain.start) / 60);

  const uppercase = isHindi ? '' : 'uppercase';
  const tracking = isHindi ? '' : 'tracking-[0.1em]';

  return (
    <div className="bg-ws-surface border-b border-ws-rule pt-4 px-5 pb-3.5 font-ws text-ws-body">
      {/* section header */}
      <div className="flex items-center gap-2.5 pb-2 flex-wrap">
        <span className="font-mono text-[11px] font-bold text-ws-light">01</span>
        <span className={`font-display text-base font-semibold ${uppercase} ${tracking} text-ws-ink`}>
          {t('overview.daySheet')}
        </span>
        <span className="flex-1 min-w-6 h-px bg-ws-rule" />
        <span className="font-mono text-[10px] text-ws-light">
          {t('overview.daySheetMeta', { corridor: corridorLabel, date, hours: domainHours })}
        </span>
      </div>

      {/* controls row */}
      <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
        <select
          value={corridorId || ''}
          onChange={(e) => onCorridorChange && onCorridorChange(e.target.value)}
          className="font-ws text-[13px] text-ws-ink bg-ws-surface border border-ws-rule px-2 py-1"
        >
          {corridorOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.label} · {c.count}</option>
          ))}
        </select>
        <div className="flex border border-ws-rule">
          <button
            onClick={() => setDomainId('day')}
            className={`px-2.5 py-1 font-display text-[13px] font-bold ${uppercase} ${tracking} ${
              domainId === 'day' ? 'bg-ws-ink text-white' : 'bg-ws-surface text-ws-mid hover:bg-ws-paper hover:text-ws-ink'
            }`}
          >
            {t('overview.fullDay')}
          </button>
          <button
            onClick={() => setDomainId('night')}
            className={`px-2.5 py-1 border-l border-ws-rule font-display text-[13px] font-bold ${uppercase} ${tracking} ${
              domainId === 'night' ? 'bg-ws-ink text-white' : 'bg-ws-surface text-ws-mid hover:bg-ws-paper hover:text-ws-ink'
            }`}
          >
            {t('overview.night0006')}
          </button>
          <button
            onClick={() => hasPossessionDomain && setDomainId('possession')}
            disabled={!hasPossessionDomain}
            title={!hasPossessionDomain ? t('overview.possessionWindow') : undefined}
            className={`px-2.5 py-1 border-l border-ws-rule font-display text-[13px] font-bold ${uppercase} ${tracking} ${
              !hasPossessionDomain
                ? 'text-ws-disabled cursor-not-allowed bg-ws-surface'
                : domainId === 'possession'
                ? 'bg-ws-ink text-white'
                : 'bg-ws-surface text-ws-mid hover:bg-ws-paper hover:text-ws-ink'
            }`}
          >
            {t('overview.possessionWindow')}
          </button>
        </div>
        <span className="flex-1 min-w-2" />
        <span className="font-mono text-[10px] text-ws-light">
          {t('overview.daySheetScope', { sections: sections.length, blocks: totalBlocks, trains: totalTrains }).toUpperCase()}
        </span>
      </div>

      {/* ruler + rows scroll together; the label column narrows before this
          floor is reached, so the scrollbar only appears on the narrowest
          screens (the responsive spec's 900px inner floor at 768px). */}
      <div className="overflow-x-auto custom-scrollbar">
      <div className="min-w-[900px]">
      {/* ruler */}
      <div className="flex">
        <div className="w-[120px] md:w-[140px] lg:w-[164px] xl:w-[172px] shrink-0" />
        <div className="relative flex-1 min-w-0 h-[15px] border-b border-ws-rule">
          {nightVisible && (
            <span
              className="absolute left-0 top-0 bottom-0 bg-ws-paper"
              style={{ left: `${scale.toPercent(nightA)}%`, width: `${scale.toWidth(nightA, nightB, 0)}%` }}
            />
          )}
          {labelTicks.map((tk) => (
            <span
              key={tk.minute}
              className="absolute font-mono text-[10px] text-ws-light"
              style={
                tk.minute === scale.domainStart
                  ? { left: 0 }
                  : tk.minute === scale.domainEnd
                  ? { right: 0 }
                  : { left: `${tk.percent}%`, transform: 'translateX(-50%)' }
              }
            >
              {tk.label.slice(0, 2)}
            </span>
          ))}
        </div>
      </div>

      {/* rows */}
      {sections.length === 0 && (
        <div className="py-8 text-center">
          <div className="font-ws text-xs font-semibold text-ws-mid">{t('gantt.noSections')}</div>
          <div className="font-ws text-[11px] text-ws-light mt-1 max-w-md mx-auto leading-relaxed">{t('gantt.noSectionsBody')}</div>
        </div>
      )}
      {sections.map((section) => {
        const tasks = (tasksBySection.get(section.section_id) || []).filter((t) =>
          scale.intersects(t.start_minute, t.end_minute),
        );
        const packed = packLanes(tasks, (t) => t.start_minute, (t) => t.end_minute);
        const laneCount = Math.max(1, ...packed.map((p) => p.lane + 1));
        // Spec values are exact for 1 and 2 rows; a 3rd concurrent lane is not
        // shown in the reference, so it grows the track rather than clipping.
        const trackH = laneCount <= 1 ? 44 : laneCount === 2 ? 76 : 76 + (laneCount - 2) * 28;

        const projected = (sectionTrains.sections?.[section.section_id]?.[date] || [])
          .filter((tr) => scale.intersects(tr.arrival_minute, tr.departure_minute));

        const criticalCount = tasks.filter((t) => bandOf(t) === 'CRITICAL').length;

        return (
          <div key={section.section_id} className="flex items-stretch border-b border-ws-hairline last:border-b-0 hover:bg-ws-dossier">
            <div className="w-[120px] md:w-[140px] lg:w-[164px] xl:w-[172px] shrink-0 py-2.5 pr-3.5">
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-[14px] font-bold text-ws-ink">{section.section_id}</span>
                <span className={`font-mono text-[11px] ${criticalCount > 0 ? 'font-bold text-ws-critical' : 'font-medium text-ws-light'}`}>
                  {tasks.length}
                </span>
              </div>
              <div className="font-ws text-xs text-ws-mid truncate">{section.section_name}</div>
              <div className="font-mono text-[9.5px] text-ws-light mt-0.5">
                {section.section_length_km} KM · {(section.track_type || '').split(' ')[0].toUpperCase()} · {section.maximum_speed_kmph}
              </div>
            </div>

            <div className="flex-1 min-w-0 py-2">
              <div className="relative bg-ws-surface border border-ws-hairline" style={{ height: trackH }}>
                {nightVisible && (
                  <span
                    className="absolute top-0 bottom-0 bg-ws-paper"
                    style={{ left: `${scale.toPercent(nightA)}%`, width: `${scale.toWidth(nightA, nightB, 0)}%` }}
                  />
                )}
                {hourTicks.map((tk) => (
                  <span
                    key={tk.minute}
                    className={`absolute top-0 bottom-0 w-px ${Math.round(tk.minute / 60) % 3 === 0 ? 'bg-ws-hairline' : 'bg-ws-tick'}`}
                    style={{ left: `${tk.percent}%` }}
                  />
                ))}

                {packed.map(({ item: task, lane }) => {
                  const [a, b] = scale.clamp(task.start_minute, task.end_minute);
                  const tone = barTone(task, replannedTaskId);
                  return (
                    <button
                      key={task.task_id}
                      onClick={() => onSelectTask && onSelectTask(task)}
                      title={`${task.task_id} · ${task.maintenance_type || ''} · ${minToHhmm(task.start_minute)}–${minToHhmm(task.end_minute)}${task.risk_score != null ? ` · risk ${task.risk_score}` : ''}`}
                      className={`absolute flex items-center px-1.5 overflow-hidden border ${tone.bg} ${tone.border} ${tone.rule} hover:bg-ws-surface transition-colors`}
                      style={{
                        left: `${scale.toPercent(a)}%`,
                        width: `${scale.toWidth(a, b)}%`,
                        top: lane === 0 ? 6 : 34 + (lane - 1) * 28,
                        height: LANE_H,
                        borderLeftWidth: 3,
                      }}
                    >
                      <span className={`font-mono text-[10px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis ${tone.label}`}>
                        {task.task_id}
                      </span>
                    </button>
                  );
                })}

                {projected.map((tr) => {
                  const [a, b] = scale.clamp(tr.arrival_minute, tr.departure_minute);
                  return (
                    <span
                      key={`${tr.train_id}-${tr.arrival_minute}`}
                      title={`${tr.train_id} ${tr.train_type || ''} · ${minToHhmm(tr.arrival_minute)}–${minToHhmm(tr.departure_minute)}`}
                      className="absolute bg-ws-mid"
                      style={{ left: `${scale.toPercent(a)}%`, width: `${scale.toWidth(a, b, 0.15)}%`, minWidth: 2, bottom: 4, height: TRAIN_H }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
      </div>
      </div>

      {/* legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2.5">
        <span className="inline-flex items-center gap-1.5 font-ws text-xs text-ws-mid">
          <LegendSwatch bg="bg-ws-barPlannedBg" border="border-ws-barPlannedBorder" rule="#1B4C8C" />
          {t('gantt.legendBlock')}
        </span>
        <span className="inline-flex items-center gap-1.5 font-ws text-xs text-ws-mid">
          <LegendSwatch bg="bg-ws-barCriticalBg" border="border-ws-barCriticalBorder" rule="#B22A22" />
          {t('gantt.legendCritical')}
        </span>
        <span className="inline-flex items-center gap-1.5 font-ws text-xs text-ws-mid">
          <LegendSwatch bg="bg-ws-barBundledBg" border="border-ws-barBundledBorder" rule="#1C6260" />
          {t('gantt.legendBundled')}
        </span>
        <span className="inline-flex items-center gap-1.5 font-ws text-xs text-ws-mid">
          <span className="inline-block w-4 h-1.5 bg-ws-mid" />
          {t('gantt.legendTrain')}
        </span>
        <span className="inline-flex items-center gap-1.5 font-ws text-xs text-ws-mid">
          <LegendSwatch bg="bg-ws-paper" border="border-ws-rule" />
          {t('overview.nightWindowLegend')}
        </span>
        <span className="flex-1 min-w-2" />
        <span className="font-mono text-[10px] text-ws-light">
          trains.csv · {sectionTrains.provenance?.records_emitted ?? 0} {t('common.of')} {sectionTrains.provenance?.source_rows?.toLocaleString?.() ?? 0} · {t('gantt.legendConflict').toLowerCase()}
        </span>
      </div>
    </div>
  );
};
