import React from 'react';
import { useI18n } from '../../i18n';
import {
  Panel, PanelHeader, PanelBody, MetricRow, Metric, Alert,
  DataTable, StatusBadge, ProvenanceNote,
} from '../../components/ui';
import trace from '../../data/decision_trace.json';

const STATUS_TONE = { SELECTED: 'ok', FEASIBLE: 'info', REJECTED: 'critical' };

const RULE_KEY = {
  C001: 'decisionTrace.ruleC001',
  C002: 'decisionTrace.ruleC002',
  C003: 'decisionTrace.ruleC003',
  'C001 / S002': 'decisionTrace.ruleC001S002',
  S002: 'decisionTrace.ruleS002',
  S005: 'decisionTrace.ruleS005',
  S006: 'decisionTrace.ruleS006',
};

/**
 * The optimizer's reasoning for one possession, candidate by candidate.
 *
 * This is the screen that answers "why this block?" — the trace is published for
 * the worked example only, and the page says so rather than implying every task
 * carries one.
 */
export const DecisionTrace = () => {
  const { t: tx } = useI18n();
  const req = trace.request || {};
  const sum = trace.candidate_summary || {};
  const risk = trace.risk_signal || {};
  const sel = trace.selected || {};
  const impact = trace.train_impact || {};
  const byRule = sum.rejected_by_rule || {};

  return (
    <div className="space-y-4">
      <div>
        <h2 className="t-section-title">{tx('decisionTrace.title')}</h2>
        <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
          {tx('decisionTrace.subtitle')}
        </p>
      </div>

      <Panel>
        <PanelHeader
          title={tx('decisionTrace.assignmentTrace', { task: req.task_id })}
          scope={`${req.section_id} · ${req.section_name} · ${sum.date_evaluated}`}
          action={<StatusBadge tone="ok">{tx('decisionTrace.feasibleAssignment')}</StatusBadge>}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line">
          <div className="bg-surface-panel p-3"><Metric label={tx('decisionTrace.windowsConsidered')} value={sum.block_windows_considered} /></div>
          <div className="bg-surface-panel p-3"><Metric label={tx('decisionTrace.rejected')} value={sum.rejected} tone="critical" /></div>
          <div className="bg-surface-panel p-3"><Metric label={tx('decisionTrace.feasible')} value={sum.feasible} tone="ok" /></div>
          <div className="bg-surface-panel p-3"><Metric label={tx('decisionTrace.selected')} value={(sel.block_ids || []).length} sub={tx('decisionTrace.chainedBlocks')} /></div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel>
          <PanelHeader title={tx('decisionTrace.s1')} scope="maintenance_tasks.csv" />
          <MetricRow label={tx('common.type')} value={req.maintenance_type} />
          <MetricRow label={tx('common.department')} value={req.department} />
          <MetricRow label={tx('common.duration')} value={`${req.required_duration_minutes} ${tx('common.min')}`} sub={`${req.blocks_required} ${tx('decisionTrace.chainedBlocks')}`} />
          <MetricRow label={tx('demand.crewRequired')} value={req.required_team_size} />
          <MetricRow label={tx('common.deadline')} value={req.deadline} tone="warn" />
        </Panel>

        <Panel>
          <PanelHeader title={tx('decisionTrace.s2')} scope={tx('decisionTrace.s2Scope')} />
          <MetricRow label={tx('risk.score')} value={risk.risk_score?.toFixed?.(1) ?? risk.risk_score} tone="critical" sub={risk.risk_level} />
          <MetricRow label={tx('risk.failureProb30')} value={risk.failure_probability_30d != null ? `${(risk.failure_probability_30d * 100).toFixed(2)}%` : '—'} />
          <MetricRow label={tx('common.priority')} value={risk.priority_score} />
          <PanelBody className="border-t border-line">
            {/* The artifact records the source as a model name plus a file; cite
                the file, which is the verifiable part. */}
            <div className="font-mono text-[9px] text-rail-400 break-all">
              {tx('common.source')}: {risk.source?.match(/\(([^)]+)\)/)?.[1] || 'neev_predictions_for_optimizer.csv'}
            </div>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title={tx('decisionTrace.s3')} scope={tx('decisionTrace.s3Scope')} />
          {Object.entries(byRule).map(([rule, count]) => (
            <MetricRow key={rule} label={RULE_KEY[rule] ? tx(RULE_KEY[rule]) : rule} value={count} tone="critical" />
          ))}
          <PanelBody className="border-t border-line">
            <p className="text-[10px] text-rail-500 leading-relaxed">
              {tx('decisionTrace.s3Note')}
            </p>
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title={tx('decisionTrace.s4')} scope={tx('decisionTrace.s4Scope', { count: (trace.candidates || []).length })} />
        <DataTable
          getKey={(c) => (c.block_ids || []).join('-') + c.window}
          rowClassName={(c) => (c.status === 'SELECTED' ? 'bg-status-ok-tint' : '')}
          columns={[
            { key: 'block_ids', header: tx('decisionTrace.blockWindow'), render: (c) => (
              <span className="font-mono text-[11px]">{(c.block_ids || []).join(' + ')}</span>
            ) },
            { key: 'window', header: tx('common.time'), render: (c) => <span className="font-mono text-[11px]">{c.window}</span> },
            { key: 'status', header: tx('common.status'), render: (c) => (
              <StatusBadge tone={STATUS_TONE[c.status] || 'idle'} size="sm">{c.status}</StatusBadge>
            ) },
            { key: 'rule', header: tx('common.rule'), render: (c) => (
              c.rule ? <span className="font-mono text-[10px] text-status-critical">{c.rule}</span> : <span className="text-rail-400">—</span>
            ) },
            { key: 'reason', header: tx('common.reason'), render: (c) => (
              <span className="text-[11px] text-rail-600">{c.reason}</span>
            ) },
          ]}
          rows={trace.candidates || []}
        />
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel>
          <PanelHeader title={tx('decisionTrace.s5')} scope={tx('decisionTrace.s5Scope')} />
          <MetricRow label={tx('decisionTrace.blockWindow')} value={(sel.block_ids || []).join(' + ')} tone="ok" />
          <MetricRow label={tx('decisionTrace.dateTime')} value={`${sel.date} · ${sel.window}`} />
          <MetricRow label={tx('common.crew')} value={(sel.teams || []).map((tm) => tm.team_id || tm).join(', ')} />
          {(sel.teams || []).map((tm) => (
            typeof tm === 'object' ? (
              <MetricRow
                key={tm.team_id}
                label={tx('decisionTrace.shift', { team: tm.team_id })}
                value={tm.shift || '—'}
                sub={tm.team_size != null ? tx('decisionTrace.crewVs', { size: tm.team_size, required: req.required_team_size }) : undefined}
              />
            ) : null
          ))}
        </Panel>

        <Panel>
          <PanelHeader title={tx('decisionTrace.s6')} scope={tx('decisionTrace.s6Scope')} />
          <MetricRow label={tx('overview.conflictingServices')} value={(impact.conflicting || []).length} tone={(impact.conflicting || []).length ? 'critical' : 'ok'} sub={tx('decisionTrace.blocksPossession')} />
          <MetricRow label={tx('overview.adjacentServices')} value={(impact.adjacent || []).length} tone="ok" sub={tx('decisionTrace.withinBuffer', { min: impact.adjacency_buffer_minutes ?? 60 })} />
          <MetricRow label={tx('overview.estimatedDelay')} value={`0 ${tx('common.min')}`} tone="ok" sub={tx('decisionTrace.noDisplaced')} />
          <PanelBody className="border-t border-line">
            <p className="text-[10px] text-rail-500 leading-relaxed">{impact.note}</p>
          </PanelBody>
        </Panel>
      </div>

      {trace.explanation && (
        <Alert tone="info" title={tx('decisionTrace.whyPreferred')}>{trace.explanation}</Alert>
      )}

      <Alert tone="idle" title={tx('decisionTrace.onePublishedTitle')}>
        {tx('decisionTrace.onePublishedBody')}
      </Alert>

      <Panel>
        <PanelBody>
          <ProvenanceNote
            generatedBy={trace.provenance?.dataset}
            command={`PYTHONPATH=. python scripts/generate_decision_trace.py ${req.task_id}`}
            dataset={trace.provenance?.dataset}
          />
        </PanelBody>
      </Panel>
    </div>
  );
};
