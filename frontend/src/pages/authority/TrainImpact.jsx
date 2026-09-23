import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import { RegionHeader, FieldRow, StatFigure, AdvisoryNote, WsSelect } from '../../components/ui/worksheet';
import { minToHhmm } from '../../utils/time';
import sectionTrains from '../../data/live/sectionTrains';
import decisionTrace from '../../data/live/decisionTrace';
import corridors from '../../data/corridors_sections.json';

const SECTION_NAME = Object.fromEntries(
  corridors.sections.map((s) => [s.section_id, s.section_name]),
);

/**
 * How maintenance possessions sit against train movements.
 *
 * Everything here is projected occupancy from trains.csv or an impact figure the
 * decision trace already recorded. No delay is modelled and no conflict is
 * inferred from bar overlap.
 */
export const TrainImpact = ({ onNavigate }) => {
  const { scheduledTasks } = usePlan();
  const { t, isHindi } = useI18n();

  const pairs = useMemo(() => {
    const out = [];
    for (const [section, byDate] of Object.entries(sectionTrains.sections || {})) {
      for (const date of Object.keys(byDate)) out.push(`${section}|${date}`);
    }
    return out.sort();
  }, []);

  const [pair, setPair] = useState(() => {
    const preferred = pairs.find((p) => p.startsWith('SEC-0004|2026-09-07'));
    return preferred || pairs[0] || '';
  });

  const [section, date] = pair.split('|');
  const trains = sectionTrains.sections?.[section]?.[date] || [];

  const possessions = useMemo(
    () => scheduledTasks.filter((t) => t.section_id === section && t.date === date),
    [scheduledTasks, section, date],
  );

  const coincident = useMemo(() => {
    const out = [];
    for (const p of possessions) {
      for (const tr of trains) {
        if (tr.arrival_minute < p.end_minute && tr.departure_minute > p.start_minute) {
          out.push({ possession: p, train: tr });
        }
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [possessions, section, date]);

  const impact = decisionTrace.train_impact || {};
  const traceMatches = decisionTrace.request?.section_id === section;

  return (
    <div className="bg-ws-band min-h-full">
      <div className="bg-ws-paper border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-2.5 flex items-center justify-between gap-4 flex-wrap">
        <p className="font-ws text-xs text-ws-mid max-w-3xl leading-relaxed flex-1 min-w-[240px]">{t('trainImpactPage.subtitle')}</p>
        <WsSelect value={pair} onChange={(e) => setPair(e.target.value)} className="shrink-0">
          {pairs.map((p) => {
            const [s, d] = p.split('|');
            const n = sectionTrains.sections[s][d].length;
            return <option key={p} value={p}>{s} · {d} · {t('trainImpactPage.trainsLabel', { count: n })}</option>;
          })}
        </WsSelect>
      </div>

      {/* 01 — section snapshot */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
        <RegionHeader number="01" title={t('trainImpactPage.title')} meta={`${section} · ${date}`} isHindi={isHindi} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-3.5 border-t border-ws-rule pt-3">
          <StatFigure value={trains.length} label={`${t('trainImpactPage.trainMovements')} · ${SECTION_NAME[section] || section}`} tone="text-ws-info" />
          <StatFigure value={possessions.length} label={t('trainImpactPage.possessionsPlanned')} />
          <StatFigure value={coincident.length} label={t('trainImpactPage.coincidentSub')} tone={coincident.length ? 'text-ws-warn' : 'text-ws-ok'} />
          <StatFigure value={trains.filter((t) => t.priority_class === 1).length} label={t('trainImpactPage.priority1Services')} tone="text-ws-critical" />
        </div>
      </div>

      {/* 02 — recorded impact */}
      {traceMatches && (
        <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
          <RegionHeader number="02" title={t('trainImpactPage.recordedImpact')} meta={`${decisionTrace.request.task_id} · ${decisionTrace.selected?.window || ''}`} isHindi={isHindi} />
          <div className="border-t border-ws-rule">
            <FieldRow label={t('overview.conflictingServices')} value={(impact.conflicting || []).length} tone={(impact.conflicting || []).length ? 'text-ws-critical font-bold' : 'text-ws-ok font-bold'} />
            <FieldRow label={t('overview.adjacentServices')} value={(impact.adjacent || []).length} tone="text-ws-ok font-bold" />
          </div>
          <p className="font-ws text-[11px] text-ws-mid leading-relaxed pt-2">{impact.note}</p>
        </div>
      )}

      {/* 03/04 — train movements + possessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 bg-ws-rule gap-px border-b border-ws-rule">
        <div className="bg-ws-surface px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
          <RegionHeader number="03" title={t('trainImpactPage.trainMovements')} meta={t('trainImpactPage.trainMovementsScope', { section, date })} isHindi={isHindi} />
          {trains.length === 0 ? (
            <div className="py-6 font-ws text-xs text-ws-mid">{t('gantt.noTrainRecords')}</div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[420px]">
                <thead className="border-b border-ws-rule">
                  <tr>
                    {[t('replanning.train'), t('common.type'), t('trainImpactPage.occupancy'), t('common.priority'), t('trainImpactPage.load')].map((h, i) => (
                      <th key={h} className={`py-1.5 font-display text-[10px] font-semibold text-ws-light ${i > 2 ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trains.map((tr) => (
                    <tr key={`${tr.train_id}-${tr.arrival_minute}`} className="border-b border-ws-hairline last:border-b-0">
                      <td className="py-1.5 font-mono text-[11px] font-medium text-ws-ink">{tr.train_id}</td>
                      <td className="py-1.5 font-ws text-[11px] text-ws-body">{tr.train_type || '—'}</td>
                      <td className="py-1.5 font-mono text-[11px] text-ws-body">{minToHhmm(tr.arrival_minute)}–{minToHhmm(tr.departure_minute)}</td>
                      <td className="py-1.5 font-mono text-[11px] text-right">
                        <span className={tr.priority_class === 1 ? 'text-ws-critical font-bold' : tr.priority_class === 2 ? 'text-ws-warn font-bold' : 'text-ws-idle'}>{tr.priority_class ?? '—'}</span>
                      </td>
                      <td className="py-1.5 font-mono text-[11px] text-right text-ws-body">{tr.passenger_load_percent != null ? `${tr.passenger_load_percent}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-ws-surface px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4 space-y-3.5">
          <div>
            <RegionHeader number="04" title={t('trainImpactPage.possessionsOnSection')} meta={t('scope.demoScenario')} isHindi={isHindi} />
            {possessions.length === 0 ? (
              <div className="py-4 font-ws text-xs text-ws-mid">{t('trainImpactPage.noPossessionHere')}</div>
            ) : (
              <div className="border-t border-ws-rule">
                {possessions.map((p) => (
                  <button
                    key={p.task_id}
                    onClick={() => onNavigate && onNavigate('block-planning')}
                    className="w-full flex items-center justify-between gap-3 py-1.5 border-b border-ws-hairline last:border-b-0 hover:bg-ws-paper transition-colors text-left"
                  >
                    <span className="font-mono text-[11px] font-semibold text-ws-ink shrink-0">{p.task_id}</span>
                    <span className="font-ws text-xs text-ws-mid flex-1 min-w-0 truncate px-2">{p.maintenance_type}</span>
                    <span className="font-mono text-[11px] text-ws-body shrink-0">{minToHhmm(p.start_minute)}–{minToHhmm(p.end_minute)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {coincident.length > 0 ? (
            <AdvisoryNote tone="warn" title={t('trainImpactPage.coincidentTitle', { count: coincident.length })}>
              {coincident.slice(0, 4).map(({ possession, train }) => (
                <div key={`${possession.task_id}-${train.train_id}`} className="font-mono text-[10px] mt-0.5">
                  {possession.task_id} ∩ {train.train_id} · {minToHhmm(Math.max(possession.start_minute, train.arrival_minute))}–{minToHhmm(Math.min(possession.end_minute, train.departure_minute))}
                </div>
              ))}
              <div className="mt-1.5">{t('trainImpactPage.coincidentBody')}</div>
            </AdvisoryNote>
          ) : (
            <AdvisoryNote tone="ok" title={t('trainImpactPage.noCoincidentTitle')}>{t('trainImpactPage.noCoincidentBody')}</AdvisoryNote>
          )}

          <AdvisoryNote tone="idle" title={t('trainImpactPage.downstreamTitle')}>{t('trainImpactPage.downstreamBody')}</AdvisoryNote>
        </div>
      </div>

      <div className="bg-ws-band px-3.5 md:px-4 xl:px-5 py-2 flex flex-wrap items-center gap-3.5">
        <span className="text-[12px] text-ws-mid break-all">
          {sectionTrains.provenance?.source} · $ {sectionTrains.provenance?.command}
        </span>
      </div>
    </div>
  );
};
