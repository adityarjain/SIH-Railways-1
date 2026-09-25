import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import { SegmentedControl } from '../ui/worksheet';
import { Button } from '../ui';
import { bandOf } from '../../utils/risk';
import { minToHhmm } from '../../utils/time';
import { TODAY } from '../../utils/dateShift';
import corridorsSectionsData from '../../data/corridors_sections.json';

const SECTION_NAME = Object.fromEntries(corridorsSectionsData.sections.map((s) => [s.section_id, s.section_name]));
const SLOTS = Array.from({ length: 12 }, (_, i) => i * 120);
const WEEKDAY = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' });

const CHIP = {
  critical: 'bg-ws-barCriticalBg border-ws-barCriticalBorder border-l-ws-critical text-ws-barCriticalLabel',
  high: 'bg-status-warn-tint border-[#E2CFA5] border-l-ws-warn text-ws-warn',
  planned: 'bg-ws-barPlannedBg border-ws-barPlannedBorder border-l-ws-info text-ws-barPlannedLabel',
  done: 'bg-status-ok-tint border-[#B8D3C3] border-l-ws-ok text-ws-ok',
};

/**
 * Weekly block calendar: seven days of the plan in two-hour slots, one chip
 * per possession at the slot it starts in. Hover, focus or tap a chip for its
 * details. The original/replanned toggle only changes this view; the plan
 * itself is changed on Replanning.
 */
