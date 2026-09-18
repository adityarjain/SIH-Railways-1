import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import { makeScale, ticksFor, packLanes, DOMAIN_PRESETS, possessionDomain } from '../../utils/timeScale';
import { minToHhmm } from '../../utils/time';
import { bandOf } from '../../utils/risk';
import { SegmentedControl, wsCase } from '../ui/worksheet';
import sectionTrains from '../../data/live/sectionTrains';

/**
 * Block / train / conflict timeline (design 2A idiom) — the Block Planning
 * worksheet's hero. Three lanes per section, in a deliberate hierarchy:
 *
 *   BLOCK     what the optimizer plans — tall, saturated, dominant
 *   TRAIN     real occupancy projected from trains.csv — thin, muted context
 *   CONFLICT  drawn ONLY where an artifact already records a conflict
 *
 * The conflict lane never performs overlap arithmetic of its own. A red hatch
 * means some engine output says the two collide, not that two bars happen to
 * intersect on screen. This is a deliberate visual fork of `DaySheet`
 * (Overview's hero) rather than a shared component — `DaySheet` renders one
 * corridor with no conflict/simulated-train lanes; this renders all corridors
 * with the full conflict-detection surface Block Planning needs.
 */

const LANE_H = 19;
const LANE_GAP = 2;
const TRAIN_H = 6;
const TRACK_PAD = 4;

const blockTone = (task, replannedTaskId) => {
  if (replannedTaskId && task.task_id === replannedTaskId) {
    return { bg: 'bg-ws-warn', text: 'text-white' };
  }
  if (task.is_bundled) return { bg: 'bg-ws-bundle', text: 'text-white' };
  if (bandOf(task) === 'CRITICAL') return { bg: 'bg-ws-critical', text: 'text-white' };
  return { bg: 'bg-ws-info', text: 'text-white' };
};

const LegendSwatch = ({ className, h = 10, hatch }) => (
  <span
    className={`inline-block w-4 shrink-0 ${hatch ? 'ws-conflict-hatch border border-ws-critical' : className}`}
    style={{ height: h }}
  />
);

