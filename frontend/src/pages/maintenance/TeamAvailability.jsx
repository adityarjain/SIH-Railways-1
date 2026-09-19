import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import { RegionHeader, StatFigure, AdvisoryNote, Pill, WsInput, WsSelect } from '../../components/ui/worksheet';
import { minToHhmm } from '../../utils/time';
import teamsData from '../../data/teams.json';

/**
 * Authority — Resources.
 *
 * Crew roster and what the plan actually assigned each crew. Assignments are
 * derived from the plan, so this follows the replan.
 */
export const TeamAvailability = ({ onNavigate }) => {
  const { scheduledTasks, baselineMetrics, isReplanned } = usePlan();
  const { t, isHindi } = useI18n();
  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');

  const assignmentsByTeam = useMemo(() => {
    const map = new Map();
    for (const task of scheduledTasks) {
      for (const teamId of task.assigned_teams || []) {
        if (!map.has(teamId)) map.set(teamId, []);
        map.get(teamId).push(task);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.date.localeCompare(b.date) || a.start_minute - b.start_minute);
    }
    return map;
  }, [scheduledTasks]);

  const departments = useMemo(() => [...new Set(teamsData.map((tm) => tm.department))].sort(), []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return teamsData
      .filter((tm) => (deptFilter === 'ALL' ? true : tm.department === deptFilter))
      .filter((tm) => {
        if (shiftFilter === 'ALL') return true;
        if (shiftFilter === 'ASSIGNED') return assignmentsByTeam.has(tm.team_id);
        if (shiftFilter === 'IDLE') return !assignmentsByTeam.has(tm.team_id);
        return (tm.shift || '').includes(shiftFilter);
      })
      .filter((tm) => {
        if (!q) return true;
        return (
          tm.team_id.toLowerCase().includes(q) ||
          (tm.team_name || '').toLowerCase().includes(q) ||
          (tm.department || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.team_id.localeCompare(b.team_id));
  }, [query, deptFilter, shiftFilter, assignmentsByTeam]);

  const assignedCount = assignmentsByTeam.size;
  const totalCrew = teamsData.reduce((n, tm) => n + (tm.crew_size ?? tm.team_size ?? 0), 0);

  return (
    <div className="bg-ws-band min-h-full">
      <div className="bg-ws-paper border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-2.5">
        <p className="font-ws text-xs text-ws-mid max-w-3xl leading-relaxed">{t('resources.subtitle')}</p>
      </div>

      {/* 01 — roster stats */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
        <RegionHeader number="01" title={t('resources.title')} meta="teams.csv" isHindi={isHindi} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-3.5 border-t border-ws-rule pt-3">
          <StatFigure value={teamsData.length} label={t('resources.crewsOnRoster')} />
          <StatFigure value={assignedCount} label={t('resources.assignedInPlan')} tone={assignedCount ? 'text-ws-ok' : 'text-ws-idle'} />
          <StatFigure value={`${baselineMetrics.operational_metrics?.teams_utilized ?? 0} / ${teamsData.length}`} label={t('resources.crewsUtilized')} tone="text-ws-warn" />
          <StatFigure value={totalCrew} label={t('resources.totalCrew')} />
        </div>
      </div>

      {/* 02 — roster register */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-3.5">
        <RegionHeader number="02" title={t('resources.roster')} meta={t('resources.rosterScope', { shown: rows.length, total: teamsData.length })} isHindi={isHindi} />
        <div className="flex flex-wrap items-center gap-2.5">
          <WsInput
            placeholder={t('resources.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-[220px] flex-1"
          />
          <WsSelect value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="ALL">{t('common.allDepartments')}</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </WsSelect>
          <WsSelect value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}>
            <option value="ALL">{t('resources.filterAll')}</option>
            <option value="ASSIGNED">{t('resources.filterAssigned')}</option>
            <option value="IDLE">{t('resources.filterIdle')}</option>
            <option value="Night">{t('resources.filterNight')}</option>
            <option value="Day">{t('resources.filterDay')}</option>
            <option value="Evening">{t('resources.filterEvening')}</option>
          </WsSelect>
        </div>
      </div>

      <div className="bg-ws-surface border-b border-ws-rule overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead className="border-b border-ws-rule bg-ws-tick">
            <tr>
              {[t('common.crew'), t('common.department'), t('resources.shift'), t('resources.size'), t('resources.availability'), t('resources.assignedPossessions')].map((h, i) => (
                <th key={h} className={`px-3.5 py-2 font-display text-[10px] font-semibold text-ws-light whitespace-nowrap ${i >= 3 && i <= 4 ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-3.5 py-8 text-center font-ws text-xs text-ws-mid">{t('resources.noCrewMatch')}</td></tr>
            )}
            {rows.map((tm) => {
              const list = assignmentsByTeam.get(tm.team_id) || [];
              return (
                <tr key={tm.team_id} onClick={() => onNavigate && onNavigate('maintenance-blocks')} className="border-b border-ws-hairline last:border-b-0 hover:bg-ws-paper cursor-pointer">
                  <td className="px-3.5 py-1.5 whitespace-nowrap">
                    <div className="font-mono text-[11px] font-medium text-ws-ink">{tm.team_id}</div>
                    <div className="font-ws text-[10px] text-ws-light">{tm.team_name}</div>
                  </td>
                  <td className="px-3.5 py-1.5 font-ws text-[11px] text-ws-body whitespace-nowrap">{tm.department}</td>
                  <td className="px-3.5 py-1.5 font-mono text-[11px] text-ws-body whitespace-nowrap">
                    {tm.shift_start_minute != null ? `${minToHhmm(tm.shift_start_minute)}–${minToHhmm(tm.shift_end_minute)}` : tm.shift || '—'}
                  </td>
                  <td className="px-3.5 py-1.5 font-mono text-[11px] text-ws-body text-right whitespace-nowrap">{tm.crew_size ?? tm.team_size}</td>
                  <td className="px-3.5 py-1.5 text-right whitespace-nowrap">
                    <Pill tone={tm.availability_percent >= 90 ? 'ok' : tm.availability_percent >= 75 ? 'warn' : 'critical'} size="sm">{tm.availability_percent}%</Pill>
                  </td>
                  <td className="px-3.5 py-1.5 whitespace-nowrap">
                    {list.length === 0 ? (
                      <span className="font-ws text-[10px] text-ws-light">{t('resources.noneInPlan')}</span>
                    ) : (
                      <span className="font-mono text-[10px] text-ws-body">
                        {t('resources.nextAssignment', { count: list.length, task: list[0].task_id, date: list[0].date, window: `${minToHhmm(list[0].start_minute)}–${minToHhmm(list[0].end_minute)}` })}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-3.5 space-y-2.5">
        {isReplanned && (
          <AdvisoryNote tone="warn" title={t('resources.replannedTitle')}>{t('resources.replannedBody')}</AdvisoryNote>
        )}
        <AdvisoryNote tone="idle" title={t('resources.availabilityTitle')}>{t('resources.availabilityBody')}</AdvisoryNote>
      </div>

      <div className="bg-ws-band px-3.5 md:px-4 xl:px-5 py-2">
        <span className="font-mono text-[10px] text-ws-mid">{t('resources.rosterScopeNote', { count: teamsData.length })}</span>
      </div>
    </div>
  );
};
