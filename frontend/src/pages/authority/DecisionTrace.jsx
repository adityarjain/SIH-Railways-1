import React from 'react';
import {
  Panel, PanelHeader, PanelBody, MetricRow, Metric, Alert,
  DataTable, StatusBadge, ProvenanceNote,
} from '../../components/ui';
import trace from '../../data/decision_trace.json';

const STATUS_TONE = { SELECTED: 'ok', FEASIBLE: 'info', REJECTED: 'critical' };

const RULE_LABEL = {
  C001: 'C001 duration coverage',
  C002: 'C002 train conflict',
  C003: 'C003 track unavailable',
  'C001 / S002': 'C001/S002 duration & contiguity',
  S002: 'S002 contiguity',
  S005: 'S005 shift window',
  S006: 'S006 skill match',
};

/**
 * The optimizer's reasoning for one possession, candidate by candidate.
 *
 * This is the screen that answers "why this block?" — the trace is published for
 * the worked example only, and the page says so rather than implying every task
 * carries one.
 */
export const DecisionTrace = () => {
  const req = trace.request || {};
  const sum = trace.candidate_summary || {};
  const risk = trace.risk_signal || {};
  const sel = trace.selected || {};
  const impact = trace.train_impact || {};
  const byRule = sum.rejected_by_rule || {};

  return (
    <div className="space-y-4">
      <div>
        <h2 className="t-section-title">Decision Trace</h2>
        <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
          Every candidate block window evaluated for a possession, with the constraint that
          rejected each one. Computed from the dataset, so each rejection can be checked
          against the row that caused it.
        </p>
      </div>

      <Panel>
        <PanelHeader
          title={`Assignment trace — ${req.task_id}`}
          scope={`${req.section_id} · ${req.section_name} · ${sum.date_evaluated}`}
          action={<StatusBadge tone="ok">Feasible assignment</StatusBadge>}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line">
          <div className="bg-surface-panel p-3"><Metric label="Windows considered" value={sum.block_windows_considered} /></div>
          <div className="bg-surface-panel p-3"><Metric label="Rejected" value={sum.rejected} tone="critical" /></div>
          <div className="bg-surface-panel p-3"><Metric label="Feasible" value={sum.feasible} tone="ok" /></div>
          <div className="bg-surface-panel p-3"><Metric label="Selected" value={(sel.block_ids || []).length} sub="chained blocks" /></div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel>
          <PanelHeader title="1 · Maintenance requirement" scope="maintenance_tasks.csv" />
          <MetricRow label="Type" value={req.maintenance_type} />
          <MetricRow label="Department" value={req.department} />
          <MetricRow label="Duration" value={`${req.required_duration_minutes} min`} sub={`${req.blocks_required} chained blocks`} />
          <MetricRow label="Crew required" value={req.required_team_size} />
          <MetricRow label="Deadline" value={req.deadline} tone="warn" />
        </Panel>

        <Panel>
          <PanelHeader title="2 · Risk assessment" scope="Maintenance risk model" />
          <MetricRow label="Risk score" value={risk.risk_score?.toFixed?.(1) ?? risk.risk_score} tone="critical" sub={risk.risk_level} />
          <MetricRow label="30-day failure probability" value={risk.failure_probability_30d != null ? `${(risk.failure_probability_30d * 100).toFixed(2)}%` : '—'} />
          <MetricRow label="Composite priority" value={risk.priority_score} />
          <PanelBody className="border-t border-line">
            {/* The artifact records the source as a model name plus a file; cite
                the file, which is the verifiable part. */}
            <div className="font-mono text-[9px] text-rail-400 break-all">
              source: {risk.source?.match(/\(([^)]+)\)/)?.[1] || 'neev_predictions_for_optimizer.csv'}
            </div>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="3 · Constraint check" scope="Rejections by rule" />
          {Object.entries(byRule).map(([rule, count]) => (
            <MetricRow key={rule} label={RULE_LABEL[rule] || rule} value={count} tone="critical" />
          ))}
          <PanelBody className="border-t border-line">
            <p className="text-[10px] text-rail-500 leading-relaxed">
              Every rejection cites the dataset row that caused it — a train occupancy, an
              unavailable track, or a window too short to cover the task.
            </p>
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="4 · Candidate evaluation" scope={`All ${(trace.candidates || []).length} windows, in evaluation order`} />
        <DataTable
          getKey={(c) => (c.block_ids || []).join('-') + c.window}
          rowClassName={(c) => (c.status === 'SELECTED' ? 'bg-status-ok-tint' : '')}
          columns={[
            { key: 'block_ids', header: 'Block window', render: (c) => (
              <span className="font-mono text-[11px]">{(c.block_ids || []).join(' + ')}</span>
            ) },
            { key: 'window', header: 'Time', render: (c) => <span className="font-mono text-[11px]">{c.window}</span> },
            { key: 'status', header: 'Status', render: (c) => (
              <StatusBadge tone={STATUS_TONE[c.status] || 'idle'} size="sm">{c.status}</StatusBadge>
            ) },
            { key: 'rule', header: 'Rule', render: (c) => (
              c.rule ? <span className="font-mono text-[10px] text-status-critical">{c.rule}</span> : <span className="text-rail-400">—</span>
            ) },
            { key: 'reason', header: 'Reason', render: (c) => (
              <span className="text-[11px] text-rail-600">{c.reason}</span>
            ) },
          ]}
          rows={trace.candidates || []}
        />
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel>
          <PanelHeader title="5 · Selected assignment" scope="Optimization recommendation" />
          <MetricRow label="Block window" value={(sel.block_ids || []).join(' + ')} tone="ok" />
          <MetricRow label="Date / time" value={`${sel.date} · ${sel.window}`} />
          <MetricRow label="Crew" value={(sel.teams || []).map((t) => t.team_id || t).join(', ')} />
          {(sel.teams || []).map((t) => (
            typeof t === 'object' ? (
              <MetricRow
                key={t.team_id}
                label={`${t.team_id} shift`}
                value={t.shift || '—'}
                sub={t.team_size != null ? `crew ${t.team_size} vs ${req.required_team_size} required` : undefined}
              />
            ) : null
          ))}
        </Panel>

        <Panel>
          <PanelHeader title="6 · Train impact" scope="Affected services for this window" />
          <MetricRow label="Conflicting services" value={(impact.conflicting || []).length} tone={(impact.conflicting || []).length ? 'critical' : 'ok'} sub="blocks the possession (C002)" />
          <MetricRow label="Adjacent services" value={(impact.adjacent || []).length} tone="ok" sub={`within ±${impact.adjacency_buffer_minutes ?? 60} min (C008 weight)`} />
          <MetricRow label="Estimated delay" value="0 min" tone="ok" sub="no service is displaced by this possession" />
          <PanelBody className="border-t border-line">
            <p className="text-[10px] text-rail-500 leading-relaxed">{impact.note}</p>
          </PanelBody>
        </Panel>
      </div>

      {trace.explanation && (
        <Alert tone="info" title="Why this window was preferred">{trace.explanation}</Alert>
      )}

      <Alert tone="idle" title="One published trace">
        The trace is generated for the worked example. Other tasks are scheduled by the same
        model and the same constraints, but their candidate-by-candidate traces are not
        committed to this repository.
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
