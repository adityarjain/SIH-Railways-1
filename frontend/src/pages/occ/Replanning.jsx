import React from 'react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
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
  const { t } = useI18n();

  if (!replanMetadata) {
    return (
      <Panel>
        <PanelHeader title={t('replanning.auditRecord')} />
        <EmptyState title={t('replanning.noReplan')} />
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
          <h2 className="t-section-title">{t('replanning.title')}</h2>
          <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
            {t('replanning.subtitle')}
          </p>
        </div>
        <div className="flex items-stretch border border-line">
          <button
            onClick={() => toggleReplan(false)}
            className={`px-3 py-1.5 text-[10px] font-semibold transition-colors ${
              !isReplanned ? 'bg-rail-900 text-white' : 'bg-surface-panel text-rail-500 hover:bg-surface-sunken'
            }`}
          >
            {t('replanning.showOriginal')}
          </button>
          <button
            onClick={() => toggleReplan(true)}
            className={`px-3 py-1.5 text-[10px] font-semibold transition-colors ${
              isReplanned ? 'bg-status-warn text-white' : 'bg-surface-panel text-rail-500 hover:bg-surface-sunken'
            }`}
          >
            {t('replanning.showReplanned')}
          </button>
        </div>
      </div>

      {/* three-column comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* 1 — before */}
        <Panel className={!isReplanned ? 'border-status-info' : ''}>
          <PanelHeader
            title={t('replanning.step1')}
            scope={t('replanning.step1Scope')}
            action={<StatusBadge tone={isReplanned ? 'idle' : 'info'} size="sm">{isReplanned ? t('status.superseded') : t('status.active')}</StatusBadge>}
          />
          <Row label={t('common.task')} value={m.affected_task_id} />
          <Row label={t('common.date')} value={before.date} />
          <Row label={t('common.window')} value={win(before)} />
          <Row label={t('common.blocks')} value={(before.block_ids || []).join(' + ')} />
          <Row label={t('common.crew')} value={(before.assigned_teams || []).join(', ')} />
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
            title={t('replanning.step2')}
            scope={`${m.conflict_type} · ${ev.event_id || ''}`}
            action={<StatusBadge tone="critical" size="sm">{t('status.conflict')}</StatusBadge>}
          />
          <Row label={t('replanning.train')} value={ev.train_id} />
          <Row label={t('replanning.sectionDate')} value={`${ev.section_id} · ${ev.date}`} />
          <Row
            label={t('replanning.trainOccupancy')}
            value={ev.arrival_minute != null ? `${minToHhmm(ev.arrival_minute)} – ${minToHhmm(ev.departure_minute)}` : '—'}
          />
          <Row
            label={t('replanning.overlap')}
            value={overlapMins != null ? `${overlapMins} min (${minToHhmm(overlap[0])}–${minToHhmm(overlap[1])})` : '—'}
            tone="text-status-critical"
          />
          <Row label={t('replanning.affectedTrains')} value={(m.affected_trains || []).join(', ') || '—'} />

          <PanelBody className="border-t border-line space-y-2">
            <div>
              <span className="t-label">{t('replanning.rerouteSearch')}</span>
              <div className="mt-1 space-y-1">
                {(m.rejected_routes || []).map((r) => (
                  <div key={r.path} className="text-[10px] leading-relaxed">
                    <span className="font-mono text-rail-700">{r.path}</span>
                    <span className="block text-status-critical">{r.reason}</span>
                  </div>
                ))}
                {(m.rejected_routes || []).length === 0 && (
                  <div className="text-[10px] text-rail-400">{t('replanning.noBypassCandidates')}</div>
                )}
              </div>
            </div>
            <div className="pt-1 border-t border-line-subtle text-[10px] text-rail-600 leading-relaxed">
              Hold considered: {m.hold_attempted ? t('common.yes') : t('common.no')} · selected:{' '}
              {m.hold_selected ? 'yes' : 'no'} (limit {m.hold_limit_minutes} min).
              {' '}With no feasible bypass and no permissible hold, the possession must move.
            </div>
          </PanelBody>
        </Panel>

        {/* 3 — after */}
        <Panel className={isReplanned ? 'border-status-warn' : ''}>
          <PanelHeader
            title={t('replanning.step3')}
            scope={t('replanning.step3Scope', { action: m.action_taken })}
            action={<StatusBadge tone={isReplanned ? 'warn' : 'idle'} size="sm">{isReplanned ? t('status.active') : t('status.preview')}</StatusBadge>}
          />
          <Row label={t('common.task')} value={m.affected_task_id} />
          <Row label={t('common.date')} value={after.date} tone="text-status-warn" />
          <Row label={t('common.window')} value={win(after)} tone="text-status-warn" />
          <Row label={t('common.blocks')} value={(after.block_ids || []).join(' + ')} />
          <Row label={t('common.crew')} value={(m.selected_crew || after.assigned_teams || []).join(', ')} />
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
          <PanelHeader title={t('replanning.auditRecord')} scope={t('replanning.auditScope')} />
          <MetricRow label={t('replanning.actionTaken')} value={m.action_taken} />
          <MetricRow label={t('replanning.reroutingAttempted')} value={m.rerouting_attempted ? t('common.yes') : t('common.no')} />
          <MetricRow label={t('replanning.routesInspected')} value={m.rerouting_candidates_inspected} sub={`${(m.rejected_routes || []).length} rejected`} />
          <MetricRow label={t('replanning.reroutingSucceeded')} value={m.rerouting_succeeded ? t('common.yes') : t('common.no')} tone={m.rerouting_succeeded ? 'ok' : 'critical'} />
          <MetricRow label={t('replanning.holdSelected')} value={m.hold_selected ? t('common.yes') : t('common.no')} sub={`limit ${m.hold_limit_minutes} min`} />
          <MetricRow label={t('replanning.replanRuntime')} value={`${m.replan_runtime_seconds} s`} sub={t('replanning.runtimeSub')} />
          <MetricRow label={t('replanning.baselineUntouched')} value={m.baseline_plan_untouched ? t('common.yes') : t('common.no')} tone="ok" sub={t('replanning.baselineSub')} />
          <MetricRow label={t('overview.postSolveValidation')} value={baselineMetrics?.provenance?.post_solve_validation || 'not recorded'} tone="ok" />
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title={t('replanning.retention')} scope={`${retention.tasks_in_plan ?? '—'} tasks in plan`} />
            <MetricRow label={t('replanning.reSolved')} value={retention.tasks_re_solved ?? '—'} tone="warn" />
            <MetricRow label={t('replanning.unchanged')} value={retention.tasks_unchanged ?? '—'} tone="ok" />
            <MetricRow label={t('replanning.retentionPct')} value={`${retention.retention_percent ?? '—'}%`} sub={`basis: ${retention.basis || '—'}`} />
          </Panel>

          {retention.caveat && (
            <Alert tone="idle" title={t('replanning.retentionCaveatTitle')}>
              {retention.caveat}
            </Alert>
          )}

          <Alert tone="info" title={t('replanning.deterministicTitle')}>
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
