import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
import {
  Panel, PanelBody, Metric, StatusBadge, EmptyState,
  Alert, Select, TextInput, ScopeCaption,
} from '../../components/ui';
import { minToHhmm } from '../../utils/time';
import { bandOf, bandTone } from '../../utils/risk';
import corridors from '../../data/corridors_sections.json';

const SECTION = Object.fromEntries(corridors.sections.map((s) => [s.section_id, s]));
const VERDICT_TONE = { approve: 'ok', reject: 'critical', flag: 'warn' };
const VERDICT_LABEL = { approve: 'Approved', reject: 'Rejected', flag: 'Flagged' };

/**
 * Ground — Completion / Handoff.
 *
 * Possessions this department has handed back, and what the controlling
 * authority did with each. The verification verdict is read from the same
 * session state the Authority screen writes.
 */
export const CompletedWork = () => {
  const { completedWork, verifications } = usePlan();
  const { selectedDept } = useAuth();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');

  const deptWork = useMemo(
    () => completedWork.filter((j) => j.department === selectedDept),
    [completedWork, selectedDept],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return deptWork
      .filter((j) => {
        const v = verifications[j.task_id];
        if (filter === 'ALL') return true;
        if (filter === 'PENDING') return !v;
        return v?.status === filter;
      })
      .filter((j) => {
        if (!q) return true;
        return (
          j.task_id.toLowerCase().includes(q) ||
          j.section_id.toLowerCase().includes(q) ||
          (j.maintenance_type || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.execution_date.localeCompare(a.execution_date));
  }, [deptWork, verifications, query, filter]);

  const counts = useMemo(() => {
    let verified = 0, rejected = 0, flagged = 0;
    for (const j of deptWork) {
      const s = verifications[j.task_id]?.status;
      if (s === 'approve') verified += 1;
      else if (s === 'reject') rejected += 1;
      else if (s === 'flag') flagged += 1;
    }
    return { verified, rejected, flagged, pending: deptWork.length - verified - rejected - flagged };
  }, [deptWork, verifications]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="t-section-title">Completion / Handoff</h2>
          <p className="text-xs text-rail-500 mt-0.5">
            {selectedDept} · possessions handed back
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TextInput
            placeholder="Search task, section, type…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-[200px]"
          />
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="ALL">All</option>
            <option value="PENDING">Awaiting verification</option>
            <option value="approve">Approved</option>
            <option value="flag">Flagged</option>
            <option value="reject">Rejected</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Panel><PanelBody><Metric label="Handed back" value={deptWork.length} scope="completed_work.json" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="Approved" value={counts.verified} tone="ok" scope="This session" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="Awaiting verification" value={counts.pending} tone={counts.pending ? 'warn' : 'ok'} scope="This session" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="Flagged / rejected" value={counts.flagged + counts.rejected} tone={counts.flagged + counts.rejected ? 'critical' : 'ok'} scope="This session" /></PanelBody></Panel>
      </div>

      {rows.length === 0 ? (
        <Panel>
          <EmptyState title="No completed possession matches the current filters.">
            Work appears here once a possession for your department has been handed back.
          </EmptyState>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {rows.map((j) => {
            const v = verifications[j.task_id];
            const band = bandOf(j);
            const sec = SECTION[j.section_id];
            return (
              <Panel key={j.task_id} className="overflow-hidden">
                <div className="px-3.5 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[14px] font-bold text-rail-900">{j.task_id}</div>
                    <div className="text-[12px] text-rail-900 mt-0.5">{j.maintenance_type}</div>
                    <div className="font-mono text-[10px] text-rail-400 mt-0.5">
                      asset {j.asset_id}
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    {band && <StatusBadge tone={bandTone(band)} size="sm">{band}</StatusBadge>}
                    <div>
                      {v ? (
                        <StatusBadge tone={VERDICT_TONE[v.status] || 'idle'} size="sm">
                          {VERDICT_LABEL[v.status] || v.status}
                        </StatusBadge>
                      ) : (
                        <span className="text-[10px] text-rail-400">Awaiting verification</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-px bg-line border-y border-line">
                  {[
                    ['Executed', j.execution_date, `${minToHhmm(j.start_minute)}–${minToHhmm(j.end_minute)}`],
                    ['Section', j.section_id, sec?.section_name || j.corridor_id],
                    ['Blocks', (j.block_ids || []).join(' + '), `${j.duration_minutes} min`],
                    ['Crew', (j.assigned_teams || []).join(', '), `risk ${j.risk_score?.toFixed?.(1) ?? '—'}`],
                  ].map(([k, val, sub]) => (
                    <div key={k} className="bg-surface-panel px-3 py-2">
                      <div className="t-label">{k}</div>
                      <div className="font-mono text-[11px] text-rail-900 mt-0.5">{val}</div>
                      <div className="text-[9px] text-rail-400 mt-0.5">{sub}</div>
                    </div>
                  ))}
                </div>

                {v?.comments && (
                  <div className="px-3.5 py-2 bg-surface-sunken">
                    <span className="t-label">Verification note</span>
                    <p className="text-[11px] text-rail-700 mt-0.5">{v.comments}</p>
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}

      <Alert tone="idle" title="Verification happens in Authority">
        Completed possessions are verified by the controlling authority, not by the crew that
        performed the work. Verdicts shown here are session state and are not written to any
        external register.
      </Alert>

      <ScopeCaption className="block">
        Source: completed_work.json · {completedWork.length} possessions across all departments.
      </ScopeCaption>
    </div>
  );
};
