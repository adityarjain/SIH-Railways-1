import React from 'react';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { usePlan } from '../../context/PlanContext';
import { minToHhmm } from '../../utils/time';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

/**
 * Possessions already handed back, from `completed_work.json`
 * (scripts/generate_tasks_inventory.py). Every field below is a scheduling fact
 * the optimizer produced.
 *
 * Deliberately absent: a "quality index" and a named supervising engineer. The
 * pipeline records no quality metric and no personnel, and inventing either
 * would present fiction as an execution record.
 */
export const CompletedWork = () => {
  const { selectedDept } = useAuth();
  const { completedWork, verifications } = usePlan();

  const jobs = completedWork.filter((j) => j.department === selectedDept);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-600 uppercase tracking-wider">
          <CheckCircle2 size={14} className="text-emerald-500" />
          <span>Execution Log</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
          Completed Maintenance Work Orders
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Possessions for {selectedDept} scheduled before the current simulation date and
          handed back. Derived from the generated plan.
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/80">
          <p className="text-sm font-semibold text-slate-700">No completed possessions</p>
          <p className="text-xs text-slate-500 mt-1">
            No {selectedDept} work is scheduled before the current simulation date.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const verification = verifications[job.task_id];
            return (
              <div
                key={job.task_id}
                className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-900 text-sm">{job.task_id}</span>
                    <span className="text-xs font-bold text-slate-800">{job.maintenance_type}</span>
                  </div>
                  <Badge variant={verification ? 'success' : 'primary'} size="md">
                    {verification ? verification.status : 'Awaiting verification'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs font-mono text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Section / Corridor</span>
                    <span className="font-bold text-slate-900">{job.section_id} • {job.corridor_id}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Date &amp; Window</span>
                    <span className="font-bold text-slate-900">
                      {job.execution_date} • {minToHhmm(job.start_minute)}–{minToHhmm(job.end_minute)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Crew Executed</span>
                    <span className="font-bold text-slate-900">{job.assigned_teams.join(', ') || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Block Possession</span>
                    <span className="font-bold text-slate-900">{job.block_ids.join(' + ')}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 gap-2 flex-wrap">
                  <span>
                    Asset <strong className="font-mono">{job.asset_id}</strong> • Neev risk at planning{' '}
                    <strong>{job.risk_score.toFixed(1)}</strong> ({job.risk_level})
                  </span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1 font-sans">
                    <ShieldCheck size={13} />
                    Possession handed back
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