export const WeeklyBlockCalendar = ({ onSelectDate }) => {
  const { scheduledTasks, tasksInventory, verifications, isReplanned, replannedRecord, originalRecord } = usePlan();
  const { t } = useI18n();
  const [view, setView] = useState(isReplanned ? 'replanned' : 'original');
  const [card, setCard] = useState(null); // { task, x, y, pinned }

  const movedId = replannedRecord.task_id;
  const tasks = useMemo(
    () => scheduledTasks.map((tk) => (tk.task_id === movedId ? (view === 'replanned' ? replannedRecord : originalRecord) : tk)),
    [scheduledTasks, view, movedId, replannedRecord, originalRecord],
  );

  const status = useMemo(() => Object.fromEntries(tasksInventory.map((tk) => [tk.task_id, tk.status])), [tasksInventory]);
  const dates = useMemo(() => [...new Set(scheduledTasks.map((tk) => tk.date))].sort(), [scheduledTasks]);
  const startIdx = Math.max(0, dates.indexOf(TODAY));
  const [weekStart, setWeekStart] = useState(Math.min(startIdx, Math.max(0, dates.length - 7)));
  const week = dates.slice(weekStart, weekStart + 7);

  const cells = useMemo(() => {
    const m = {};
    for (const tk of tasks) {
      if (!week.includes(tk.date)) continue;
      const key = `${tk.date}|${Math.floor(tk.start_minute / 120) * 120}`;
      (m[key] ||= []).push(tk);
    }
    Object.values(m).forEach((l) => l.sort((a, b) => a.start_minute - b.start_minute));
    return m;
  }, [tasks, week]);

  const toneOf = (tk) => {
    if (status[tk.task_id] === 'Completed' || verifications[tk.task_id]?.status === 'Approved') return 'done';
    const band = bandOf(tk);
    if (band === 'CRITICAL') return 'critical';
    if (band === 'HIGH') return 'high';
    return 'planned';
  };

  const show = (tk, el, pinned = false) => {
    const r = el.getBoundingClientRect();
    const x = Math.min(r.left, window.innerWidth - 300);
    const y = r.bottom + 6 + 260 > window.innerHeight ? r.top - 266 : r.bottom + 6;
    setCard({ task: tk, x: Math.max(8, x), y: Math.max(8, y), pinned });
  };
  const hide = () => setCard((c) => (c?.pinned ? c : null));

  const perDay = (d) => tasks.filter((tk) => tk.date === d);

  return (
    <div className="space-y-2.5" onKeyDown={(e) => e.key === 'Escape' && setCard(null)}>
      <div className="flex items-center gap-2.5 flex-wrap">
        <Button size="sm" variant="secondary" disabled={weekStart === 0} onClick={() => setWeekStart((w) => Math.max(0, w - 7))} aria-label={t('calendar.prev')}>←</Button>
        <span className="font-mono text-[12px] text-ws-ink">{week[0]} → {week[week.length - 1]}</span>
        <Button size="sm" variant="secondary" disabled={weekStart + 7 >= dates.length} onClick={() => setWeekStart((w) => Math.min(dates.length - 7, w + 7))} aria-label={t('calendar.next')}>→</Button>
        <span className="flex-1" />
        <SegmentedControl
          size="sm"
          value={view}
          onChange={setView}
          options={[{ id: 'original', label: t('calendar.original') }, { id: 'replanned', label: t('calendar.replanned') }]}
        />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ws-mid">
        {[['critical', t('calendar.legendCritical')], ['high', t('calendar.legendHigh')], ['planned', t('calendar.legendPlanned')], ['done', t('calendar.legendDone')]].map(([k, l]) => (
          <span key={k} className="inline-flex items-center gap-1.5"><span className={`inline-block w-4 h-3 border border-l-[3px] ${CHIP[k]}`} />{l}</span>
        ))}
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-4 h-3 border-2 border-dashed border-ws-warn" />{t('calendar.legendMoved')}</span>
        <span className="flex-1" />
        <span>{t('calendar.viewOnly')}</span>
      </div>

      <div className="overflow-x-auto custom-scrollbar border border-ws-rule">
        <table className="w-full min-w-[960px] border-collapse table-fixed">
          <thead>
            <tr className="bg-ws-tick">
              <th className="w-[92px] border-b border-r border-ws-rule px-2 py-1.5 t-stamp text-left">{t('calendar.slot')}</th>
              {week.map((d) => {
                const list = perDay(d);
                const crit = list.filter((tk) => bandOf(tk) === 'CRITICAL').length;
                return (
                  <th key={d} className={`border-b border-r border-ws-rule last:border-r-0 p-0 ${d === TODAY ? 'bg-ws-surface shadow-[inset_0_-3px_0_#1F1C17]' : ''}`}>
                    <button type="button" onClick={() => onSelectDate && onSelectDate(d)} className="w-full text-left px-2 py-1.5 hover:bg-ws-paper" title={t('calendar.openDay')}>
                      <span className="block font-display text-[12px] font-bold uppercase tracking-[0.08em] text-ws-ink">{WEEKDAY(d)} <span className="font-mono font-medium">{d.slice(8)}</span></span>
                      <span className="block font-mono text-[10px] text-ws-mid font-normal">
                        {list.length} · <span className={crit ? 'text-ws-critical font-bold' : ''}>{crit} crit</span>
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map((s) => (
              <tr key={s} className={s < 360 ? 'bg-ws-paper/60' : ''}>
                <td className="border-b border-r border-ws-hairline px-2 py-1 font-mono text-[10px] text-ws-mid align-top whitespace-nowrap">
                  {minToHhmm(s)}–{minToHhmm(s + 120)}
                </td>
                {week.map((d) => (
                  <td key={d} className="border-b border-r border-ws-hairline last:border-r-0 p-1 align-top">
                    <div className="flex flex-col gap-1">
                      {(cells[`${d}|${s}`] || []).map((tk) => {
                        const moved = tk.task_id === movedId && view === 'replanned';
                        return (
                          <button
                            key={tk.task_id}
                            type="button"
                            onMouseEnter={(e) => show(tk, e.currentTarget)}
                            onMouseLeave={hide}
                            onFocus={(e) => show(tk, e.currentTarget)}
                            onBlur={hide}
                            onClick={(e) => show(tk, e.currentTarget, true)}
                            className={`w-full text-left border border-l-[3px] px-1.5 py-0.5 ${CHIP[toneOf(tk)]} ${moved ? '!border-2 !border-dashed !border-ws-warn' : ''}`}
                          >
                            <span className="block font-mono text-[10px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap">{tk.task_id.replace('TASK-', '')} · {tk.section_id}</span>
                            <span className="block text-[10px] overflow-hidden text-ellipsis whitespace-nowrap opacity-90">{tk.maintenance_type}</span>
                          </button>
                        );
                      })}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {card && (
        <div
          role="dialog"
          aria-label={card.task.task_id}
          className="fixed z-overlay w-[288px] bg-ws-surface border border-ws-ink shadow-overlay p-3 text-[12px]"
          style={{ left: card.x, top: card.y }}
          onMouseEnter={() => setCard((c) => c && { ...c, pinned: true })}
          onMouseLeave={() => setCard(null)}
        >
          <div className="flex items-baseline justify-between gap-2 border-b border-ws-rule pb-1.5 mb-1.5">
            <span className="font-mono text-[13px] font-bold text-ws-ink">{card.task.task_id}</span>
            <button type="button" onClick={() => setCard(null)} className="text-ws-mid hover:text-ws-ink" aria-label={t('common.dismiss')}>✕</button>
          </div>
          <div className="text-[13px] font-medium text-ws-ink">{card.task.maintenance_type}</div>
          <div className="text-ws-mid">{card.task.department}</div>
          <dl className="grid grid-cols-[76px_minmax(0,1fr)] gap-x-2 gap-y-0.5 mt-2 font-mono text-[11px]">
            {[
              [t('common.section'), `${card.task.section_id} · ${SECTION_NAME[card.task.section_id] || ''}`],
              [t('common.date'), card.task.date],
              [t('common.window'), `${minToHhmm(card.task.start_minute)}–${minToHhmm(card.task.end_minute)} (${card.task.end_minute - card.task.start_minute} min)`],
              [t('common.blocks'), (card.task.block_ids || []).join(' + ')],
              [t('common.crew'), (card.task.assigned_teams || []).join(', ') || '—'],
              [t('common.risk'), `${card.task.risk_score} ${bandOf(card.task) || ''}`],
              [t('common.status'), verifications[card.task.task_id]?.status || status[card.task.task_id] || '—'],
            ].map(([k, v]) => (
              <React.Fragment key={k}>
                <dt className="text-ws-light font-display font-semibold uppercase tracking-[0.06em] text-[10px] pt-px">{k}</dt>
                <dd className="text-ws-ink break-words">{v}</dd>
              </React.Fragment>
            ))}
          </dl>
          {card.task.task_id === movedId && (
            <p className="mt-2 text-[11px] text-ws-warn">
              {t('calendar.movedNote', {
                from: `${originalRecord.date} ${minToHhmm(originalRecord.start_minute)}`,
                to: `${replannedRecord.date} ${minToHhmm(replannedRecord.start_minute)}`,
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
