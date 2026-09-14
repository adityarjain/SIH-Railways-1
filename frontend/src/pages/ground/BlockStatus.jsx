import React, { useMemo } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { StatFigure, Pill, AdvisoryNote } from '../../components/ui/worksheet';
import { minToHhmm } from '../../utils/time';
import { statusTone } from '../../components/ground/WorkOrder';
import sectionTrains from '../../data/section_trains.json';
import corridors from '../../data/corridors_sections.json';

const SECTION = Object.fromEntries(corridors.sections.map((s) => [s.section_id, s]));
const RISK_PILL = { critical: 'critical', warn: 'warn', info: 'info', ok: 'ok', idle: 'idle' };

/**
 * Possession state for the sections this crew works, with the train movements
 * projected for the same section and date. Read-only: the crew executes blocks,
 * it does not plan them.
 */
export const BlockStatus = () => {
  const { tasksInventory } = usePlan();
  const { selectedDept } = useAuth();
  const { t } = useI18n();

  const rows = useMemo(
    () =>
      tasksInventory
        .filter((tk) => tk.department === selectedDept && (tk.block_ids || []).length)
        .sort((a, b) =>
          (a.scheduled_date || '').localeCompare(b.scheduled_date || '') ||
          (a.start_minute ?? 0) - (b.start_minute ?? 0),
        ),
    [tasksInventory, selectedDept],
  );

  const sectionDates = useMemo(() => {
    const seen = new Map();
    for (const tk of rows) {
      if (!tk.scheduled_date) continue;
      const key = `${tk.section_id}|${tk.scheduled_date}`;
      if (!seen.has(key)) seen.set(key, { section: tk.section_id, date: tk.scheduled_date });
    }
    return [...seen.values()];
  }, [rows]);

  const nightCount = rows.filter((tk) => tk.is_night).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-[15px] font-semibold text-ws-ink">{t('ground.blockStatusTitle')}</h2>
        <p className="font-ws text-xs text-ws-mid mt-0.5 max-w-3xl leading-relaxed">{t('ground.blockStatusSubtitle', { dept: selectedDept })}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border border-ws-rule bg-ws-surface p-3.5">
        <StatFigure value={rows.length} label={t('ground.possessions')} />
        <StatFigure value={nightCount} label={t('ground.nightWindows')} tone="text-ws-info" />
        <StatFigure value={new Set(rows.map((tk) => tk.section_id)).size} label={t('common.sections')} />
        <StatFigure value={rows.filter((tk) => tk.status === 'In Progress').length} label={t('ground.inProgressCount')} tone="text-ws-info" />
      </div>

      <div className="border border-ws-rule bg-ws-surface overflow-x-auto custom-scrollbar">
        <div className="px-3 py-2 bg-ws-tick border-b border-ws-rule">
          <span className="font-display text-[11px] font-semibold uppercase tracking-wide text-ws-light">{t('ground.allocated')}</span>
          <span className="font-mono text-[10px] text-ws-light block mt-0.5">{t('ground.allocatedScope', { count: rows.length })}</span>
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center font-ws text-xs text-ws-mid">{t('ground.noAllocated')}</div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead className="border-b border-ws-rule">
              <tr>
                {[t('common.block'), t('common.date'), t('common.window'), t('common.section'), t('common.task'), t('common.status')].map((h, i) => (
                  <th key={h} className={`px-3.5 py-2 font-display text-[10px] font-semibold uppercase tracking-wide text-ws-light whitespace-nowrap ${i === 5 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((tk) => (
                <tr key={tk.task_id} className="border-b border-ws-hairline last:border-b-0">
                  <td className="px-3.5 py-1.5 font-mono text-[11px] font-semibold text-ws-ink whitespace-nowrap">{(tk.block_ids || []).join(' + ')}</td>
                  <td className="px-3.5 py-1.5 font-mono text-[11px] text-ws-body whitespace-nowrap">{tk.scheduled_date || '—'}</td>
                  <td className="px-3.5 py-1.5 font-mono text-[11px] text-ws-body whitespace-nowrap">{tk.start_minute != null ? `${minToHhmm(tk.start_minute)}–${minToHhmm(tk.end_minute)}` : '—'}</td>
                  <td className="px-3.5 py-1.5 whitespace-nowrap">
                    <div className="font-mono text-[11px] text-ws-body">{tk.section_id}</div>
                    <div className="font-mono text-[9px] text-ws-light">{SECTION[tk.section_id]?.section_name}</div>
                  </td>
                  <td className="px-3.5 py-1.5 font-mono text-[11px] font-medium text-ws-ink whitespace-nowrap">{tk.task_id}</td>
                  <td className="px-3.5 py-1.5 text-right whitespace-nowrap"><Pill tone={RISK_PILL[statusTone(tk.status)] || 'idle'} size="sm">{tk.status || t('status.scheduled')}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="border border-ws-rule bg-ws-surface">
        <div className="px-3 py-2 bg-ws-tick border-b border-ws-rule">
          <span className="font-display text-[11px] font-semibold uppercase tracking-wide text-ws-light">{t('ground.trainMovements')}</span>
          <span className="font-mono text-[10px] text-ws-light block mt-0.5">{t('ground.trainMovementsScope')}</span>
        </div>
        {sectionDates.length === 0 ? (
          <div className="px-4 py-8 text-center font-ws text-xs text-ws-mid">{t('ground.noScheduledSection')}</div>
        ) : (
          <div>
            {sectionDates.map(({ section, date }) => {
              const trains = sectionTrains.sections?.[section]?.[date] || [];
              return (
                <div key={`${section}-${date}`} className="px-3 py-2.5 border-b border-ws-hairline last:border-b-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[11px] font-semibold text-ws-ink">{section} · {date}</span>
                    <span className="font-mono text-[10px] text-ws-light">
                      {trains.length === 1 ? t('ground.movementCount', { count: trains.length }) : t('ground.movementCountPlural', { count: trains.length })}
                    </span>
                  </div>
                  {trains.length === 0 ? (
                    <div className="font-ws text-[10px] text-ws-light mt-1">{t('ground.noTrainRecords')}</div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {trains.map((tr) => (
                        <span key={`${tr.train_id}-${tr.arrival_minute}`} className="font-mono text-[10px] px-1.5 py-0.5 bg-ws-tick border border-ws-hairline text-ws-body" title={tr.train_type || ''}>
                          {tr.train_id} {minToHhmm(tr.arrival_minute)}–{minToHhmm(tr.departure_minute)}
                          {tr.priority_class === 1 ? ' ·P1' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AdvisoryNote tone="idle" title={t('ground.contextTitle')}>{t('ground.contextBody')}</AdvisoryNote>

      <div className="font-mono text-[10px] text-ws-mid">
        {t('ground.trainDataScope', { records: sectionTrains.provenance?.records_emitted, source: sectionTrains.provenance?.source_rows?.toLocaleString() })}
      </div>
    </div>
  );
};
