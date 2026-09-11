import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import {
  Panel, PanelHeader, PanelBody, Select, Metric, MetricRow,
  EmptyState, NotAvailable, Alert,
} from '../../components/ui';
import { minToHhmm } from '../../utils/time';
import corridors from '../../data/corridors_sections.json';
import sectionTraffic from '../../data/section_traffic.json';
import sectionTrains from '../../data/section_trains.json';

const SECTION = Object.fromEntries(corridors.sections.map((s) => [s.section_id, s]));

/**
 * Reference detail for the sections this crew works. Every field is a column in
 * corridors_sections.csv or a projected train record — nothing is characterised
 * or advised.
 */
export const SectionInfo = () => {
  const { tasksInventory } = usePlan();
  const { selectedDept } = useAuth();
  const { t: tx } = useI18n();

  const mySections = useMemo(() => {
    const ids = [...new Set(
      tasksInventory.filter((t) => t.department === selectedDept).map((t) => t.section_id),
    )].sort();
    return ids;
  }, [tasksInventory, selectedDept]);

  const [sectionId, setSectionId] = useState(() => mySections[0] || 'SEC-0004');
  const sec = SECTION[sectionId];
  const traffic = sectionTraffic[sectionId];
  const trainDates = Object.keys(sectionTrains.sections?.[sectionId] || {}).sort();

  const tasksHere = useMemo(
    () => tasksInventory.filter((t) => t.section_id === sectionId && t.department === selectedDept),
    [tasksInventory, sectionId, selectedDept],
  );

  if (mySections.length === 0) {
    return (
      <Panel>
        <PanelHeader title={tx('ground.sectionInfoTitle')} scope={selectedDept} />
        <EmptyState title={tx('ground.noSectionAssigned')} />
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="t-section-title">{tx('ground.sectionInfoTitle')}</h2>
          <p className="text-xs text-rail-500 mt-0.5">
            {tx('ground.sectionInfoSubtitle')}
          </p>
        </div>
        <Select label={tx('common.section')} value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
          {mySections.map((id) => (
            <option key={id} value={id}>{id} — {SECTION[id]?.section_name || ''}</option>
          ))}
        </Select>
      </div>

      {!sec ? (
        <EmptyState title={tx('ground.sectionNotPresent')} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Panel><PanelBody><Metric label={tx('ground.lineSpeed')} value={`${sec.maximum_speed_kmph}`} sub="kmph · maximum_speed_kmph" /></PanelBody></Panel>
            <Panel><PanelBody><Metric label={tx('ground.length')} value={`${sec.section_length_km}`} sub="km · section_length_km" /></PanelBody></Panel>
            <Panel><PanelBody><Metric label={tx('ground.electrified')} value={sec.electrified} sub="electrified" mono={false} /></PanelBody></Panel>
            <Panel><PanelBody><Metric label={tx('ground.yourTasksHere')} value={tasksHere.length} scope={selectedDept} /></PanelBody></Panel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel>
              <PanelHeader title={tx('ground.sectionRecord')} scope="corridors_sections.csv" />
              <MetricRow label={tx('common.section')} value={sec.section_id} sub={sec.section_name} />
              <MetricRow label={tx('common.corridor')} value={sec.corridor_id} sub={sec.corridor_name} />
              <MetricRow label={tx('ground.region')} value={sec.region} />
              <MetricRow label={tx('ground.trackType')} value={sec.track_type} />
              <MetricRow label={tx('ground.electrified')} value={sec.electrified} />
              <MetricRow label={tx('ground.maximumSpeed')} value={`${sec.maximum_speed_kmph} kmph`} />
              <MetricRow label={tx('ground.length')} value={`${sec.section_length_km} km`} />
            </Panel>

            <div className="space-y-4">
              {traffic ? (
                <Panel>
                  <PanelHeader title={tx('ground.trafficProfile')} scope={`section_traffic.json · ${traffic.date}`} />
                  <MetricRow label={tx('ground.passengerServices')} value={traffic.passenger_trains} />
                  <MetricRow label={tx('ground.freightServices')} value={traffic.expected_freight_trains ?? traffic.freight_trains} />
                  <MetricRow label={tx('ground.busiestHour')} value={traffic.busiest_hour} tone="warn" />
                  <MetricRow label={tx('ground.peakLoad')} value={`${traffic.peak_passenger_load_percent}%`} />
                  <MetricRow
                    label={tx('ground.blockWindowsAvailable')}
                    value={`${traffic.available_block_windows} / ${traffic.total_block_windows}`}
                    tone="ok"
                  />
                </Panel>
              ) : (
                <Panel>
                  <PanelHeader title={tx('ground.trafficProfile')} />
                  <EmptyState title={tx('ground.noTrafficProfile')} />
                </Panel>
              )}

              <Panel>
                <PanelHeader title={tx('ground.recordedMovements')} scope={tx('ground.projectedFrom')} />
                {trainDates.length === 0 ? (
                  <EmptyState title={tx('ground.noTrainForSection')} />
                ) : (
                  <div className="divide-y divide-line-subtle">
                    {trainDates.map((d) => {
                      const trains = sectionTrains.sections[sectionId][d];
                      return (
                        <div key={d} className="px-3 py-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] text-rail-900">{d}</span>
                            <span className="font-mono text-[10px] text-rail-400">
                              {trains.length === 1
                                ? tx('ground.movementCount', { count: trains.length })
                                : tx('ground.movementCountPlural', { count: trains.length })}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {trains.map((t) => (
                              <span key={`${t.train_id}-${t.arrival_minute}`} className="font-mono text-[9px] px-1 py-0.5 bg-surface-sunken border border-line text-rail-600">
                                {minToHhmm(t.arrival_minute)}–{minToHhmm(t.departure_minute)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Panel>
            </div>
          </div>

          <Panel>
            <PanelHeader title={tx('ground.gapsTitle')} scope={tx('ground.gapsScope')} />
            <NotAvailable label={tx('ground.gapGradient')} reason={tx('ground.gapNoColumn')} />
            <NotAvailable label={tx('ground.gapCrossings')} reason={tx('ground.gapNoColumn')} />
            <NotAvailable label={tx('ground.gapAccess')} reason={tx('ground.gapNoColumn')} />
            <NotAvailable label={tx('ground.gapEarthing')} reason={tx('ground.gapNoColumn')} />
          </Panel>

          <Alert tone="idle" title={tx('ground.referenceTitle')}>
            {tx('ground.referenceBody')}
          </Alert>
        </>
      )}
    </div>
  );
};
