import React from 'react';
import { Train, Package, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Pill } from '../ui/worksheet';
import sectionTraffic from '../../data/section_traffic.json';

/**
 * Operational traffic for one section, counted from trains.csv, goods_forecast.csv
 * and blocks.csv (scripts/generate_tasks_inventory.py). Body content only —
 * the Block Planning worksheet owns the numbered region header.
 */
export const TrafficContext = ({ sectionId = 'SEC-0004' }) => {
  const { t } = useI18n();
  const traffic = sectionTraffic[sectionId];

  if (!traffic) {
    return <div className="font-ws text-xs text-ws-mid">{t('trafficContext.noData', { section: sectionId })}</div>;
  }

  const passengerBand = traffic.passenger_trains >= 12 ? 'critical' : traffic.passenger_trains >= 6 ? 'warn' : 'ok';
  const passengerLabel = passengerBand === 'critical' ? t('trafficContext.busy') : passengerBand === 'warn' ? t('trafficContext.moderate') : t('trafficContext.light');
  const freightBand = (traffic.freight_demand_index ?? 0) >= 75 ? 'warn' : 'ok';

  const TILE = 'border border-ws-hairline bg-ws-dossier p-3 space-y-1';
  const TILE_LABEL = 'flex items-center justify-between text-[11px] text-ws-mid';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      <div className={TILE}>
        <div className={TILE_LABEL}>
          <span className="flex items-center gap-1 font-display font-semibold uppercase tracking-wide"><Train size={12} className="text-ws-info" />{t('trafficContext.passengerTraffic')}</span>
          <Pill tone={passengerBand} size="sm">{passengerLabel}</Pill>
        </div>
        <div className="font-mono text-base font-bold text-ws-ink mt-1">{t('trafficContext.trainsCount', { count: traffic.passenger_trains })}</div>
        <p className="font-ws text-[10px] text-ws-mid">
          {traffic.busiest_hour !== null
            ? t('trafficContext.busiestHour', { hour: String(traffic.busiest_hour).padStart(2, '0'), load: traffic.peak_passenger_load_percent })
            : t('trafficContext.noPassengerMovements')}
        </p>
      </div>

      <div className={TILE}>
        <div className={TILE_LABEL}>
          <span className="flex items-center gap-1 font-display font-semibold uppercase tracking-wide"><Package size={12} className="text-ws-warn" />{t('trafficContext.goodsForecast')}</span>
          <Pill tone={freightBand} size="sm">{freightBand === 'warn' ? t('trafficContext.elevated') : t('trafficContext.normal')}</Pill>
        </div>
        <div className="font-mono text-base font-bold text-ws-ink mt-1">{t('trafficContext.pathsCount', { count: traffic.expected_freight_trains ?? '—' })}</div>
        <p className="font-ws text-[10px] text-ws-mid">
          {traffic.freight_demand_index != null ? t('trafficContext.demandIndex', { index: traffic.freight_demand_index }) : t('trafficContext.noCorridorForecast')}
        </p>
      </div>

      <div className={TILE}>
        <div className={TILE_LABEL}>
          <span className="flex items-center gap-1 font-display font-semibold uppercase tracking-wide"><ShieldCheck size={12} className="text-ws-ok" />{t('trafficContext.trackStatus')}</span>
          <Pill tone={traffic.available_block_windows > 0 ? 'ok' : 'critical'} size="sm">
            {traffic.available_block_windows > 0 ? t('trafficContext.available') : t('trafficContext.blocked')}
          </Pill>
        </div>
        <div className="font-mono text-base font-bold text-ws-ink mt-1">{t('trafficContext.windowsCount', { available: traffic.available_block_windows, total: traffic.total_block_windows })}</div>
        <p className="font-ws text-[10px] text-ws-mid">{t('trafficContext.simultaneousTasks', { count: traffic.max_simultaneous_tasks })}</p>
      </div>

      <div className={`${TILE} bg-[#E1EDE6] border-ws-ok`}>
        <div className="flex items-center justify-between text-[11px] text-ws-ok">
          <span className="flex items-center gap-1 font-display font-bold uppercase tracking-wide"><CheckCircle2 size={12} />{t('trafficContext.sectionProfile')}</span>
          <Pill tone="ok" size="sm">{t('trafficContext.physical')}</Pill>
        </div>
        <div className="font-mono text-sm font-bold text-ws-ok mt-1">{traffic.section_length_km != null ? `${traffic.section_length_km} km` : '—'}</div>
        <p className="font-ws text-[10px] text-ws-ok">
          {traffic.maximum_speed_kmph != null ? t('trafficContext.lineSpeed', { speed: traffic.maximum_speed_kmph }) : t('trafficContext.lineSpeedUnavailable')}
        </p>
      </div>
    </div>
  );
};