export const BlockTrainGantt = ({
  sections = [],
  scheduledTasks = [],
  selectedDate,
  corridorLabel,
  onSelectTask,
  scope,
  compact = false,
}) => {
  const { activeEvent, rerouteScenario, holdScenario, replanScenario, blockUnavailableScenario, replannedRecord } = usePlan();
  const { t: tx, isHindi } = useI18n();
  const [domainId, setDomainId] = useState('day');
  const { uc } = wsCase(isHindi);

  const tasksBySection = useMemo(() => {
    const map = new Map(sections.map((s) => [s.section_id, []]));
    for (const t of scheduledTasks) {
      if (selectedDate && t.date !== selectedDate) continue;
      if (!map.has(t.section_id)) continue;
      map.get(t.section_id).push(t);
    }
    return map;
  }, [sections, scheduledTasks, selectedDate]);

  const visibleTasks = useMemo(
    () => [...tasksBySection.values()].flat(),
    [tasksBySection],
  );

  /**
   * Conflicts recorded by an artifact, keyed by section. Only the injected
   * event's own scenario contributes: with no event active there is nothing to
   * draw, which is the truthful state of the committed plan.
   */
  const conflictsBySection = useMemo(() => {
    const out = new Map();
    if (!activeEvent) return out;

    const candidates = [rerouteScenario, holdScenario, replanScenario, blockUnavailableScenario];
    for (const scenario of candidates) {
      const ev = scenario?.event;
      const cf = scenario?.conflict;
      if (!ev || !cf?.has_conflict) continue;
      if (ev.event_id !== activeEvent.id && ev.train_id !== activeEvent.trainId) continue;
      if (selectedDate && ev.date !== selectedDate) continue;
      const window = cf.overlap_window;
      if (!Array.isArray(window) || window.length !== 2) continue;

      const list = out.get(ev.section_id) || [];
      list.push({
        start: window[0],
        end: window[1],
        trains: cf.conflicting_trains || [],
        blocks: cf.affected_blocks || [],
        type: cf.conflict_type,
        event: ev,
      });
      out.set(ev.section_id, list);
    }
    return out;
  }, [activeEvent, rerouteScenario, holdScenario, replanScenario, blockUnavailableScenario, selectedDate]);

  /** Simulated movements injected by the event simulator, kept visually distinct
   *  from projected trains.csv occupancy. */
  const simTrainsBySection = useMemo(() => {
    const out = new Map();
    if (!activeEvent) return out;
    const candidates = [rerouteScenario, holdScenario, replanScenario, blockUnavailableScenario];
    for (const scenario of candidates) {
      const ev = scenario?.event;
      if (!ev || ev.arrival_minute == null || ev.departure_minute == null) continue;
      if (ev.event_id !== activeEvent.id && ev.train_id !== activeEvent.trainId) continue;
      if (selectedDate && ev.date !== selectedDate) continue;
      const list = out.get(ev.section_id) || [];
      list.push(ev);
      out.set(ev.section_id, list);
    }
    return out;
  }, [activeEvent, rerouteScenario, holdScenario, replanScenario, blockUnavailableScenario, selectedDate]);

  // Domain: full day, night, or framed around the possessions actually shown.
  const domain = useMemo(() => {
    if (domainId === 'night') return DOMAIN_PRESETS.night;
    if (domainId === 'possession') {
      return possessionDomain(visibleTasks) || DOMAIN_PRESETS.day;
    }
    return DOMAIN_PRESETS.day;
  }, [domainId, visibleTasks]);

  const scale = useMemo(() => makeScale(domain.start, domain.end), [domain]);
  const tickStep = domain.end - domain.start <= 480 ? 60 : 180;
  const ticks = useMemo(() => ticksFor(scale, tickStep), [scale, tickStep]);

  const hasPossessionDomain = possessionDomain(visibleTasks) != null;

  const DOMAIN_OPTIONS = [
    { id: 'day', label: tx('overview.fullDay') },
    { id: 'night', label: tx('overview.night0006') },
    { id: 'possession', label: tx('overview.possessionWindow'), disabled: !hasPossessionDomain },
  ];

  return (
    <div className="bg-ws-surface border border-ws-rule">
      {/* header */}
      <div className="px-3.5 py-2.5 bg-ws-tick border-b border-ws-rule flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className={`font-display text-xs font-semibold ${uc} tracking-[0.1em] text-ws-light`}>{tx('gantt.title')}</div>
          <div className="font-mono text-[11px] text-ws-ink mt-0.5 truncate">
            {corridorLabel ? `${corridorLabel} · ` : ''}{selectedDate || tx('gantt.allDates')}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {scope && <span className="font-mono text-[10px] text-ws-light uppercase">{scope}</span>}
          <SegmentedControl options={DOMAIN_OPTIONS} value={domainId} onChange={setDomainId} isHindi={isHindi} size="sm" />
        </div>
      </div>

      {/* legend */}
      <div className="px-3.5 py-2 border-b border-ws-rule flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {[
          [tx('gantt.legendBlock'), 'bg-ws-info', 10],
          [tx('gantt.legendCritical'), 'bg-ws-critical', 10],
          [tx('gantt.legendBundled'), 'bg-ws-bundle', 10],
          [tx('gantt.legendReplanned'), 'bg-ws-warn', 10],
          [tx('gantt.legendTrain'), 'bg-ws-mid', 5],
          [tx('gantt.legendSimulated'), 'bg-ws-body', 5],
        ].map(([label, cls, h]) => (
          <span key={label} className="inline-flex items-center gap-1.5 font-ws text-xs text-ws-mid">
            <LegendSwatch className={cls} h={h} />
            {label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 font-ws text-xs text-ws-mid">
          <LegendSwatch hatch h={10} />
          {tx('gantt.legendConflict')}
        </span>
      </div>

      {sections.length === 0 ? (
        <div className="py-8 text-center">
          <div className="font-ws text-xs font-semibold text-ws-mid">{tx('gantt.noSections')}</div>
          <div className="font-ws text-[11px] text-ws-light mt-1 max-w-md mx-auto leading-relaxed">{tx('gantt.noSectionsBody')}</div>
        </div>
      ) : (
        <div className="p-3.5 overflow-x-auto custom-scrollbar">
          <div className="min-w-[720px]">
            {/* ruler */}
            <div className="flex">
              <div className="w-28 shrink-0" />
              <div className="relative flex-1 h-4">
                {ticks.map((t) => (
                  <span
                    key={t.minute}
                    className="absolute font-mono text-[9px] text-ws-light -translate-x-1/2"
                    style={{ left: `${t.percent}%` }}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            </div>

            {/* rows */}
            {sections.map((section) => {
              const tasks = (tasksBySection.get(section.section_id) || []).filter((t) =>
                scale.intersects(t.start_minute, t.end_minute),
              );
              const packed = packLanes(tasks, (t) => t.start_minute, (t) => t.end_minute);
              const laneCount = Math.max(1, ...packed.map((p) => p.lane + 1));

              const projected = (sectionTrains.sections?.[section.section_id]?.[selectedDate] || [])
                .filter((t) => scale.intersects(t.arrival_minute, t.departure_minute));
              const simulated = (simTrainsBySection.get(section.section_id) || [])
                .filter((e) => scale.intersects(e.arrival_minute, e.departure_minute));
              const conflicts = (conflictsBySection.get(section.section_id) || [])
                .filter((c) => scale.intersects(c.start, c.end));

              const hasTrainData = Boolean(sectionTrains.sections?.[section.section_id]?.[selectedDate]);
              const trackH = TRACK_PAD * 2 + laneCount * LANE_H + (laneCount - 1) * LANE_GAP + TRAIN_H + 5;

              return (
                <div key={section.section_id} className="flex items-stretch border-b border-ws-hairline last:border-b-0">
                  <div className="w-28 shrink-0 py-2 pr-2">
                    <div className="font-mono text-[11px] font-bold text-ws-ink">{section.section_id}</div>
                    <div className="font-ws text-[9px] text-ws-light truncate">{section.section_name}</div>
                    {!hasTrainData && !compact && (
                      <div className="font-ws text-[8px] text-ws-light mt-0.5 italic">{tx('gantt.noTrainRecordsShort')}</div>
                    )}
                  </div>

                  <div className="flex-1 py-1.5">
                    <div className="relative bg-ws-surface border border-ws-hairline" style={{ height: trackH }}>
                      {ticks.map((t) => (
                        <span
                          key={t.minute}
                          className="absolute top-0 bottom-0 w-px bg-ws-tick"
                          style={{ left: `${t.percent}%` }}
                        />
                      ))}

                      {/* LANE A — maintenance possessions */}
                      {packed.map(({ item: task, lane }) => {
                        const [a, b] = scale.clamp(task.start_minute, task.end_minute);
                        const tone = blockTone(task, replannedRecord?.task_id && task.date === replannedRecord?.date ? replannedRecord.task_id : null);
                        return (
                          <button
                            key={task.task_id}
                            onClick={() => onSelectTask && onSelectTask(task)}
                            title={`${task.task_id} · ${minToHhmm(task.start_minute)}–${minToHhmm(task.end_minute)} · ${task.maintenance_type || ''}`}
                            className={`absolute flex items-center px-1.5 overflow-hidden ${tone.bg} ${tone.text} hover:brightness-110 transition-[filter]`}
                            style={{
                              left: `${scale.toPercent(a)}%`,
                              width: `${scale.toWidth(a, b)}%`,
                              top: TRACK_PAD + lane * (LANE_H + LANE_GAP),
                              height: LANE_H,
                            }}
                          >
                            <span className="font-mono text-[9px] font-semibold whitespace-nowrap">
                              {task.task_id}
                              {!compact && ` · ${task.duration_minutes}m`}
                            </span>
                          </button>
                        );
                      })}

                      {/* LANE B — real train occupancy, then simulated movements */}
                      {projected.map((tr) => {
                        const [a, b] = scale.clamp(tr.arrival_minute, tr.departure_minute);
                        return (
                          <span
                            key={`${tr.train_id}-${tr.arrival_minute}`}
                            title={`${tr.train_id} · ${minToHhmm(tr.arrival_minute)}–${minToHhmm(tr.departure_minute)}${tr.priority_class ? ` · priority ${tr.priority_class}` : ''} (trains.csv)`}
                            className="absolute bg-ws-mid"
                            style={{ left: `${scale.toPercent(a)}%`, width: `${scale.toWidth(a, b)}%`, bottom: 4, height: TRAIN_H }}
                          />
                        );
                      })}
                      {simulated.map((ev) => {
                        const [a, b] = scale.clamp(ev.arrival_minute, ev.departure_minute);
                        return (
                          <span
                            key={ev.event_id}
                            title={`${ev.train_id} · ${ev.train_name || ''} · simulated event`}
                            className="absolute bg-ws-body border border-ws-ink"
                            style={{ left: `${scale.toPercent(a)}%`, width: `${scale.toWidth(a, b)}%`, bottom: 4, height: TRAIN_H }}
                          />
                        );
                      })}

                      {/* LANE C — conflicts recorded by an artifact */}
                      {conflicts.map((c, i) => {
                        const [a, b] = scale.clamp(c.start, c.end);
                        return (
                          <span
                            key={`${c.trains.join('-')}-${i}`}
                            title={`${c.type}: ${c.trains.join(', ')} vs ${c.blocks.join(' + ')} (${minToHhmm(c.start)}–${minToHhmm(c.end)})`}
                            className="absolute ws-conflict-hatch border border-ws-critical pointer-events-none"
                            style={{ left: `${scale.toPercent(a)}%`, width: `${scale.toWidth(a, b)}%`, top: 1, bottom: 1, opacity: 0.55 }}
                          />
                        );
                      })}

                      {/* truthful empty state — never a placeholder bar */}
                      {tasks.length === 0 && projected.length === 0 && simulated.length === 0 && (
                        <span className="absolute inset-0 flex items-center justify-center font-ws text-[9px] text-ws-light">
                          {hasTrainData ? tx('gantt.noActivity') : tx('gantt.noTrainRecords')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="font-ws text-[10px] text-ws-light mt-2.5 leading-relaxed">
            {tx('gantt.footnote', {
              records: sectionTrains.provenance?.records_emitted ?? 0,
              sections: sectionTrains.provenance?.sections ?? 0,
            })}
          </p>
        </div>
      )}
    </div>
  );
};
