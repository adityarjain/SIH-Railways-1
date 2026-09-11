import React from 'react';
import { Train, Package, ShieldCheck, Gauge, CheckCircle2 } from 'lucide-react';
import { Badge } from '../common/Badge';
import sectionTraffic from '../../data/section_traffic.json';

/**
 * Operational traffic for one section, counted from trains.csv, goods_forecast.csv
 * and blocks.csv (scripts/generate_tasks_inventory.py).
 *
 * Every tile used to be a fixed literal that did not change with the section.
 * The "optimal window" below is the quietest run of block windows on the day,
 * derived from actual passenger movements rather than asserted.
 */
export const TrafficContext = ({ sectionId = 'SEC-0004' }) => {
  const t = sectionTraffic[sectionId];

  if (!t) {
    return (
      <div className="bg-surface-panel rounded-lg border border-line p-4  text-xs text-rail-500">
        No traffic data generated for {sectionId}.
      </div>
    );
  }

  const passengerBand = t.passenger_trains >= 12 ? 'HIGH' : t.passenger_trains >= 6 ? 'MODERATE' : 'LOW';
  const passengerLabel = passengerBand === 'HIGH' ? 'Busy' : passengerBand === 'MODERATE' ? 'Moderate' : 'Light';
  const freightBand = (t.freight_demand_index ?? 0) >= 75 ? 'HIGH' : 'LOW';

  return (
    <div className="bg-surface-panel rounded-lg border border-line p-4  space-y-3">
      <div className="flex items-center justify-between border-b border-line-subtle pb-2.5 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Gauge size={16} className="text-status-info" />
          <h4 className="text-xs font-bold text-rail-900 uppercase tracking-wider">
            Operational Traffic Context — {sectionId}
          </h4>
        </div>
        <span className="text-[11px] text-rail-500 font-mono">
          {t.date} · synthetic dataset
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-surface-sunken border border-line/80 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-rail-500">
            <span className="flex items-center gap-1 font-semibold uppercase">
              <Train size={12} className="text-status-info" />
              Passenger Traffic
            </span>
            <Badge variant={passengerBand} size="sm">{passengerLabel}</Badge>
          </div>
          <div className="text-base font-bold text-rail-900 font-mono mt-1">
            {t.passenger_trains} trains
          </div>
          <p className="text-[10px] text-rail-500">
            {t.busiest_hour !== null
              ? `Busiest hour ${String(t.busiest_hour).padStart(2, '0')}:00 · peak load ${t.peak_passenger_load_percent}%`
              : 'No passenger movements recorded'}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-surface-sunken border border-line/80 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-rail-500">
            <span className="flex items-center gap-1 font-semibold uppercase">
              <Package size={12} className="text-status-warn" />
              Goods Forecast
            </span>
            <Badge variant={freightBand} size="sm">
              {freightBand === 'HIGH' ? 'Elevated' : 'Normal'}
            </Badge>
          </div>
          <div className="text-base font-bold text-rail-900 font-mono mt-1">
            {t.expected_freight_trains ?? '—'} paths
          </div>
          <p className="text-[10px] text-rail-500">
            {t.freight_demand_index != null
              ? `Corridor demand index ${t.freight_demand_index}`
              : 'No corridor forecast for this date'}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-surface-sunken border border-line/80 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-rail-500">
            <span className="flex items-center gap-1 font-semibold uppercase">
              <ShieldCheck size={12} className="text-status-ok" />
              Track Status
            </span>
            <Badge variant={t.available_block_windows > 0 ? 'success' : 'CRITICAL'} size="sm">
              {t.available_block_windows > 0 ? 'Available' : 'Blocked'}
            </Badge>
          </div>
          <div className="text-base font-bold text-rail-900 font-mono mt-1">
            {t.available_block_windows}/{t.total_block_windows} windows
          </div>
          <p className="text-[10px] text-rail-500">
            Up to {t.max_simultaneous_tasks} simultaneous tasks per possession
          </p>
        </div>

        <div className="p-3 rounded-lg bg-status-ok-tint border border-status-ok space-y-1">
          <div className="flex items-center justify-between text-[11px] text-status-ok">
            <span className="flex items-center gap-1 font-bold uppercase">
              <CheckCircle2 size={12} className="text-status-ok" />
              Section Profile
            </span>
            <span className="text-[10px] bg-status-ok/70 text-status-ok px-1.5 py-0.5 rounded font-bold">
              Physical
            </span>
          </div>
          <div className="text-sm font-bold text-status-ok font-mono mt-1">
            {t.section_length_km != null ? `${t.section_length_km} km` : '—'}
          </div>
          <p className="text-[10px] text-status-ok">
            {t.maximum_speed_kmph != null
              ? `Line speed ${t.maximum_speed_kmph} km/h — used for reroute delay`
              : 'Line speed unavailable'}
          </p>
        </div>
      </div>
    </div>
  );
};
