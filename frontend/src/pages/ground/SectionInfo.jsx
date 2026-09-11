import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
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
        <PanelHeader title="Section information" scope={selectedDept} />
        <EmptyState title="No section is assigned to your department yet." />
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="t-section-title">Section Information</h2>
          <p className="text-xs text-rail-500 mt-0.5">
            Reference detail for the sections your department works.
          </p>
        </div>
        <Select label="Section" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
          {mySections.map((id) => (
            <option key={id} value={id}>{id} — {SECTION[id]?.section_name || ''}</option>
          ))}
        </Select>
      </div>

      {!sec ? (
        <EmptyState title="This section is not present in corridors_sections.csv." />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Panel><PanelBody><Metric label="Line speed" value={`${sec.maximum_speed_kmph}`} sub="kmph · maximum_speed_kmph" /></PanelBody></Panel>
            <Panel><PanelBody><Metric label="Length" value={`${sec.section_length_km}`} sub="km · section_length_km" /></PanelBody></Panel>
            <Panel><PanelBody><Metric label="Electrified" value={sec.electrified} sub="electrified" mono={false} /></PanelBody></Panel>
            <Panel><PanelBody><Metric label="Your tasks here" value={tasksHere.length} scope={selectedDept} /></PanelBody></Panel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel>
              <PanelHeader title="Section record" scope="corridors_sections.csv" />
              <MetricRow label="Section" value={sec.section_id} sub={sec.section_name} />
              <MetricRow label="Corridor" value={sec.corridor_id} sub={sec.corridor_name} />
              <MetricRow label="Region" value={sec.region} />
              <MetricRow label="Track type" value={sec.track_type} />
              <MetricRow label="Electrified" value={sec.electrified} />
              <MetricRow label="Maximum speed" value={`${sec.maximum_speed_kmph} kmph`} />
              <MetricRow label="Length" value={`${sec.section_length_km} km`} />
            </Panel>

            <div className="space-y-4">
              {traffic ? (
                <Panel>
                  <PanelHeader title="Traffic profile" scope={`section_traffic.json · ${traffic.date}`} />
                  <MetricRow label="Passenger services" value={traffic.passenger_trains} />
                  <MetricRow label="Freight services" value={traffic.expected_freight_trains ?? traffic.freight_trains} />
                  <MetricRow label="Busiest hour" value={traffic.busiest_hour} tone="warn" />
                  <MetricRow label="Peak passenger load" value={`${traffic.peak_passenger_load_percent}%`} />
                  <MetricRow
                    label="Block windows available"
                    value={`${traffic.available_block_windows} / ${traffic.total_block_windows}`}
                    tone="ok"
                  />
                </Panel>
              ) : (
                <Panel>
                  <PanelHeader title="Traffic profile" />
                  <EmptyState title="No aggregate traffic profile is published for this section." />
                </Panel>
              )}

              <Panel>
                <PanelHeader title="Recorded train movements" scope="Projected from trains.csv" />
                {trainDates.length === 0 ? (
                  <EmptyState title="No train timing records available for this section." />
                ) : (
                  <div className="divide-y divide-line-subtle">
                    {trainDates.map((d) => {
                      const trains = sectionTrains.sections[sectionId][d];
                      return (
                        <div key={d} className="px-3 py-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] text-rail-900">{d}</span>
                            <span className="font-mono text-[10px] text-rail-400">{trains.length} movements</span>
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
            <PanelHeader title="Operational information not available" scope="Absent from the current dataset" />
            <NotAvailable label="Gradient and curvature" reason="no source column in the dataset" />
            <NotAvailable label="Level crossings and structures" reason="no source column in the dataset" />
            <NotAvailable label="Access points and walking routes" reason="no source column in the dataset" />
            <NotAvailable label="Isolation and earthing arrangements" reason="no source column in the dataset" />
          </Panel>

          <Alert tone="idle" title="Reference only">
            These values describe the synthetic dataset's model of the section. They are not a
            substitute for the section's own operating documents.
          </Alert>
        </>
      )}
    </div>
  );
};
