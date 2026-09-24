import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import { RegionHeader, WsSelect, Pill, FieldRow } from '../../components/ui/worksheet';
import { bandOf } from '../../utils/risk';
import { TODAY } from '../../utils/dateShift';
import corridorsSectionsData from '../../data/corridors_sections.json';
import { CITY_COORDS } from '../../data/cityCoordinates';

// Equirectangular projection over the corridors' bounding box, with the
// longitude scale corrected for ~22°N so distances are not stretched.
const BOUNDS = { lonMin: 71.5, lonMax: 89.5, latMin: 11.5, latMax: 31.5 };
const W = 560;
const H = Math.round(W * ((BOUNDS.latMax - BOUNDS.latMin) / ((BOUNDS.lonMax - BOUNDS.lonMin) * Math.cos((22 * Math.PI) / 180))));
const PAD = 28;
const project = ([lat, lon]) => [
  PAD + ((lon - BOUNDS.lonMin) / (BOUNDS.lonMax - BOUNDS.lonMin)) * (W - 2 * PAD),
  PAD + ((BOUNDS.latMax - lat) / (BOUNDS.latMax - BOUNDS.latMin)) * (H - 2 * PAD),
];

const SECTIONS_BY_ID = Object.fromEntries(corridorsSectionsData.sections.map((s) => [s.section_id, s]));

/** Each corridor as a line between its end cities, split into sections by length. */
const CORRIDORS = corridorsSectionsData.corridors.map((c) => {
  const [from, to] = c.corridor_name.split(/[–-]/).map((x) => x.trim());
  const a = project(CITY_COORDS[from]);
  const b = project(CITY_COORDS[to]);
  const secs = c.sections.map((id) => SECTIONS_BY_ID[id]).filter(Boolean);
  const total = secs.reduce((n, s) => n + s.section_length_km, 0) || 1;
  let run = 0;
  const segments = secs.map((s) => {
    const t0 = run / total;
    run += s.section_length_km;
    const t1 = run / total;
    return {
      ...s,
      x1: a[0] + (b[0] - a[0]) * t0, y1: a[1] + (b[1] - a[1]) * t0,
      x2: a[0] + (b[0] - a[0]) * t1, y2: a[1] + (b[1] - a[1]) * t1,
    };
  });
  return { ...c, from, to, a, b, segments, km: Math.round(total) };
});

const CITIES = [...new Set(CORRIDORS.flatMap((c) => [c.from, c.to]))].map((name) => ({ name, xy: project(CITY_COORDS[name]) }));

const STATE_STROKE = { critical: '#B22A22', work: '#1B4C8C', none: '#D7D0C2' };

/**
 * Network map. Real city positions, straight-line corridors, section lengths
 * from the dataset, coloured by the possessions planned on the chosen date.
 */
