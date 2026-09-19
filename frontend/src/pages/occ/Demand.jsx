import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import { RegionHeader, StatFigure, Pill, AdvisoryNote, WsInput, WsSelect, SegmentedControl } from '../../components/ui/worksheet';
import { Drawer } from '../../components/common/Drawer';
import { Button, ProvenanceNote } from '../../components/ui';
import { minToHhmm } from '../../utils/time';
import { bandOf, bandTone, RISK_BANDS } from '../../utils/risk';

const DEPT_ALL = 'ALL';
const BAND_TONE_WS = { CRITICAL: 'text-ws-critical', HIGH: 'text-ws-warn', MODERATE: 'text-ws-info', LOW: 'text-ws-ok' };
const PILL_TONE_MAP = { critical: 'critical', warn: 'warn', info: 'info', ok: 'ok', idle: 'idle' };

/**
 * Authority — Risk & Tasks.
 *
 * The maintenance demand queue and the asset risk behind it. Two views over the
 * same inventory: task-centric for planning, asset-centric for risk.
 */
export const Demand = ({ onNavigate }) => {
  const { tasksInventory, baselineMetrics } = usePlan();
  const { t, isHindi } = useI18n();
  const [tab, setTab] = useState('tasks');
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState(DEPT_ALL);
  const [risk, setRisk] = useState(DEPT_ALL);
  const [status, setStatus] = useState(DEPT_ALL);
  const [selected, setSelected] = useState(null);

  const departments = useMemo(
    () => [...new Set(tasksInventory.map((tk) => tk.department))].filter(Boolean).sort(),
    [tasksInventory],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasksInventory.filter((tk) => {
      if (dept !== DEPT_ALL && tk.department !== dept) return false;
      if (risk !== DEPT_ALL && bandOf(tk) !== risk) return false;
      if (status !== DEPT_ALL && tk.status !== status) return false;
      if (!q) return true;
      return (
        tk.task_id.toLowerCase().includes(q) ||
        (tk.asset_id || '').toLowerCase().includes(q) ||
        (tk.section_id || '').toLowerCase().includes(q) ||
        (tk.maintenance_type || '').toLowerCase().includes(q) ||
        (tk.asset_type || '').toLowerCase().includes(q)
      );
    });
  }, [tasksInventory, query, dept, risk, status]);

  const bandCounts = useMemo(() => {
    const c = { CRITICAL: 0, HIGH: 0, MODERATE: 0, LOW: 0 };
    for (const tk of filtered) {
      const b = bandOf(tk);
      if (b && c[b] != null) c[b] += 1;
    }
    return c;
  }, [filtered]);

  const statuses = useMemo(
    () => [...new Set(tasksInventory.map((tk) => tk.status).filter(Boolean))].sort(),
    [tasksInventory],
  );

  const clearable = query || dept !== DEPT_ALL || risk !== DEPT_ALL || status !== DEPT_ALL;
  const clear = () => { setQuery(''); setDept(DEPT_ALL); setRisk(DEPT_ALL); setStatus(DEPT_ALL); };

  return (
    <div className="bg-ws-band min-h-full">
      <div className="bg-ws-paper border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-2.5 flex items-center justify-between gap-4 flex-wrap">
        <p className="font-ws text-xs text-ws-mid max-w-3xl leading-relaxed flex-1 min-w-[240px]">{t('demand.subtitle')}</p>
        <span className="font-mono text-[10px] text-ws-light shrink-0">
          {filtered.length} {t('common.of')} {tasksInventory.length} · {baselineMetrics.summary.total_tasks_considered.toLocaleString()}-task inventory
        </span>
      </div>

      {/* 01 — risk snapshot */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
        <RegionHeader number="01" title={t('demand.title')} meta={t('demand.currentFilter')} isHindi={isHindi} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-3.5 border-t border-ws-rule pt-3">
          {RISK_BANDS.map((band) => (
            <StatFigure key={band} value={bandCounts[band]} label={`${t(`risk.${band.toLowerCase()}`)} ${t('common.risk').toLowerCase()}`} tone={BAND_TONE_WS[band]} />
          ))}
        </div>
      </div>

      {/* 02 — task queue / asset risk */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-3.5">
        <RegionHeader number="02" title={t(tab === 'tasks' ? 'demand.tabTasks' : 'demand.tabAssets')} isHindi={isHindi} />
        <div className="flex flex-wrap items-center gap-2.5">
          <SegmentedControl
            options={[{ id: 'tasks', label: t('demand.tabTasks') }, { id: 'assets', label: t('demand.tabAssets') }]}
            value={tab}
            onChange={setTab}
            isHindi={isHindi}
            size="sm"
          />
          <WsInput placeholder={t('demand.searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-[220px] flex-1" />
          <WsSelect value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value={DEPT_ALL}>{t('common.allDepartments')}</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </WsSelect>
          <WsSelect value={risk} onChange={(e) => setRisk(e.target.value)}>
            <option value={DEPT_ALL}>{t('common.allRiskLevels')}</option>
            <option value="CRITICAL">{t('risk.critical')} (≥ 80)</option>
            <option value="HIGH">{t('risk.high')} (60–79)</option>
            <option value="MODERATE">{t('risk.moderate')} (40–59)</option>
            <option value="LOW">{t('risk.low')} (&lt; 40)</option>
          </WsSelect>
          <WsSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value={DEPT_ALL}>{t('common.allStatuses')}</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </WsSelect>
          {clearable && (
            <button onClick={clear} className="font-display text-[11px] font-bold text-ws-mid hover:text-ws-ink px-2 py-1.5">
              {t('common.clear')}
            </button>
          )}
        </div>
      </div>

      <div className="bg-ws-surface border-b border-ws-rule overflow-x-auto custom-scrollbar">
        {tab === 'tasks' ? (
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="border-b border-ws-rule bg-ws-tick">
              <tr>
                {[t('common.task'), t('common.type'), t('common.department'), t('common.section'), t('common.earliest'), t('common.deadline'), t('common.risk'), t('common.priority'), t('common.duration'), t('common.status')].map((h, i) => (
                  <th key={h} className={`px-3.5 py-2 font-display text-[10px] font-semibold text-ws-light whitespace-nowrap ${i >= 6 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-3.5 py-8 text-center font-ws text-xs text-ws-mid">{t('demand.noTaskMatch')}</td></tr>
              )}
              {filtered.map((tk) => {
                const b = bandOf(tk);
                return (
                  <tr key={tk.task_id} onClick={() => setSelected(tk)} className="border-b border-ws-hairline last:border-b-0 hover:bg-ws-paper cursor-pointer">
                    <td className="px-3.5 py-1.5 font-mono text-[11px] font-medium text-ws-ink whitespace-nowrap">{tk.task_id}</td>
                    <td className="px-3.5 py-1.5 font-ws text-[11px] text-ws-body whitespace-nowrap">{tk.maintenance_type}</td>
                    <td className="px-3.5 py-1.5 font-ws text-[11px] text-ws-mid whitespace-nowrap">{tk.department}</td>
                    <td className="px-3.5 py-1.5 font-mono text-[11px] text-ws-body whitespace-nowrap">{tk.section_id}</td>
                    <td className="px-3.5 py-1.5 font-mono text-[11px] text-ws-body whitespace-nowrap">{tk.task_date}</td>
                    <td className="px-3.5 py-1.5 font-mono text-[11px] text-ws-body whitespace-nowrap">{tk.deadline}</td>
                    <td className="px-3.5 py-1.5 text-right whitespace-nowrap"><Pill tone={PILL_TONE_MAP[bandTone(b)] || 'idle'} size="sm">{tk.risk_score?.toFixed?.(1) ?? '—'}</Pill></td>
                    <td className="px-3.5 py-1.5 font-mono text-[11px] text-ws-body text-right whitespace-nowrap">{tk.priority_score?.toFixed?.(1) ?? '—'}</td>
                    <td className="px-3.5 py-1.5 font-mono text-[11px] text-ws-body text-right whitespace-nowrap">{tk.required_duration_minutes}m</td>
                    <td className="px-3.5 py-1.5 text-right whitespace-nowrap">
                      <Pill tone={tk.status === 'Scheduled' ? 'info' : tk.status === 'Completed' ? 'ok' : 'idle'} size="sm">{tk.status || '—'}</Pill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="border-b border-ws-rule bg-ws-tick">
              <tr>
                {[t('demand.colAsset'), t('common.section'), t('common.department'), t('demand.colRiskScore'), t('common.risk'), t('demand.colFailure30'), t('demand.colDegradation'), t('demand.band')].map((h, i) => (
                  <th key={h} className={`px-3.5 py-2 font-display text-[10px] font-semibold text-ws-light whitespace-nowrap ${i >= 3 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-3.5 py-8 text-center font-ws text-xs text-ws-mid">{t('demand.noAssetMatch')}</td></tr>
              )}
              {filtered.map((tk) => {
                const v = Math.min(tk.risk_score ?? 0, 100);
                const b = bandOf(tk);
                const bg = b === 'CRITICAL' ? 'bg-ws-critical' : b === 'HIGH' ? 'bg-ws-warn' : b === 'MODERATE' ? 'bg-ws-info' : 'bg-ws-ok';
                return (
                  <tr key={`${tk.asset_id}-${tk.task_id}`} onClick={() => setSelected(tk)} className="border-b border-ws-hairline last:border-b-0 hover:bg-ws-paper cursor-pointer">
                    <td className="px-3.5 py-1.5 whitespace-nowrap">
                      <div className="font-mono text-[11px] font-medium text-ws-ink">{tk.asset_id}</div>
                      <div className="font-ws text-[10px] text-ws-light">{tk.asset_type || '—'}</div>
                    </td>
                    <td className="px-3.5 py-1.5 font-mono text-[11px] text-ws-body whitespace-nowrap">{tk.section_id}</td>
                    <td className="px-3.5 py-1.5 font-ws text-[11px] text-ws-mid whitespace-nowrap">{tk.department}</td>
                    <td className="px-3.5 py-1.5 font-mono text-[11px] font-semibold text-ws-ink text-right whitespace-nowrap">{tk.risk_score?.toFixed?.(1) ?? '—'}</td>
                    <td className="px-3.5 py-1.5 whitespace-nowrap">
                      <span className="block w-28 h-2.5 bg-ws-tick border border-ws-hairline relative ml-auto">
                        <span className={`absolute inset-y-0 left-0 ${bg}`} style={{ width: `${v}%` }} />
                      </span>
                    </td>
                    <td className="px-3.5 py-1.5 font-mono text-[11px] text-ws-body text-right whitespace-nowrap">{tk.failure_probability_30d != null ? `${(tk.failure_probability_30d * 100).toFixed(2)}%` : '—'}</td>
                    <td className="px-3.5 py-1.5 font-mono text-[11px] text-ws-body text-right whitespace-nowrap">{tk.forecast_30d_degradation != null ? tk.forecast_30d_degradation.toFixed(1) : t('demand.notAvailable')}</td>
                    <td className="px-3.5 py-1.5 text-right whitespace-nowrap"><Pill tone={PILL_TONE_MAP[bandTone(b)] || 'idle'} size="sm">{b || '—'}</Pill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-3.5">
        <AdvisoryNote tone="idle" title={t('demand.sampleTitle')}>
          {t('demand.sampleBody', { shown: tasksInventory.length, full: baselineMetrics.summary.total_tasks_considered.toLocaleString() })}
        </AdvisoryNote>
      </div>

      {/* task / asset detail */}
      <Drawer
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.task_id} — ${selected.maintenance_type}` : ''}
        subtitle={selected ? `Asset ${selected.asset_id} · ${selected.section_id}` : ''}
      >
        {selected && (
          <>
            {selected.status === 'Scheduled' && (
              <Button variant="secondary" onClick={() => { setSelected(null); if (onNavigate) onNavigate('block-planning'); }}>
                {t('demand.viewInPlanner')}
              </Button>
            )}

            <div className="bg-ws-ink text-white p-4 border border-ws-body space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display text-[11px] font-semibold text-ws-light">{t('demand.predictedRisk')}</span>
                <Pill tone={PILL_TONE_MAP[bandTone(bandOf(selected))] || 'idle'}>{bandOf(selected) || '—'}</Pill>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-ws-body border border-ws-body">
                {[
                  [t('demand.colRiskScore'), selected.risk_score != null ? selected.risk_score.toFixed(1) : '—', t('demand.riskOf100')],
                  [t('demand.colFailure30'), selected.failure_probability_30d != null ? `${(selected.failure_probability_30d * 100).toFixed(2)}%` : '—', null],
                  [t('demand.colDegradation'), selected.forecast_30d_degradation != null ? selected.forecast_30d_degradation.toFixed(1) : t('demand.notAvailable'), null],
                ].map(([k, v, sub]) => (
                  <div key={k} className="bg-ws-ink p-2.5">
                    <span className="font-display text-[9px] text-ws-light block">{k}</span>
                    <span className="font-mono text-lg font-semibold text-white">{v}</span>
                    {sub && <span className="font-ws text-[9px] text-ws-light block mt-0.5">{sub}</span>}
                  </div>
                ))}
              </div>
              <p className="font-ws text-[10px] text-ws-light leading-relaxed">{t('demand.modelNote')}</p>
            </div>

            <div className="border border-ws-rule">
              <div className="px-3 py-2 bg-ws-tick border-b border-ws-rule font-display text-[11px] font-semibold text-ws-light">
                {t('demand.workOrderRequirement')}
              </div>
              {[
                [t('common.department'), selected.department],
                [t('demand.assetType'), selected.asset_type || t('demand.notRecorded')],
                [t('demand.durationRequired'), `${selected.required_duration_minutes} ${t('common.min')}`],
                [t('demand.crewRequired'), selected.required_team_size],
                [t('demand.earliestStart'), selected.task_date],
                [t('common.deadline'), selected.deadline],
                [t('demand.canBundle'), selected.can_bundle ? t('common.yes') : t('common.no')],
                [t('demand.priorityScore'), selected.priority_score?.toFixed?.(1) ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="px-3 py-2 border-b border-ws-hairline last:border-b-0 flex items-center justify-between gap-3">
                  <span className="font-ws text-xs text-ws-mid">{k}</span>
                  <span className="font-mono text-[11px] font-semibold text-ws-ink">{v}</span>
                </div>
              ))}
            </div>

            {selected.scheduled_date && (
              <div className="border border-ws-rule">
                <div className="px-3 py-2 bg-ws-tick border-b border-ws-rule font-display text-[11px] font-semibold text-ws-light">
                  {t('demand.scheduledPossession')}
                </div>
                {[
                  [t('common.date'), selected.scheduled_date],
                  [t('common.window'), `${minToHhmm(selected.start_minute)}–${minToHhmm(selected.end_minute)}`],
                  [t('common.blocks'), (selected.block_ids || []).join(' + ')],
                  [t('common.crew'), (selected.assigned_teams || []).join(', ')],
                  [t('demand.nightWindow'), selected.is_night ? t('common.yes') : t('common.no')],
                ].map(([k, v]) => (
                  <div key={k} className="px-3 py-2 border-b border-ws-hairline last:border-b-0 flex items-center justify-between gap-3">
                    <span className="font-ws text-xs text-ws-mid">{k}</span>
                    <span className="font-mono text-[11px] font-semibold text-ws-ink">{v}</span>
                  </div>
                ))}
              </div>
            )}

            <ProvenanceNote
              generatedBy="scripts/generate_tasks_inventory.py"
              command="PYTHONPATH=. python scripts/generate_tasks_inventory.py"
              dataset="Arnav_Optimizer_Clean_Dataset"
            />
          </>
        )}
      </Drawer>
    </div>
  );
};
