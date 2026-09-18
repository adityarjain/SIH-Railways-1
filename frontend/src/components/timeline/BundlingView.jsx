import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { useI18n } from '../../i18n';
import bundlingData from '../../data/live/bundling';
import { minToHhmm } from '../../utils/time';

/**
 * Concurrent bundle pairs, read from the committed plan
 * (scripts/generate_bundling.py). Body content only — the Maintenance
 * Blocks worksheet owns the numbered region header and pair count.
 *
 * Deliberately absent: "minutes of disruption saved" and any efficiency
 * percentage. Those require an unbundled counterfactual plan, which this
 * repository does not produce, so they would be invented rather than measured.
 */
export const BundlingView = () => {
  const { t } = useI18n();
  const pairs = bundlingData.concurrent_bundle_pairs || [];
  const [index, setIndex] = useState(0);

  if (pairs.length === 0) {
    return <div className="font-ws text-xs text-ws-mid">{t('maintenanceBlocks.noBundles')}</div>;
  }

  const p = pairs[Math.min(index, pairs.length - 1)];
  const windowStart = p.possession_window.start_minute;
  const windowEnd = p.possession_window.end_minute;
  const span = Math.max(1, windowEnd - windowStart);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-ws text-xs text-ws-mid">
          {p.section_id} — {p.section_name} ({p.corridor_name}) · {p.date}
        </span>
        {pairs.length > 1 && (
          <div className="flex items-center gap-1">
            {pairs.map((cand, i) => (
              <button
                key={cand.section_id + cand.date}
                onClick={() => setIndex(i)}
                className={`px-2 py-0.5 font-mono text-[11px] font-semibold border transition-colors ${
                  i === index
                    ? 'bg-ws-bundle text-white border-ws-bundle'
                    : 'bg-ws-surface text-ws-mid border-ws-rule hover:bg-ws-paper hover:text-ws-ink'
                }`}
              >
                {cand.section_id}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border border-ws-hairline bg-ws-dossier p-3 space-y-2">
        <div className="flex items-center justify-between font-mono text-[11px] text-ws-mid">
          <span>
            {t('maintenanceBlocks.sharedPossession')}: <strong className="text-ws-ink">{p.shared_block_ids.join(' + ')}</strong>
          </span>
          <span>{minToHhmm(windowStart)} – {minToHhmm(windowEnd)}</span>
        </div>

        {p.tasks.map((task) => {
          const left = ((task.start_minute - windowStart) / span) * 100;
          const width = ((task.end_minute - task.start_minute) / span) * 100;
          return (
            <div key={task.task_id} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono font-bold text-ws-ink">{task.task_id}</span>
                <span className="font-ws text-ws-mid">{task.department} · {task.maintenance_type || '—'}</span>
              </div>
              {/* Bar geometry is the task's real interval within the possession. */}
              <div className="h-3 w-full bg-ws-tick relative overflow-hidden">
                <div className="absolute h-full bg-ws-bundle" style={{ left: `${left}%`, width: `${width}%` }} />
              </div>
              <div className="flex items-center justify-between font-mono text-[10px] text-ws-light">
                <span>{minToHhmm(task.start_minute)} – {minToHhmm(task.end_minute)} ({task.duration_minutes} min)</span>
                <span className="flex items-center gap-1"><Users size={10} /> {(task.assigned_teams || []).join(', ') || '—'}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="font-ws text-xs text-ws-mid space-y-0.5">
        <div>{t('maintenanceBlocks.overlapMin', { min: p.overlap_minutes })}{p.minimum_overlap_required_minutes != null && (
          <> · {t('maintenanceBlocks.overlapRequired', { min: p.minimum_overlap_required_minutes })}</>
        )}</div>
        <div>{t('maintenanceBlocks.deptCompat', {
          value: p.departments_compatible ?? '—', a: p.tasks[0].department, b: p.tasks[1].department,
        })}</div>
        <div className="text-ws-light pt-0.5">{t('maintenanceBlocks.bundlingDisclaimer')}</div>
      </div>
    </div>
  );
};
