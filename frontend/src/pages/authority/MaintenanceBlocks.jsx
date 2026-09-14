import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import { minToHhmm } from '../../utils/time';
import { bandOf } from '../../utils/risk';
import { BundlingView } from '../../components/timeline/BundlingView';
import { WeeklyViewWorksheet } from '../../components/planning/WeeklyViewWorksheet';
import { MonthlyHeatmapWorksheet } from '../../components/planning/MonthlyHeatmapWorksheet';
import bundlingData from '../../data/bundling.json';

const FlagPill = ({ tone, children }) => {
  const map = {
    info: 'text-ws-info border-ws-barPlannedBorder bg-ws-barPlannedBg',
    bundle: 'text-ws-bundle border-ws-barBundledBorder bg-ws-barBundledBg',
    critical: 'text-ws-critical border-ws-barCriticalBorder bg-ws-barCriticalBg',
  };
  return (
    <span className={`inline-flex items-center px-1 py-0.5 font-display text-[8px] font-bold uppercase tracking-wide border ${map[tone]}`}>
      {children}
    </span>
  );
};

/**
 * Maintenance Blocks worksheet (design 2A idiom) — the possession register:
 * every block window the optimizer committed, the workload shape across the
 * horizon, and the concurrent bundles between departments.
 */
export const MaintenanceBlocks = ({ onNavigate }) => {
  const { scheduledTasks, metrics } = usePlan();
  const { t, isHindi } = useI18n();
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [view, setView] = useState('register');

  const uc = isHindi ? '' : 'uppercase';
  const tr = isHindi ? '' : 'tracking-[0.1em]';

  const dates = useMemo(
    () => [...new Set(scheduledTasks.map((task) => task.date))].sort(),
    [scheduledTasks],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scheduledTasks
      .filter((task) => (dateFilter === 'ALL' ? true : task.date === dateFilter))
      .filter((task) => {
        if (!q) return true;
        return (
          task.task_id.toLowerCase().includes(q) ||
          task.section_id.toLowerCase().includes(q) ||
          (task.block_ids || []).some((b) => b.toLowerCase().includes(q)) ||
          (task.maintenance_type || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.date === b.date ? a.start_minute - b.start_minute : a.date.localeCompare(b.date)));
  }, [scheduledTasks, query, dateFilter]);

  const uniqueBlocks = useMemo(
    () => new Set(scheduledTasks.flatMap((task) => task.block_ids || [])).size,
    [scheduledTasks],
  );
  const nightCount = scheduledTasks.filter((task) => task.is_night).length;
  const bundledCount = scheduledTasks.filter((task) => task.is_bundled).length;
  const bundlePairs = bundlingData.concurrent_bundle_pairs || [];

  return (
    <div className="bg-ws-band min-h-full">
      {/* intro */}
      <div className="bg-ws-paper border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-2.5">
        <p className="font-ws text-xs text-ws-mid max-w-3xl leading-relaxed">{t('maintenanceBlocks.subtitle')}</p>
      </div>

      {/* 01 — plan state */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
        <div className="flex items-center gap-2.5 pb-2 flex-wrap">
          <span className="font-mono text-[11px] font-bold text-ws-light">01</span>
          <span className={`font-display text-base font-semibold ${uc} ${tr} text-ws-ink`}>{t('overview.planState')}</span>
          <span className="flex-1 min-w-6 h-px bg-ws-rule" />
          <span className="font-mono text-[10px] text-ws-light">{t('scope.demoScenario').toUpperCase()}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-3.5 border-t border-ws-rule pt-3">
          <div>
            <div className="font-mono text-[22px] font-bold text-ws-ink leading-none">{scheduledTasks.length}</div>
            <div className="font-ws text-xs text-ws-mid mt-[3px]">{t('maintenanceBlocks.possessions')}</div>
          </div>
          <div>
            <div className="font-mono text-[22px] font-bold text-ws-ink leading-none">{uniqueBlocks}</div>
            <div className="font-ws text-xs text-ws-mid mt-[3px]">{t('maintenanceBlocks.blockWindowsUsed')} · {t('maintenanceBlocks.blockWindowsSub')}</div>
          </div>
          <div>
            <div className="font-mono text-[22px] font-bold text-ws-info leading-none">{nightCount}</div>
            <div className="font-ws text-xs text-ws-mid mt-[3px]">{t('maintenanceBlocks.nightPossessions')}</div>
          </div>
          <div>
            <div className="font-mono text-[22px] font-bold text-ws-bundle leading-none">{bundledCount}</div>
            <div className="font-ws text-xs text-ws-mid mt-[3px]">{t('maintenanceBlocks.bundledTasks')}</div>
          </div>
        </div>
      </div>

      {/* 02 — possession register */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-3.5">
        <div className="flex items-center gap-2.5 pb-2.5 flex-wrap">
          <span className="font-mono text-[11px] font-bold text-ws-light">02</span>
          <span className={`font-display text-base font-semibold ${uc} ${tr} text-ws-ink`}>{t('maintenanceBlocks.register')}</span>
          <span className="flex-1 min-w-6 h-px bg-ws-rule" />
          <span className="font-mono text-[10px] text-ws-light">
            {t('maintenanceBlocks.registerScope', { shown: rows.length, total: scheduledTasks.length })}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {view === 'register' && (
            <>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('maintenanceBlocks.searchPlaceholder')}
                className="font-ws text-[13px] text-ws-ink bg-ws-surface border border-ws-rule px-2.5 py-1.5 placeholder:text-ws-light focus:outline-none flex-1 min-w-[220px]"
              />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="font-ws text-[13px] text-ws-ink bg-ws-surface border border-ws-rule px-2 py-1.5"
              >
                <option value="ALL">{t('common.allDates')}</option>
                {dates.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </>
          )}
          <span className="flex-1 min-w-2" />
          <div className="flex border border-ws-rule shrink-0">
            {[
              ['register', t('maintenanceBlocks.viewRegister')],
              ['weekly', t('blockPlanning.viewWeekly')],
              ['monthly', t('blockPlanning.viewMonthly')],
            ].map(([id, label], i) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`px-2.5 py-1 font-display text-[11px] font-bold ${uc} ${tr} transition-colors ${i > 0 ? 'border-l border-ws-rule' : ''} ${
                  view === id ? 'bg-ws-ink text-white' : 'bg-ws-surface text-ws-mid hover:bg-ws-paper hover:text-ws-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === 'register' && (
        <div className="bg-ws-surface border-b border-ws-rule overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[860px]">
            <thead className="border-b border-ws-rule bg-ws-tick">
              <tr>
                {[
                  t('maintenanceBlocks.blockWindow'), t('common.date'), t('common.time'), t('common.section'),
                  t('common.task'), t('common.type'), t('common.crew'), t('maintenanceBlocks.flags'),
                ].map((h, i) => (
                  <th key={h} className={`px-3.5 py-2 font-display text-[10px] font-semibold ${uc} tracking-wide text-ws-light whitespace-nowrap ${i === 7 ? 'text-right' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3.5 py-8 text-center font-ws text-xs text-ws-mid">
                    {t('maintenanceBlocks.noPossessionMatch')}
                  </td>
                </tr>
              )}
              {rows.map((task) => (
                <tr
                  key={task.task_id}
                  onClick={() => onNavigate && onNavigate('block-planning')}
                  className="border-b border-ws-hairline last:border-b-0 hover:bg-ws-paper cursor-pointer"
                >
                  <td className="px-3.5 py-1.5 font-mono text-[11px] font-semibold text-ws-ink whitespace-nowrap">{(task.block_ids || []).join(' + ')}</td>
                  <td className="px-3.5 py-1.5 font-mono text-[11px] text-ws-body whitespace-nowrap">{task.date}</td>
                  <td className="px-3.5 py-1.5 font-mono text-[11px] text-ws-body whitespace-nowrap">{minToHhmm(task.start_minute)}–{minToHhmm(task.end_minute)}</td>
                  <td className="px-3.5 py-1.5 font-mono text-[11px] text-ws-body whitespace-nowrap">{task.section_id}</td>
                  <td className="px-3.5 py-1.5 font-mono text-[11px] font-medium text-ws-ink whitespace-nowrap">{task.task_id}</td>
                  <td className="px-3.5 py-1.5 font-ws text-[11px] text-ws-body whitespace-nowrap">{task.maintenance_type}</td>
                  <td className="px-3.5 py-1.5 font-mono text-[10px] text-ws-mid whitespace-nowrap">{(task.assigned_teams || []).join(', ') || '—'}</td>
                  <td className="px-3.5 py-1.5 text-right whitespace-nowrap">
                    <span className="inline-flex gap-1 justify-end">
                      {task.is_night && <FlagPill tone="info">{t('maintenanceBlocks.flagNight')}</FlagPill>}
                      {task.is_bundled && <FlagPill tone="bundle">{t('maintenanceBlocks.flagBundled')}</FlagPill>}
                      {bandOf(task) === 'CRITICAL' && <FlagPill tone="critical">{t('maintenanceBlocks.flagCritical')}</FlagPill>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {view === 'weekly' && (
        <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-3.5">
          <WeeklyViewWorksheet selectedDate={dateFilter === 'ALL' ? null : dateFilter} onSelectDate={(d) => { setDateFilter(d); setView('register'); }} />
        </div>
      )}
      {view === 'monthly' && (
        <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-3.5">
          <MonthlyHeatmapWorksheet onSelectDate={(d) => { setDateFilter(d); setView('register'); }} />
        </div>
      )}

      {/* 03 — cross-department bundling */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
        <div className="flex items-center gap-2.5 pb-2.5 flex-wrap">
          <span className="font-mono text-[11px] font-bold text-ws-light">03</span>
          <span className={`font-display text-base font-semibold ${uc} ${tr} text-ws-ink`}>{t('maintenanceBlocks.bundlingTitle')}</span>
          <span className="flex-1 min-w-6 h-px bg-ws-rule" />
          <span className="font-mono text-[10px] text-ws-light">{t('maintenanceBlocks.bundlingPairs', { count: bundlePairs.length })}</span>
        </div>
        <BundlingView />
      </div>

      {/* disclosure + footer */}
      <div className="border-l-[3px] border-l-ws-idle bg-ws-paper mx-3.5 md:mx-4 xl:mx-5 my-3.5 px-3 py-2.5">
        <div className="font-display text-[11px] font-bold uppercase tracking-wide text-ws-idle">{t('maintenanceBlocks.noSavingTitle')}</div>
        <div className="font-ws text-xs text-ws-body leading-relaxed mt-1">{t('maintenanceBlocks.noSavingBody')}</div>
      </div>

      <div className="bg-ws-band border-t border-ws-rule px-3.5 md:px-4 xl:px-5 py-2 flex flex-wrap items-center gap-3.5">
        <span className="font-mono text-[10px] text-ws-mid">
          {t('maintenanceBlocks.registerScopeNote', { desc: metrics.provenance?.description || t('scope.demoScenario').toLowerCase() })}
        </span>
      </div>
    </div>
  );
};
