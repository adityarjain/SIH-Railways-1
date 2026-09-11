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
      <div className="bg-surface-panel rounded-lg border border-line p-4  text-xs text-rail-500">
        No concurrent bundles in the current plan.
      </div>
    );
  }

  const p = pairs[Math.min(index, pairs.length - 1)];
  const windowStart = p.possession_window.start_minute;
  const windowEnd = p.possession_window.end_minute;
  const span = Math.max(1, windowEnd - windowStart);

  return (
    <div className="bg-surface-panel rounded-lg border border-line p-4  space-y-3">
      <div className="flex items-center justify-between border-b border-line-subtle pb-2.5 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-bundle" />
          <h4 className="text-xs font-bold text-rail-900 uppercase tracking-wider">
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
                    ? 'bg-bundle text-white'
                    : 'bg-surface-sunken text-rail-600 hover:bg-line'
                }`}
              >
                {cand.section_id}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="text-[11px] text-rail-500">
        {p.section_id} — {p.section_name} ({p.corridor_name}) · {p.date}
      </div>

      <div className="p-3 rounded-lg bg-surface-sunken border border-line/80 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-rail-600">
          <span>
            Shared possession: <strong className="text-rail-900">{p.shared_block_ids.join(' + ')}</strong>
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
                <span className="font-mono font-bold text-rail-900">{t.task_id}</span>
                <span className="text-rail-500">
                  {t.department} · {t.maintenance_type || '—'}
                </span>
              </div>
              {/* Bar geometry is the task's real interval within the possession. */}
              <div className="h-4 w-full bg-line rounded relative overflow-hidden">
                <div
                  className="absolute h-full bg-bundle "
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-rail-500 font-mono">
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

      <div className="text-[11px] text-rail-600 space-y-0.5">
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
        <div className="text-rail-400 pt-0.5">
          Derived from the committed plan; no saving or efficiency figure is claimed.
        </div>
      </div>
    </div>
  );
};
