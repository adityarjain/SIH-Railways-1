import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import { makeScale, ticksFor, packLanes, DOMAIN_PRESETS, possessionDomain } from '../../utils/timeScale';
import { minToHhmm } from '../../utils/time';
import { bandOf } from '../../utils/risk';
import { EmptyState, ScopeCaption } from '../ui';
import sectionTrains from '../../data/section_trains.json';

/**
 * Block / train / conflict timeline.
 *
 * Three lanes per section, in a deliberate hierarchy:
 *
 *   BLOCK     what the optimizer plans — tall, saturated, dominant
 *   TRAIN     real occupancy projected from trains.csv — thin, muted context
 *   CONFLICT  drawn ONLY where an artifact already records a conflict
 *
 * The conflict lane never performs overlap arithmetic of its own. A red hatch
 * means some engine output says the two collide, not that two bars happen to
 * intersect on screen.
 */

const LANE_H = 19;      // maintenance block bar
const LANE_GAP = 2;
const TRAIN_H = 6;      // train occupancy bar
const TRACK_PAD = 4;

const blockTone = (task, replannedTaskId) => {
  if (replannedTaskId && task.task_id === replannedTaskId) {
    return { bg: 'bg-status-warn', text: 'text-white', label: 'Replanned' };
  }
  if (task.is_bundled) return { bg: 'bg-bundle', text: 'text-white', label: 'Bundled' };
  if (bandOf(task) === 'CRITICAL') return { bg: 'bg-status-critical', text: 'text-white', label: 'Critical' };
  return { bg: 'bg-status-info', text: 'text-white', label: 'Planned' };
};

