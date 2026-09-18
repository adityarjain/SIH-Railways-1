import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { StatFigure, FieldRow, AdvisoryNote, WsSelect } from '../../components/ui/worksheet';
import { minToHhmm } from '../../utils/time';
import corridors from '../../data/corridors_sections.json';
import sectionTraffic from '../../data/section_traffic.json';
import sectionTrains from '../../data/live/sectionTrains';

const SECTION = Object.fromEntries(corridors.sections.map((s) => [s.section_id, s]));

/**
 * Reference detail for the sections this crew works. Every field is a column in
 * corridors_sections.csv or a projected train record — nothing is characterised
 * or advised.
 */
export const SectionInfo = () => {
  const { tasksInventory } = usePlan();
  const { selectedDept } = useAuth();
  const { t } = useI18n();

  const mySections = useMemo(() => {
    const ids = [...new Set(
      tasksInventory.filter((tk) => tk.department === selectedDept).map((tk) => tk.section_id),
    )].sort();
    return ids;
  }, [tasksInventory, selectedDept]);

  const [sectionId, setSectionId] = useState(() => mySections[0] || 'SEC-0004');
  const sec = SECTION[sectionId];
  const traffic = sectionTraffic[sectionId];
  const trainDates = Object.keys(sectionTrains.sections?.[sectionId] || {}).sort();

  const tasksHere = useMemo(
    () => tasksInventory.filter((tk) => tk.section_id === sectionId && tk.department === selectedDept),
    [tasksInventory, sectionId, selectedDept],
  );

  if (mySections.length === 0) {
    return (
      <div className="border border-ws-rule bg-ws-surface">
        <div className="px-3 py-2 bg-ws-tick border-b border-ws-rule">
          <span className="font-display text-[11px] font-semibold uppercase tracking-wide text-ws-light">{t('ground.sectionInfoTitle')}</span>
          <span className="font-mono text-[10px] text-ws-light block mt-0.5">{selectedDept}</span>
        </div>
        <div className="px-4 py-8 text-center font-ws text-xs font-semibold text-ws-mid">{t('ground.noSectionAssigned')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-semibold text-ws-ink">{t('ground.sectionInfoTitle')}</h2>
          <p className="font-ws text-xs text-ws-mid mt-0.5">{t('ground.sectionInfoSubtitle')}</p>
        </div>
        <WsSelect value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
          {mySections.map((id) => (
            <option key={id} value={id}>{id} — {SECTION[id]?.section_name || ''}</option>
          ))}
        </WsSelect>
      </div>

      {!sec ? (
        <div className="border border-ws-rule bg-ws-surface px-4 py-8 text-center font-ws text-xs font-semibold text-ws-mid">{t('ground.sectionNotPresent')}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border border-ws-rule bg-ws-surface p-3.5">
            <StatFigure value={sec.maximum_speed_kmph} label={`${t('ground.lineSpeed')} · kmph`} />
            <StatFigure value={sec.section_length_km} label={`${t('ground.length')} · km`} />
            <StatFigure value={sec.electrified} label={t('ground.electrified')} />
            <StatFigure value={tasksHere.length} label={t('ground.yourTasksHere')} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="border border-ws-rule bg-ws-surface">
              <div className="px-3 py-2 bg-ws-tick border-b border-ws-rule">
                <span className="font-display text-[11px] font-semibold uppercase tracking-wide text-ws-light">{t('ground.sectionRecord')}</span>
                <span className="font-mono text-[10px] text-ws-light block mt-0.5">corridors_sections.csv</span>
              </div>
              <FieldRow label={t('common.section')} value={`${sec.section_id} · ${sec.section_name}`} />
              <FieldRow label={t('common.corridor')} value={`${sec.corridor_id} · ${sec.corridor_name}`} />
              <FieldRow label={t('ground.region')} value={sec.region} />
              <FieldRow label={t('ground.trackType')} value={sec.track_type} />
              <FieldRow label={t('ground.electrified')} value={sec.electrified} />
              <FieldRow label={t('ground.maximumSpeed')} value={`${sec.maximum_speed_kmph} kmph`} />
              <FieldRow label={t('ground.length')} value={`${sec.section_length_km} km`} />
            </div>

            <div className="space-y-4">
              {traffic ? (
                <div className="border border-ws-rule bg-ws-surface">
                  <div className="px-3 py-2 bg-ws-tick border-b border-ws-rule">
                    <span className="font-display text-[11px] font-semibold uppercase tracking-wide text-ws-light">{t('ground.trafficProfile')}</span>
                    <span className="font-mono text-[10px] text-ws-light block mt-0.5">section_traffic.json · {traffic.date}</span>
                  </div>
                  <FieldRow label={t('ground.passengerServices')} value={traffic.passenger_trains} />
                  <FieldRow label={t('ground.freightServices')} value={traffic.expected_freight_trains ?? traffic.freight_trains} />
                  <FieldRow label={t('ground.busiestHour')} value={traffic.busiest_hour} tone="text-ws-warn font-bold" />
                  <FieldRow label={t('ground.peakLoad')} value={`${traffic.peak_passenger_load_percent}%`} />
                  <FieldRow label={t('ground.blockWindowsAvailable')} value={`${traffic.available_block_windows} / ${traffic.total_block_windows}`} tone="text-ws-ok font-bold" />
                </div>
              ) : (
                <div className="border border-ws-rule bg-ws-surface">
                  <div className="px-3 py-2 bg-ws-tick border-b border-ws-rule">
                    <span className="font-display text-[11px] font-semibold uppercase tracking-wide text-ws-light">{t('ground.trafficProfile')}</span>
                  </div>
                  <div className="px-4 py-6 text-center font-ws text-xs text-ws-mid">{t('ground.noTrafficProfile')}</div>
                </div>
              )}

              <div className="border border-ws-rule bg-ws-surface">
                <div className="px-3 py-2 bg-ws-tick border-b border-ws-rule">
                  <span className="font-display text-[11px] font-semibold uppercase tracking-wide text-ws-light">{t('ground.recordedMovements')}</span>
                  <span className="font-mono text-[10px] text-ws-light block mt-0.5">{t('ground.projectedFrom')}</span>
                </div>
                {trainDates.length === 0 ? (
                  <div className="px-4 py-6 text-center font-ws text-xs text-ws-mid">{t('ground.noTrainForSection')}</div>
                ) : (
                  <div>
                    {trainDates.map((d) => {
                      const trains = sectionTrains.sections[sectionId][d];
                      return (
                        <div key={d} className="px-3 py-2 border-b border-ws-hairline last:border-b-0">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] text-ws-ink">{d}</span>
                            <span className="font-mono text-[10px] text-ws-light">
                              {trains.length === 1 ? t('ground.movementCount', { count: trains.length }) : t('ground.movementCountPlural', { count: trains.length })}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {trains.map((tr) => (
                              <span key={`${tr.train_id}-${tr.arrival_minute}`} className="font-mono text-[9px] px-1 py-0.5 bg-ws-tick border border-ws-hairline text-ws-body">
                                {minToHhmm(tr.arrival_minute)}–{minToHhmm(tr.departure_minute)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border border-ws-rule bg-ws-surface">
            <div className="px-3 py-2 bg-ws-tick border-b border-ws-rule">
              <span className="font-display text-[11px] font-semibold uppercase tracking-wide text-ws-light">{t('ground.gapsTitle')}</span>
              <span className="font-mono text-[10px] text-ws-light block mt-0.5">{t('ground.gapsScope')}</span>
            </div>
            {[
              [t('ground.gapGradient'), t('ground.gapNoColumn')],
              [t('ground.gapCrossings'), t('ground.gapNoColumn')],
              [t('ground.gapAccess'), t('ground.gapNoColumn')],
              [t('ground.gapEarthing'), t('ground.gapNoColumn')],
            ].map(([label, reason]) => (
              <div key={label} className="px-3 py-2.5 border-b border-ws-hairline last:border-b-0 flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block font-ws text-xs font-medium text-ws-idle">{label}</span>
                  <span className="block font-ws text-[10px] text-ws-light mt-0.5">{reason}</span>
                </span>
                <span className="font-display text-[10px] font-semibold uppercase tracking-wide text-ws-idle shrink-0">Not available</span>
              </div>
            ))}
          </div>

          <AdvisoryNote tone="idle" title={t('ground.referenceTitle')}>{t('ground.referenceBody')}</AdvisoryNote>
        </>
      )}
    </div>
  );
};
