import React, { useMemo, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
import { StatFigure, Pill, WsInput, WsSelect } from '../../components/ui/worksheet';
import { minToHhmm } from '../../utils/time';
import { bandOf, bandTone } from '../../utils/risk';
import corridors from '../../data/corridors_sections.json';

const SECTION = Object.fromEntries(corridors.sections.map((s) => [s.section_id, s]));
const VERDICT_TONE = { approve: 'ok', reject: 'critical', flag: 'warn' };
const VERDICT_LABEL = { approve: 'Approved', reject: 'Rejected', flag: 'Flagged' };
const RISK_PILL = { critical: 'critical', warn: 'warn', info: 'info', ok: 'ok', idle: 'idle' };

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
          <h2 className="font-display text-[15px] font-semibold text-ws-ink">Completion / Handoff</h2>
          <p className="font-ws text-xs text-ws-mid mt-0.5">{selectedDept} · possessions handed back</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WsInput placeholder="Search task, section, type…" value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-[200px]" />
          <WsSelect value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="ALL">All</option>
            <option value="PENDING">Awaiting verification</option>
            <option value="approve">Approved</option>
            <option value="flag">Flagged</option>
            <option value="reject">Rejected</option>
          </WsSelect>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-lg shadow-panel bg-ws-surface overflow-hidden p-3.5">
        <StatFigure value={deptWork.length} label="Handed back" />
        <StatFigure value={counts.verified} label="Approved" tone="text-ws-ok" />
        <StatFigure value={counts.pending} label="Awaiting verification" tone={counts.pending ? 'text-ws-warn' : 'text-ws-ok'} />
        <StatFigure value={counts.flagged + counts.rejected} label="Flagged / rejected" tone={counts.flagged + counts.rejected ? 'text-ws-critical' : 'text-ws-ok'} />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg shadow-panel bg-ws-surface overflow-hidden px-4 py-8 text-center">
          <div className="font-ws text-xs font-semibold text-ws-mid">No completed possession matches the current filters.</div>
          <div className="font-ws text-[11px] text-ws-light mt-1">Work appears here once a possession for your department has been handed back.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {rows.map((j) => {
            const v = verifications[j.task_id];
            const band = bandOf(j);
            const sec = SECTION[j.section_id];
            return (
              <div key={j.task_id} className="rounded-lg shadow-panel bg-ws-surface overflow-hidden">
                <div className="px-3.5 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[14px] font-bold text-ws-ink">{j.task_id}</div>
                    <div className="font-ws text-[12px] text-ws-ink mt-0.5">{j.maintenance_type}</div>
                    <div className="text-[12px] text-ws-mid mt-0.5">asset {j.asset_id}</div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    {band && <Pill tone={RISK_PILL[bandTone(band)] || 'idle'} size="sm">{band}</Pill>}
                    <div>
                      {v ? (
                        <Pill tone={RISK_PILL[VERDICT_TONE[v.status]] || 'idle'} size="sm">{VERDICT_LABEL[v.status] || v.status}</Pill>
                      ) : (
                        <span className="font-ws text-[10px] text-ws-light">Awaiting verification</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-px bg-ws-rule border-y border-ws-rule">
                  {[
                    ['Executed', j.execution_date, `${minToHhmm(j.start_minute)}–${minToHhmm(j.end_minute)}`],
                    ['Section', j.section_id, sec?.section_name || j.corridor_id],
                    ['Blocks', (j.block_ids || []).join(' + '), `${j.duration_minutes} min`],
                    ['Crew', (j.assigned_teams || []).join(', '), `risk ${j.risk_score?.toFixed?.(1) ?? '—'}`],
                  ].map(([k, val, sub]) => (
                    <div key={k} className="bg-ws-surface px-3 py-2">
                      <div className="font-display text-[11px] font-semibold text-ws-light">{k}</div>
                      <div className="font-mono text-[11px] text-ws-ink mt-0.5">{val}</div>
                      <div className="text-[12px] text-ws-mid mt-0.5">{sub}</div>
                    </div>
                  ))}
                </div>

                {v?.comments && (
                  <div className="px-3.5 py-2 bg-ws-paper">
                    <span className="font-display text-[11px] font-semibold text-ws-light">Verification note</span>
                    <p className="font-ws text-[11px] text-ws-body mt-0.5">{v.comments}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="border-l-[3px] border-l-ws-idle bg-ws-paper px-3 py-2.5">
        <div className="font-display text-[11px] font-bold text-ws-idle">Verification happens in Authority</div>
        <div className="font-ws text-xs text-ws-body leading-relaxed mt-1">Completed possessions are verified by the controlling authority, not by the crew that performed the work. Verdicts shown here are session state and are not written to any external register.</div>
      </div>

      <div className="text-[12px] text-ws-mid">Source: completed_work.json · {completedWork.length} possessions across all departments.</div>
    </div>
  );
};