const LegendSwatch = ({ className, h = 10, hatch }) => (
  <span
    className={`inline-block w-4 shrink-0 ${hatch ? 'conflict-hatch border border-status-critical' : className}`}
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
  const { t: tx } = useI18n();
  const [domainId, setDomainId] = useState('day');

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

  const DOMAIN_BUTTONS = [
    { id: 'day', label: 'Full day' },
    { id: 'night', label: 'Night' },
    { id: 'possession', label: 'Possession ±2h', disabled: !hasPossessionDomain },
  ];

  return (
    <div className="bg-surface-panel border border-line rounded-lg">
      {/* header */}
      <div className="px-3 py-2.5 bg-surface-sunken border-b border-line flex items-start justify-between gap-3 rounded-t-lg">
        <div className="min-w-0">
          <div className="t-label">Block / train timeline</div>
          <div className="font-mono text-[11px] text-rail-900 mt-0.5 truncate">
            {corridorLabel ? `${corridorLabel} · ` : ''}{selectedDate || 'all dates'}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {scope && <ScopeCaption>{scope}</ScopeCaption>}
          <div className="flex items-stretch border border-line bg-surface-panel">
            {DOMAIN_BUTTONS.map((b) => (
              <button
                key={b.id}
                disabled={b.disabled}
                onClick={() => setDomainId(b.id)}
                className={`px-2 py-1 text-[10px] font-semibold transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
                  domainId === b.id ? 'bg-rail-900 text-white' : 'text-rail-500 hover:bg-surface-sunken'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* legend */}
      <div className="px-3 py-2 border-b border-line flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {[
          [tx('gantt.legendBlock'), 'bg-status-info', 10],
          [tx('gantt.legendCritical'), 'bg-status-critical', 10],
          [tx('gantt.legendBundled'), 'bg-bundle', 10],
          [tx('gantt.legendReplanned'), 'bg-status-warn', 10],
          [tx('gantt.legendTrain'), 'bg-rail-400', 5],
          [tx('gantt.legendSimulated'), 'bg-rail-700', 5],
        ].map(([label, cls, h]) => (
          <span key={label} className="inline-flex items-center gap-1.5 text-[10px] text-rail-500">
            <LegendSwatch className={cls} h={h} />
            {label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-[10px] text-rail-500">
          <LegendSwatch hatch h={10} />
          {tx('gantt.legendConflict')}
        </span>
      </div>

      {sections.length === 0 ? (
        <EmptyState title="No sections carry a possession for this date and corridor.">
          Change the date or corridor above; the selectors only offer combinations the plan covers.
        </EmptyState>
      ) : (
        <div className="p-3 overflow-x-auto custom-scrollbar">
          <div className="min-w-[720px]">
            {/* ruler — labels absolutely positioned on their own gridline */}
            <div className="flex">
              <div className="w-28 shrink-0" />
              <div className="relative flex-1 h-4">
                {ticks.map((t) => (
                  <span
                    key={t.minute}
                    className="absolute font-mono text-[9px] text-rail-400 -translate-x-1/2"
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
                <div key={section.section_id} className="flex items-stretch border-b border-line-subtle last:border-b-0">
                  <div className="w-28 shrink-0 py-2 pr-2">
                    <div className="font-mono text-[11px] font-bold text-rail-900">{section.section_id}</div>
                    <div className="text-[9px] text-rail-400 truncate">{section.section_name}</div>
                    {!hasTrainData && !compact && (
                      <div className="text-[8px] text-rail-400 mt-0.5 italic">no train records</div>
                    )}
                  </div>

                  <div className="flex-1 py-1.5">
                    <div className="relative bg-surface-base border border-line-subtle" style={{ height: trackH }}>
                      {/* gridlines */}
                      {ticks.map((t) => (
                        <span
                          key={t.minute}
                          className="absolute top-0 bottom-0 w-px bg-line-subtle"
                          style={{ left: `${t.percent}%` }}
                        />
                      ))}

                      {/* LANE A — maintenance possessions */}
                      {packed.map(({ item: task, lane }) => {
                        const [a, b] = scale.clamp(task.start_minute, task.end_minute);
                        const t = blockTone(task, replannedRecord?.task_id && task.date === replannedRecord?.date ? replannedRecord.task_id : null);
                        return (
                          <button
                            key={task.task_id}
                            onClick={() => onSelectTask && onSelectTask(task)}
                            title={`${task.task_id} · ${minToHhmm(task.start_minute)}–${minToHhmm(task.end_minute)} · ${task.maintenance_type || ''}`}
                            className={`absolute flex items-center px-1.5 overflow-hidden ${t.bg} ${t.text} hover:brightness-110 transition-[filter]`}
                            style={{
                              left: `${scale.toPercent(a)}%`,
                              width: `${scale.toWidth(a, b)}%`,
                              top: TRACK_PAD + lane * (LANE_H + LANE_GAP),
                              height: LANE_H,
                            }}
                          >
                            <span className="text-[9px] font-semibold whitespace-nowrap">
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
                            className="absolute bg-rail-400"
                            style={{
                              left: `${scale.toPercent(a)}%`,
                              width: `${scale.toWidth(a, b)}%`,
                              bottom: 4,
                              height: TRAIN_H,
                            }}
                          />
                        );
                      })}
                      {simulated.map((ev) => {
                        const [a, b] = scale.clamp(ev.arrival_minute, ev.departure_minute);
                        return (
                          <span
                            key={ev.event_id}
                            title={`${ev.train_id} · ${ev.train_name || ''} · simulated event`}
                            className="absolute bg-rail-700 border border-rail-900"
                            style={{
                              left: `${scale.toPercent(a)}%`,
                              width: `${scale.toWidth(a, b)}%`,
                              bottom: 4,
                              height: TRAIN_H,
                            }}
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
                            className="absolute conflict-hatch border border-status-critical pointer-events-none"
                            style={{
                              left: `${scale.toPercent(a)}%`,
                              width: `${scale.toWidth(a, b)}%`,
                              top: 1,
                              bottom: 1,
                              opacity: 0.55,
                            }}
                          />
                        );
                      })}

                      {/* truthful empty state — never a placeholder bar */}
                      {tasks.length === 0 && projected.length === 0 && simulated.length === 0 && (
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] text-rail-400">
                          {hasTrainData
                            ? 'No possession or train movement in this window'
                            : 'No train timing records available for this section/date'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-rail-400 mt-2.5 leading-relaxed">
            Upper lane: maintenance possessions the optimizer planned. Lower lane: train
            occupancy projected verbatim from <span className="font-mono">trains.csv</span>{' '}
            ({sectionTrains.provenance?.records_emitted ?? 0} records across{' '}
            {sectionTrains.provenance?.sections ?? 0} sections). Hatching marks a conflict
            recorded by an engine artifact — overlaps are never inferred here.
          </p>
        </div>
      )}
    </div>
  );
};
