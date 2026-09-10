import React, { useState } from 'react';
import { Layers, Users } from 'lucide-react';
import { Badge } from '../common/Badge';
import bundlingData from '../../data/bundling.json';
import { minToHhmm } from '../../utils/time';

/**
 * Concurrent bundle pairs, read from the committed plan
 * (scripts/generate_bundling.py).
 *
 * Deliberately absent: "minutes of disruption saved" and any efficiency
 * percentage. Those require an unbundled counterfactual plan, which this
 * repository does not produce, so they would be invented rather than measured.
 */
export const BundlingView = () => {
  const pairs = bundlingData.concurrent_bundle_pairs || [];
  const [index, setIndex] = useState(0);

  if (pairs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs text-xs text-slate-500">
        No concurrent bundles in the current plan.
      </div>
    );
  }

  const p = pairs[Math.min(index, pairs.length - 1)];
  const windowStart = p.possession_window.start_minute;
  const windowEnd = p.possession_window.end_minute;
  const span = Math.max(1, windowEnd - windowStart);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-purple-600" />
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Cross-Department Bundling
          </h4>
          <Badge variant="primary" size="sm">
            {pairs.length} pair{pairs.length === 1 ? '' : 's'} in plan
          </Badge>
        </div>
        {pairs.length > 1 && (
          <div className="flex items-center gap-1">
            {pairs.map((cand, i) => (
              <button
                key={cand.section_id + cand.date}
                onClick={() => setIndex(i)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold font-mono transition-colors ${
                  i === index
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cand.section_id}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="text-[11px] text-slate-500">
        {p.section_id} — {p.section_name} ({p.corridor_name}) · {p.date}
      </div>

      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-600">
          <span>
            Shared possession: <strong className="text-slate-900">{p.shared_block_ids.join(' + ')}</strong>
          </span>
          <span>
            {minToHhmm(windowStart)} – {minToHhmm(windowEnd)}
          </span>
        </div>

        {p.tasks.map((t) => {
          const left = ((t.start_minute - windowStart) / span) * 100;
          const width = ((t.end_minute - t.start_minute) / span) * 100;
          return (
            <div key={t.task_id} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono font-bold text-slate-900">{t.task_id}</span>
                <span className="text-slate-500">
                  {t.department} · {t.maintenance_type || '—'}
                </span>
              </div>
              {/* Bar geometry is the task's real interval within the possession. */}
              <div className="h-4 w-full bg-slate-200/70 rounded relative overflow-hidden">
                <div
                  className="absolute h-full bg-purple-500/80 rounded"
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>
                  {minToHhmm(t.start_minute)} – {minToHhmm(t.end_minute)} ({t.duration_minutes} min)
                </span>
                <span className="flex items-center gap-1">
                  <Users size={10} /> {t.assigned_teams.join(', ') || '—'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[11px] text-slate-600 space-y-0.5">
        <div>
          • Concurrent overlap: <strong>{p.overlap_minutes} min</strong>
          {p.minimum_overlap_required_minutes != null && (
            <> ≥ {p.minimum_overlap_required_minutes} min required (S008)</>
          )}
        </div>
        <div>
          • Department compatibility (C006):{' '}
          <strong>{p.departments_compatible ?? 'not specified'}</strong> for{' '}
          {p.tasks[0].department} + {p.tasks[1].department}
        </div>
        <div className="text-slate-400 pt-0.5">
          Derived from the committed plan; no saving or efficiency figure is claimed.
        </div>
      </div>
    </div>
  );
};