export const NetworkMap = ({ onNavigate }) => {
  const { scheduledTasks } = usePlan();
  const { t } = useI18n();

  const dates = useMemo(() => [...new Set(scheduledTasks.map((tk) => tk.date))].sort(), [scheduledTasks]);
  const [date, setDate] = useState(dates.includes(TODAY) ? TODAY : dates[0]);
  const [selected, setSelected] = useState(null);

  // Section -> worst state of the possessions on this date.
  const sectionState = useMemo(() => {
    const m = {};
    for (const tk of scheduledTasks) {
      if (tk.date !== date) continue;
      const crit = bandOf(tk) === 'CRITICAL';
      const cur = m[tk.section_id] || { state: 'work', count: 0 };
      m[tk.section_id] = { state: crit || cur.state === 'critical' ? 'critical' : 'work', count: cur.count + 1 };
    }
    return m;
  }, [scheduledTasks, date]);

  const corridor = CORRIDORS.find((c) => c.corridor_id === selected);
  const worked = Object.keys(sectionState).length;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-px bg-ws-rule border-b border-ws-rule">
      <div className="bg-ws-surface px-3.5 md:px-4 xl:px-5 pt-4 pb-4 min-w-0">
        <RegionHeader number="01" title={t('map.title')} meta={t('map.meta', { corridors: CORRIDORS.length, sections: corridorsSectionsData.sections.length })} />
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <WsSelect value={date} onChange={(e) => setDate(e.target.value)} aria-label={t('map.date')}>
            {dates.map((d) => <option key={d} value={d}>{d}</option>)}
          </WsSelect>
          <span className="font-mono text-[11px] text-ws-mid">{t('map.worked', { count: worked })}</span>
          <span className="flex-1" />
          {[['critical', t('map.legendCritical')], ['work', t('map.legendWork')], ['none', t('map.legendNone')]].map(([k, label]) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-[12px] text-ws-mid">
              <span className="inline-block w-5 h-[4px]" style={{ background: STATE_STROKE[k] }} />{label}
            </span>
          ))}
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[420px] max-w-[760px] mx-auto block" role="img" aria-label={t('map.aria')}>
            {/* 5° graticule, the only frame: no borders are drawn. */}
            {[75, 80, 85].map((lon) => {
              const [x] = project([0, lon]);
              return <line key={lon} x1={x} x2={x} y1={PAD / 2} y2={H - PAD / 2} stroke="#EFEAE0" strokeWidth="1" />;
            })}
            {[15, 20, 25, 30].map((lat) => {
              const [, y] = project([lat, 0]);
              return (
                <g key={lat}>
                  <line x1={PAD / 2} x2={W - PAD / 2} y1={y} y2={y} stroke="#EFEAE0" strokeWidth="1" />
                  <text x={4} y={y - 3} fontSize="9" fill="#7A7263" fontFamily="JetBrains Mono, monospace">{lat}°N</text>
                </g>
              );
            })}

            {CORRIDORS.map((c) => {
              const on = c.corridor_id === selected;
              return (
                <g
                  key={c.corridor_id}
                  className="cursor-pointer"
                  onClick={() => setSelected(on ? null : c.corridor_id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(on ? null : c.corridor_id); } }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={on}
                  aria-label={`${c.corridor_id} ${c.corridor_name}`}
                >
                  {/* wide transparent hit area */}
                  <line x1={c.a[0]} y1={c.a[1]} x2={c.b[0]} y2={c.b[1]} stroke="transparent" strokeWidth="14" />
                  {on && <line x1={c.a[0]} y1={c.a[1]} x2={c.b[0]} y2={c.b[1]} stroke="#1F1C17" strokeWidth="9" strokeLinecap="round" />}
                  {c.segments.map((s) => {
                    const st = sectionState[s.section_id]?.state || 'none';
                    return (
                      <line
                        key={s.section_id}
                        x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
                        stroke={STATE_STROKE[st]} strokeWidth={st === 'none' ? 4 : 5}
                      >
                        <title>{`${s.section_id} · ${s.section_name} · ${s.section_length_km} km${sectionState[s.section_id] ? ` · ${sectionState[s.section_id].count} possession(s)` : ''}`}</title>
                      </line>
                    );
                  })}
                </g>
              );
            })}

            {CITIES.map(({ name, xy }) => (
              <g key={name} pointerEvents="none">
                <circle cx={xy[0]} cy={xy[1]} r="3.5" fill="#FFFFFF" stroke="#1F1C17" strokeWidth="1.5" />
                <text
                  x={xy[0] + 6}
                  y={xy[1] + (name === 'Howrah' || name === 'Secunderabad' || name === 'Cuttack' ? 11 : -5)}
                  fontSize="10"
                  fill="#3C372E"
                  fontFamily="Barlow, sans-serif"
                >
                  {name}
                </text>
              </g>
            ))}
          </svg>
        </div>
        <p className="text-[12px] text-ws-mid mt-2 max-w-3xl">{t('map.caveat')}</p>
      </div>

      <div className="bg-ws-surface px-3.5 md:px-4 xl:px-5 pt-4 pb-4 min-w-0">
        <RegionHeader number="02" title={corridor ? `${corridor.corridor_id} ${corridor.corridor_name}` : t('map.corridors')} meta={corridor ? `${corridor.km} km` : date} />
        {!corridor ? (
          <div className="border-t border-ws-rule">
            {CORRIDORS.map((c) => {
              const n = c.segments.filter((s) => sectionState[s.section_id]).length;
              const crit = c.segments.some((s) => sectionState[s.section_id]?.state === 'critical');
              return (
                <button
                  key={c.corridor_id}
                  type="button"
                  onClick={() => setSelected(c.corridor_id)}
                  className="grid grid-cols-[64px_minmax(0,1fr)_auto] gap-2 items-center w-full text-left px-1 py-1.5 border-b border-ws-hairline hover:bg-ws-paper"
                >
                  <span className="font-mono text-[11px] text-ws-ink">{c.corridor_id}</span>
                  <span className="text-[12px] text-ws-mid overflow-hidden text-ellipsis whitespace-nowrap">{c.corridor_name}</span>
                  <span className={`font-mono text-[10px] ${crit ? 'text-ws-critical font-bold' : 'text-ws-mid'}`}>{n}/{c.segments.length}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <div className="border-t border-ws-rule">
              {corridor.segments.map((s) => {
                const st = sectionState[s.section_id];
                return (
                  <FieldRow
                    key={s.section_id}
                    label={`${s.section_id} · ${s.section_length_km} km`}
                    value={st ? `${st.count} · ${st.state === 'critical' ? t('map.legendCritical') : t('map.legendWork')}` : '—'}
                    tone={st?.state === 'critical' ? 'text-ws-critical' : st ? 'text-ws-info' : 'text-ws-light'}
                  />
                );
              })}
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              <button type="button" onClick={() => setSelected(null)} className="font-display text-[12px] font-bold uppercase tracking-[0.08em] text-ws-mid hover:text-ws-ink">
                ← {t('map.allCorridors')}
              </button>
              <span className="flex-1" />
              <Pill tone="idle" size="sm">{corridor.region}</Pill>
            </div>
            {onNavigate && (
              <button type="button" onClick={() => onNavigate('block-planning')} className="mt-3 font-display text-[12px] font-bold uppercase tracking-[0.08em] text-ws-ink underline underline-offset-4">
                {t('map.openPlanning')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
