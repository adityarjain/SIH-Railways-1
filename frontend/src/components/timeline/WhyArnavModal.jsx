import React from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
// Computed by scripts/generate_decision_trace.py from the dataset. Every
// rejection reason below cites the row that actually caused it, so the table
// can be checked against train_block_conflicts.csv / blocks.csv / teams.csv.
import decisionTrace from '../../data/decision_trace.json';
import { Award } from 'lucide-react';

const STATUS_STYLES = {
  SELECTED: { row: 'bg-emerald-50/70 font-semibold text-emerald-900', label: 'text-emerald-700' },
  FEASIBLE: { row: 'text-slate-600', label: 'text-blue-600' },
  REJECTED: { row: 'text-slate-600', label: 'text-red-600' },
};

export const WhyArnavModal = ({ isOpen, onClose, task }) => {
  const trace = decisionTrace;
  const {
    request, risk_signal: risk, candidate_summary: summary, candidates, selected,
    train_impact: trainImpact,
  } = trace;

  // The trace artifact covers one worked example. If the operator opened a
  // different task, say so rather than presenting this trace as that task's.
  const isTracedTask = !task?.task_id || task.task_id === request.task_id;

  const ruleCounts = Object.entries(summary.rejected_by_rule)
    .map(([rule, n]) => `${rule} ×${n}`)
    .join(' · ');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Why Did Arnav Select This Block?"
      subtitle="Constraint Programming (Google OR-Tools CP-SAT) decision trace, recomputed from the dataset"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Banner */}
        <div className="bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono font-bold text-blue-400 uppercase tracking-wider block">
              Automated Reasoning Trace
            </span>
            <h4 className="text-sm font-bold text-white mt-0.5">
              Assignment trace for {request.task_id} on {request.section_id}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              {summary.block_windows_considered} block windows on {summary.date_evaluated} evaluated
              against hard constraints{ruleCounts ? ` — ${ruleCounts}` : ''}.
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate-400 block">Outcome</span>
            <span className="text-xs font-bold text-emerald-400 font-mono">FEASIBLE ASSIGNMENT</span>
          </div>
        </div>

        {!isTracedTask && (
          <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            A full candidate trace is published for <strong>{request.task_id}</strong>, the worked
            example in this demo. You opened <strong>{task.task_id}</strong> — the trace below is for{' '}
            {request.task_id}. Regenerate for another task with{' '}
            <code className="font-mono">scripts/generate_decision_trace.py {task.task_id}</code>.
          </div>
        )}

        <div className="space-y-4">
          {/* STEP 1 — REQUEST */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">1</span>
                <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Step 1 — Maintenance Request</h5>
              </div>
              <Badge variant="primary" size="sm">{request.required_duration_minutes} MIN</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div>
                <span className="text-slate-500 block text-[11px]">Type</span>
                <span className="font-semibold text-slate-800">{request.maintenance_type}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Duration</span>
                <span className="font-semibold text-slate-800">
                  {request.required_duration_minutes} min ({request.blocks_required} blocks)
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Crew required</span>
                <span className="font-semibold text-slate-800">
                  {request.required_team_size} · {request.department}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Deadline</span>
                <span className="font-semibold text-slate-800 font-mono">{request.deadline}</span>
              </div>
            </div>
          </div>

          {/* STEP 2 — RISK SIGNAL */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center">2</span>
                <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Step 2 — Neev Failure Risk Signal</h5>
              </div>
              <Badge variant="CRITICAL" size="sm">{risk.risk_level} RISK</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div>
                <span className="text-slate-500 block text-[11px]">Asset failure risk</span>
                <span className="font-bold text-red-600 font-mono text-sm">
                  {risk.risk_score.toFixed(1)} / 100 ({risk.risk_level})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">30-day failure probability</span>
                <span className="font-bold text-slate-800 font-mono text-sm">
                  {(risk.failure_probability_30d * 100).toFixed(1)}%
                </span>
              </div>
              <div className="col-span-2 text-slate-600 text-[11px] pt-1">
                Weighted into a composite priority score of{' '}
                <strong>{risk.priority_score.toLocaleString()}</strong>, which is how the objective
                ranks this task against competing demand. Source: {risk.source}.
              </div>
            </div>
          </div>

          {/* STEP 3 — CANDIDATES & FILTERS */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center">3</span>
                <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Step 3 — Candidate Evaluation &amp; Feasibility Filters
                </h5>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {summary.block_windows_considered} evaluated · {summary.rejected} pruned
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Each window is a contiguous block chain covering {request.required_duration_minutes} min.
              Hard constraints are applied before the objective chooses among what survives.
            </p>

            <div className="border border-slate-200 rounded-lg overflow-x-auto text-xs">
              <table className="w-full text-left min-w-[560px]">
                <thead className="bg-slate-100 text-[11px] text-slate-600 font-mono border-b border-slate-200">
                  <tr>
                    <th className="py-1.5 px-3">Block Window</th>
                    <th className="py-1.5 px-3">Time</th>
                    <th className="py-1.5 px-3">Status</th>
                    <th className="py-1.5 px-3">Rule</th>
                    <th className="py-1.5 px-3">Reason (from dataset)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {candidates.map((c) => {
                    const style = STATUS_STYLES[c.status] || STATUS_STYLES.REJECTED;
                    return (
                      <tr key={c.block_ids.join('+') + c.window} className={style.row}>
                        <td className="py-2 px-3 whitespace-nowrap">{c.block_ids.join(' + ')}</td>
                        <td className="py-2 px-3 whitespace-nowrap">{c.window}</td>
                        <td className={`py-2 px-3 font-semibold ${style.label}`}>{c.status}</td>
                        <td className="py-2 px-3 text-slate-500">{c.rule}</td>
                        <td className="py-2 px-3 font-sans text-slate-600 font-normal">{c.reason}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* STEP 4 — SELECTED TEAM */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">4</span>
                <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Step 4 — Team Feasibility (S005 / S006)
                </h5>
              </div>
              <Badge variant="success" size="sm">CREW QUALIFIED</Badge>
            </div>
            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
              {selected.teams.map((t) => (
                <div key={t.team_id}>
                  • <strong>{t.team_id}</strong> ({t.department}, shift {t.shift}) — crew{' '}
                  {t.team_size} ≥ {t.required_team_size} required
                </div>
              ))}
              <div className="text-slate-500 pt-1">
                Global non-overlap (S007) is enforced across the network by the solver, so an assigned
                crew cannot hold two possessions at once.
              </div>
            </div>
          </div>

          {/* STEP 4b — TRAIN IMPACT */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center">5</span>
                <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Step 5 — Affected Train Services
                </h5>
              </div>
              <Badge variant={trainImpact?.conflicting?.length ? 'CRITICAL' : 'success'} size="sm">
                {trainImpact?.conflicting?.length ?? 0} CONFLICTS
              </Badge>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
              <div>
                <span className="font-semibold text-slate-700">Conflicting movements (C002):</span>{' '}
                {trainImpact?.conflicting?.length ? (
                  <span className="font-mono text-red-700">
                    {trainImpact.conflicting.map((t) => t.train_id).join(', ')}
                  </span>
                ) : (
                  <span className="text-emerald-700 font-semibold">
                    none — no train movement overlaps this possession
                  </span>
                )}
              </div>

              <div>
                <span className="font-semibold text-slate-700">
                  Adjacent services (±{trainImpact?.adjacency_buffer_minutes ?? 60} min, C008):
                </span>{' '}
                {trainImpact?.adjacent?.length ? (
                  <span className="font-mono">
                    {trainImpact.adjacent
                      .map((t) => `${t.train_type} ${t.train_id} ${t.window}`)
                      .join(' · ')}
                  </span>
                ) : (
                  <span className="text-emerald-700 font-semibold">
                    none — the nearest passenger service is outside the buffer
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-500 leading-snug pt-0.5">
                {trainImpact?.note}
              </p>

              {/* No estimated delay is shown here: this possession displaces no
                  train, so there is no delay to report. Reroute delay appears on
                  the Live Operations screen when a train is actually diverted. */}
              <p className="text-[11px] text-slate-500 leading-snug">
                <span className="font-semibold">Estimated train delay:</span>{' '}
                {trainImpact?.conflicting?.length
                  ? 'see Live Operations for the computed reroute or hold delay'
                  : '0 min — no service is displaced by this possession'}
              </p>
            </div>
          </div>

          {/* STEP 6 — DECISION */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-emerald-700" />
              <h5 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                Step 6 — Selected Assignment
              </h5>
            </div>
            <div className="text-xs text-emerald-950 font-mono bg-white/70 border border-emerald-200 rounded-lg px-3 py-2">
              {selected.block_ids.join(' + ')} · {selected.date} · {selected.window} ·{' '}
              {selected.teams.map((t) => t.team_id).join(', ')}
            </div>
            <p className="text-xs text-emerald-950 leading-relaxed">{trace.explanation}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <p className="text-[10px] text-slate-400 leading-tight">
            Recomputed by{' '}
            <code className="font-mono">scripts/generate_decision_trace.py</code> from{' '}
            {trace.provenance?.dataset}. Synthetic demonstration data.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors shrink-0"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
