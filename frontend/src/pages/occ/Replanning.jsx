import React from 'react';
import { usePlan } from '../../context/PlanContext';
import {
  Panel, PanelHeader, PanelBody, MetricRow, StatusBadge, Button,
  Alert, EmptyState, ScopeCaption, ProvenanceNote,
} from '../../components/ui';
import { minToHhmm } from '../../utils/time';

const Row = ({ label, value, mono = true, tone }) => (
  <div className="px-3 py-2 border-b border-line last:border-b-0 flex items-center justify-between gap-3">
    <span className="text-xs text-rail-600">{label}</span>
    <span className={`${mono ? 'font-mono' : ''} text-[11px] font-semibold text-right ${tone || 'text-rail-900'}`}>
      {value}
    </span>
  </div>
);

/**
 * Replanning audit — before, disruption, after.
 *
 * Every value is read from replan_metadata. The previous version hardcoded both
 * outer columns as string literals, so the screen would keep asserting the old
 * window even if the engine produced a different one.
 */
export const Replanning = ({ onNavigate }) => {
  const { isReplanned, toggleReplan, replanMetadata, baselineMetrics } = usePlan();

  if (!replanMetadata) {
    return (
      <Panel>
        <PanelHeader title="Replanning audit" />
        <EmptyState title="No replan has been recorded." />
      </Panel>
    );
  }

  const m = replanMetadata;
  const before = m.original_plan || {};
  const after = m.replanned_plan || {};
  const ev = m.event || {};
  const retention = m.unaffected_plan_retention || {};
  const overlap = m.overlap_window || [];
  const overlapMins = overlap.length === 2 ? overlap[1] - overlap[0] : null;

  const win = (p) => (p.start_minute != null ? `${minToHhmm(p.start_minute)} – ${minToHhmm(p.end_minute)}` : '—');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="t-section-title">Replanning</h2>
          <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
            The original possession, the disruption that invalidated it, and the re-optimized
            result. Closed-loop audit of one replan cycle.
          </p>
        </div>
        <div className="flex items-stretch border border-line">
          <button
            onClick={() => toggleReplan(false)}
            className={`px-3 py-1.5 text-[10px] font-semibold transition-colors ${
              !isReplanned ? 'bg-rail-900 text-white' : 'bg-surface-panel text-rail-500 hover:bg-surface-sunken'
            }`}
          >
            ORIGINAL PLAN
          </button>
          <button
            onClick={() => toggleReplan(true)}
            className={`px-3 py-1.5 text-[10px] font-semibold transition-colors ${
              isReplanned ? 'bg-status-warn text-white' : 'bg-surface-panel text-rail-500 hover:bg-surface-sunken'
            }`}
          >
            REPLANNED
          </button>
        </div>
      </div>

      {/* three-column comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* 1 — before */}
        <Panel className={!isReplanned ? 'border-status-info' : ''}>
          <PanelHeader
            title="1 · Original possession"
            scope="As first solved"
            action={<StatusBadge tone={isReplanned ? 'idle' : 'info'} size="sm">{isReplanned ? 'superseded' : 'active'}</StatusBadge>}
          />
          <Row label="Task" value={m.affected_task_id} />
          <Row label="Date" value={before.date} />
          <Row label="Window" value={win(before)} />
          <Row label="Blocks" value={(before.block_ids || []).join(' + ')} />
          <Row label="Crew" value={(before.assigned_teams || []).join(', ')} />
          <PanelBody className="border-t border-line">
            <p className="text-[10px] text-rail-500 leading-relaxed">
              This solution satisfied every hard constraint at the time it was produced. The
              disruption is new information, not a solver error.
            </p>
          </PanelBody>
        </Panel>

        {/* 2 — disruption */}
        <Panel className="border-status-warn">
          <PanelHeader
            title="2 · Disruption"
            scope={`${m.conflict_type} · ${ev.event_id || ''}`}
            action={<StatusBadge tone="critical" size="sm">conflict</StatusBadge>}
          />
          <Row label="Train" value={ev.train_id} />
          <Row label="Section / date" value={`${ev.section_id} · ${ev.date}`} />
          <Row
            label="Train occupancy"
            value={ev.arrival_minute != null ? `${minToHhmm(ev.arrival_minute)} – ${minToHhmm(ev.departure_minute)}` : '—'}
          />
          <Row
            label="Overlap"
            value={overlapMins != null ? `${overlapMins} min (${minToHhmm(overlap[0])}–${minToHhmm(overlap[1])})` : '—'}
            tone="text-status-critical"
          />
          <Row label="Affected trains" value={(m.affected_trains || []).join(', ') || '—'} />

          <PanelBody className="border-t border-line space-y-2">
            <div>
              <span className="t-label">Reroute search</span>
              <div className="mt-1 space-y-1">
                {(m.rejected_routes || []).map((r) => (
                  <div key={r.path} className="text-[10px] leading-relaxed">
                    <span className="font-mono text-rail-700">{r.path}</span>
                    <span className="block text-status-critical">{r.reason}</span>
                  </div>
                ))}
                {(m.rejected_routes || []).length === 0 && (
                  <div className="text-[10px] text-rail-400">No bypass candidates recorded.</div>
                )}
              </div>
            </div>
            <div className="pt-1 border-t border-line-subtle text-[10px] text-rail-600 leading-relaxed">
              Hold considered: {m.hold_attempted ? 'yes' : 'no'} · selected:{' '}
              {m.hold_selected ? 'yes' : 'no'} (limit {m.hold_limit_minutes} min).
              {' '}With no feasible bypass and no permissible hold, the possession must move.
            </div>
          </PanelBody>
        </Panel>

        {/* 3 — after */}
        <Panel className={isReplanned ? 'border-status-warn' : ''}>
          <PanelHeader
            title="3 · Re-optimized possession"
            scope={`Action: ${m.action_taken}`}
            action={<StatusBadge tone={isReplanned ? 'warn' : 'idle'} size="sm">{isReplanned ? 'active' : 'preview'}</StatusBadge>}
          />
          <Row label="Task" value={m.affected_task_id} />
          <Row label="Date" value={after.date} tone="text-status-warn" />
          <Row label="Window" value={win(after)} tone="text-status-warn" />
          <Row label="Blocks" value={(after.block_ids || []).join(' + ')} />
          <Row label="Crew" value={(m.selected_crew || after.assigned_teams || []).join(', ')} />
          <PanelBody className="border-t border-line">
            <p className="text-[10px] text-rail-500 leading-relaxed">
              The conflicted blocks were excluded and the task re-solved under the same model and
              the same objective. Runtime {m.replan_runtime_seconds}s (measured; varies per run).
            </p>
          </PanelBody>
        </Panel>
      </div>

      {/* audit record */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel>
          <PanelHeader title="Replan audit record" scope="Produced by the closed-loop run" />
          <MetricRow label="Action taken" value={m.action_taken} />
          <MetricRow label="Rerouting attempted" value={m.rerouting_attempted ? 'Yes' : 'No'} />
          <MetricRow label="Routes inspected" value={m.rerouting_candidates_inspected} sub={`${(m.rejected_routes || []).length} rejected`} />
          <MetricRow label="Rerouting succeeded" value={m.rerouting_succeeded ? 'Yes' : 'No'} tone={m.rerouting_succeeded ? 'ok' : 'critical'} />
          <MetricRow label="Hold selected" value={m.hold_selected ? 'Yes' : 'No'} sub={`limit ${m.hold_limit_minutes} min`} />
          <MetricRow label="Replan runtime" value={`${m.replan_runtime_seconds} s`} sub="wall time, varies per run" />
          <MetricRow label="Baseline plan untouched" value={m.baseline_plan_untouched ? 'Yes' : 'No'} tone="ok" sub="replanning writes only to replan_output/" />
          <MetricRow label="Post-solve validation" value={baselineMetrics?.provenance?.post_solve_validation || 'not recorded'} tone="ok" />
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Plan retention" scope={`${retention.tasks_in_plan ?? '—'} tasks in plan`} />
            <MetricRow label="Re-solved" value={retention.tasks_re_solved ?? '—'} tone="warn" />
            <MetricRow label="Unchanged" value={retention.tasks_unchanged ?? '—'} tone="ok" />
            <MetricRow label="Retention" value={`${retention.retention_percent ?? '—'}%`} sub={`basis: ${retention.basis || '—'}`} />
          </Panel>

          {retention.caveat && (
            <Alert tone="idle" title="Retention is by construction, not a benchmark">
              {retention.caveat}
            </Alert>
          )}

          <Alert tone="info" title="The replan is deterministic">
            The solve is pinned to one search worker with a fixed seed, because several crews were
            equally optimal for the chosen window and parallel workers broke that tie differently
            each run. The model and objective are unchanged.
            <Button size="sm" variant="ghost" className="ml-2" onClick={() => onNavigate && onNavigate('live-ops')}>
              View live operations
            </Button>
          </Alert>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ScopeCaption>
          Scenario scope · artifacts written to {m.replan_artifacts_directory}/
        </ScopeCaption>
        <ProvenanceNote
          generatedBy="scripts/generate_ritvik_scenarios.py"
          command="PYTHONPATH=. python demo_closed_loop.py"
          note="The committed baseline plan is an input and is never modified by replanning."
        />
      </div>
    </div>
  );
};
