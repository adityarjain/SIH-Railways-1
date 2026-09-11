import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import {
  Panel, PanelHeader, PanelBody, Metric, DataTable, StatusBadge,
  Select, TextInput, EmptyState, Alert, ScopeCaption,
} from '../../components/ui';
import { minToHhmm } from '../../utils/time';
import teamsData from '../../data/teams.json';

/**
 * Authority — Resources.
 *
 * Crew roster and what the plan actually assigned each crew. The previous
 * version hardcoded assignment notes onto two team ids and never read the plan,
 * so it disagreed with the schedule whenever the schedule changed.
 */
export const TeamAvailability = ({ onNavigate }) => {
  const { scheduledTasks, baselineMetrics, isReplanned } = usePlan();
  const { t: tx } = useI18n();
  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');

  /** Assignments derived from the plan, so this follows the replan. */
  const assignmentsByTeam = useMemo(() => {
    const map = new Map();
    for (const t of scheduledTasks) {
      for (const teamId of t.assigned_teams || []) {
        if (!map.has(teamId)) map.set(teamId, []);
        map.get(teamId).push(t);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.date.localeCompare(b.date) || a.start_minute - b.start_minute);
    }
    return map;
  }, [scheduledTasks]);

  const departments = useMemo(
    () => [...new Set(teamsData.map((t) => t.department))].sort(),
    [],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return teamsData
      .filter((t) => (deptFilter === 'ALL' ? true : t.department === deptFilter))
      .filter((t) => {
        if (shiftFilter === 'ALL') return true;
        if (shiftFilter === 'ASSIGNED') return assignmentsByTeam.has(t.team_id);
        if (shiftFilter === 'IDLE') return !assignmentsByTeam.has(t.team_id);
        return (t.shift || '').includes(shiftFilter);
      })
      .filter((t) => {
        if (!q) return true;
        return (
          t.team_id.toLowerCase().includes(q) ||
          (t.team_name || '').toLowerCase().includes(q) ||
          (t.department || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.team_id.localeCompare(b.team_id));
  }, [query, deptFilter, shiftFilter, assignmentsByTeam]);

  const assignedCount = assignmentsByTeam.size;
  const totalCrew = teamsData.reduce((n, t) => n + (t.crew_size ?? t.team_size ?? 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="t-section-title">{tx('resources.title')}</h2>
        <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
          {tx('resources.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Panel><PanelBody><Metric label={tx('resources.crewsOnRoster')} value={teamsData.length} scope="teams.csv" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label={tx('resources.assignedInPlan')} value={assignedCount} tone={assignedCount ? 'ok' : 'idle'} scope={tx('scope.demoScenario')} /></PanelBody></Panel>
        <Panel><PanelBody><Metric label={tx('resources.crewsUtilized')} value={`${baselineMetrics.operational_metrics?.teams_utilized ?? 0} / ${teamsData.length}`} tone="warn" scope={tx('scope.fullRun')} /></PanelBody></Panel>
        <Panel><PanelBody><Metric label={tx('resources.totalCrew')} value={totalCrew} sub={tx('resources.totalCrewSub')} scope="teams.csv" /></PanelBody></Panel>
      </div>

      <Panel>
        <PanelHeader
          title={tx('resources.roster')}
          scope={tx('resources.rosterScope', { shown: rows.length, total: teamsData.length })}
        />
        <PanelBody className="border-b border-line flex flex-wrap items-center gap-2.5">
          <TextInput
            placeholder={tx('resources.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-[220px] flex-1"
          />
          <Select label={tx('common.dept')} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="ALL">{tx('common.allDepartments')}</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
          <Select label={tx('common.filter')} value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}>
            <option value="ALL">{tx('resources.filterAll')}</option>
            <option value="ASSIGNED">{tx('resources.filterAssigned')}</option>
            <option value="IDLE">{tx('resources.filterIdle')}</option>
            <option value="Night">{tx('resources.filterNight')}</option>
            <option value="Day">{tx('resources.filterDay')}</option>
            <option value="Evening">{tx('resources.filterEvening')}</option>
          </Select>
        </PanelBody>

        <DataTable
          getKey={(t) => t.team_id}
          columns={[
            { key: 'team_id', header: tx('common.crew'), render: (t) => (
              <span>
                <span className="t-mono-id block">{t.team_id}</span>
                <span className="text-[10px] text-rail-400">{t.team_name}</span>
              </span>
            ) },
            { key: 'department', header: tx('common.department'), render: (t) => (
              <span className="text-[11px]">{t.department}</span>
            ) },
            { key: 'shift', header: tx('resources.shift'), render: (t) => (
              <span className="font-mono text-[11px]">
                {t.shift_start_minute != null
                  ? `${minToHhmm(t.shift_start_minute)}–${minToHhmm(t.shift_end_minute)}`
                  : t.shift || '—'}
              </span>
            ) },
            { key: 'crew_size', header: tx('resources.size'), align: 'right', render: (t) => (
              <span className="font-mono text-[11px]">{t.crew_size ?? t.team_size}</span>
            ) },
            { key: 'availability_percent', header: tx('resources.availability'), align: 'right', render: (t) => (
              <StatusBadge tone={t.availability_percent >= 90 ? 'ok' : t.availability_percent >= 75 ? 'warn' : 'critical'} size="sm">
                {t.availability_percent}%
              </StatusBadge>
            ) },
            { key: 'assigned', header: tx('resources.assignedPossessions'), render: (t) => {
              const list = assignmentsByTeam.get(t.team_id) || [];
              if (list.length === 0) {
                return <span className="text-[10px] text-rail-400">{tx('resources.noneInPlan')}</span>;
              }
              return (
                <span className="space-y-0.5 block">
                  {list.slice(0, 3).map((a) => (
                    <span key={a.task_id} className="block font-mono text-[10px] text-rail-700">
                      {a.task_id} · {a.date} · {minToHhmm(a.start_minute)}–{minToHhmm(a.end_minute)}
                    </span>
                  ))}
                  {list.length > 3 && (
                    <span className="block text-[9px] text-rail-400">{tx('resources.andMore', { count: list.length - 3 })}</span>
                  )}
                </span>
              );
            } },
          ]}
          rows={rows}
          onRowClick={() => onNavigate && onNavigate('maintenance-blocks')}
          empty={<EmptyState title={tx('resources.noCrewMatch')} />}
        />
      </Panel>

      {isReplanned && (
        <Alert tone="warn" title={tx('resources.replannedTitle')}>
          {tx('resources.replannedBody')}
        </Alert>
      )}

      <Alert tone="idle" title={tx('resources.availabilityTitle')}>
        {tx('resources.availabilityBody')}
      </Alert>

      <ScopeCaption className="block">
        {tx('resources.rosterScopeNote', { count: teamsData.length })}
      </ScopeCaption>
    </div>
  );
};
