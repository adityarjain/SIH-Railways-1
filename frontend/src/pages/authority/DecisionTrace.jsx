import React from 'react';
import { useI18n } from '../../i18n';
import { RegionHeader, FieldRow, StatFigure, Pill, AdvisoryNote } from '../../components/ui/worksheet';
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
  const { t, isHindi } = useI18n();
  const req = trace.request || {};
  const sum = trace.candidate_summary || {};
  const risk = trace.risk_signal || {};
  const sel = trace.selected || {};
  const impact = trace.train_impact || {};
  const byRule = sum.rejected_by_rule || {};

  return (
    <div className="bg-ws-band min-h-full">
      <div className="bg-ws-paper border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-2.5">
        <p className="font-ws text-xs text-ws-mid max-w-3xl leading-relaxed">{t('decisionTrace.subtitle')}</p>
      </div>

      {/* 01 — assignment trace */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
        <RegionHeader
          number="01"
          title={t('decisionTrace.assignmentTrace', { task: req.task_id })}
          meta={`${req.section_id} · ${req.section_name} · ${sum.date_evaluated}`}
          isHindi={isHindi}
        />
        <div className="flex items-center gap-2.5 pb-1">
          <Pill tone="ok">{t('decisionTrace.feasibleAssignment')}</Pill>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-3.5 border-t border-ws-rule pt-3">
          <StatFigure value={sum.block_windows_considered} label={t('decisionTrace.windowsConsidered')} />
          <StatFigure value={sum.rejected} label={t('decisionTrace.rejected')} tone="text-ws-critical" />
          <StatFigure value={sum.feasible} label={t('decisionTrace.feasible')} tone="text-ws-ok" />
          <StatFigure value={(sel.block_ids || []).length} label={`${t('decisionTrace.selected')} · ${t('decisionTrace.chainedBlocks')}`} />
        </div>
      </div>

      {/* 02/03/04 — requirement / risk signal / rejections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 bg-ws-rule gap-px border-b border-ws-rule">
        <div className="bg-ws-surface px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
          <RegionHeader number="02" title={t('decisionTrace.s1')} meta="maintenance_tasks.csv" isHindi={isHindi} />
          <div className="border-t border-ws-rule">
            <FieldRow label={t('common.type')} value={req.maintenance_type} />
            <FieldRow label={t('common.department')} value={req.department} />
            <FieldRow label={t('common.duration')} value={`${req.required_duration_minutes} ${t('common.min')}`} />
            <FieldRow label={t('demand.crewRequired')} value={req.required_team_size} />
            <FieldRow label={t('common.deadline')} value={req.deadline} tone="text-ws-warn font-bold" />
          </div>
        </div>

        <div className="bg-ws-surface border-t border-ws-rule lg:border-t-0 px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
          <RegionHeader number="03" title={t('decisionTrace.s2')} meta={t('decisionTrace.s2Scope')} isHindi={isHindi} />
          <div className="border-t border-ws-rule">
            <FieldRow label={t('risk.score')} value={risk.risk_score?.toFixed?.(1) ?? risk.risk_score} tone="text-ws-critical font-bold" />
            <FieldRow label={t('risk.failureProb30')} value={risk.failure_probability_30d != null ? `${(risk.failure_probability_30d * 100).toFixed(2)}%` : '—'} />
            <FieldRow label={t('common.priority')} value={risk.priority_score} />
          </div>
          <div className="font-mono text-[9px] text-ws-light break-all pt-2">
            {t('common.source')}: {risk.source?.match(/\(([^)]+)\)/)?.[1] || 'neev_predictions_for_optimizer.csv'}
          </div>
        </div>

        <div className="bg-ws-surface border-t border-ws-rule lg:border-t-0 px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
          <RegionHeader number="04" title={t('decisionTrace.s3')} meta={t('decisionTrace.s3Scope')} isHindi={isHindi} />
          <div className="border-t border-ws-rule">
            {Object.entries(byRule).map(([rule, count]) => (
              <FieldRow key={rule} label={RULE_KEY[rule] ? t(RULE_KEY[rule]) : rule} value={count} tone="text-ws-critical font-bold" />
            ))}
          </div>
          <p className="font-ws text-[11px] text-ws-mid leading-relaxed pt-2">{t('decisionTrace.s3Note')}</p>
        </div>
      </div>

      {/* 05 — constraint check */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
        <RegionHeader number="05" title={t('decisionTrace.s4')} meta={t('decisionTrace.s4Scope', { count: (trace.candidates || []).length })} isHindi={isHindi} />
        <div className="border-t border-ws-rule">
          {(trace.candidates || []).map((c, i) => (
            <div
              key={`${(c.block_ids || []).join('-')}-${c.window}-${i}`}
              className={`grid grid-cols-[86px_70px_72px_minmax(0,1fr)] items-center gap-2 py-1.5 border-b border-ws-hairline last:border-b-0 ${c.status === 'SELECTED' ? 'bg-ws-selected' : ''}`}
            >
              <span className="font-mono text-[11px] font-medium text-ws-ink">{(c.block_ids || []).join(' + ')}</span>
              <span className="font-mono text-[11px] text-ws-body">{c.window}</span>
              <Pill tone={STATUS_TONE[c.status] || 'idle'} size="sm">{c.status}</Pill>
              <span className="font-ws text-[11px] text-ws-mid overflow-hidden text-ellipsis whitespace-nowrap">
                {c.rule && <span className="font-mono text-ws-critical mr-1.5">{c.rule}</span>}
                {c.reason}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 06/07 — selected assignment / train impact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 bg-ws-rule gap-px border-b border-ws-rule">
        <div className="bg-ws-surface px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
          <RegionHeader number="06" title={t('decisionTrace.s5')} meta={t('decisionTrace.s5Scope')} isHindi={isHindi} />
          <div className="border-t border-ws-rule">
            <FieldRow label={t('decisionTrace.blockWindow')} value={(sel.block_ids || []).join(' + ')} tone="text-ws-ok font-bold" />
            <FieldRow label={t('decisionTrace.dateTime')} value={`${sel.date} · ${sel.window}`} />
            <FieldRow label={t('common.crew')} value={(sel.teams || []).map((tm) => tm.team_id || tm).join(', ')} />
            {(sel.teams || []).map((tm) => (
              typeof tm === 'object' ? (
                <FieldRow
                  key={tm.team_id}
                  label={t('decisionTrace.shift', { team: tm.team_id })}
                  value={`${tm.shift || '—'}${tm.team_size != null ? ` · ${t('decisionTrace.crewVs', { size: tm.team_size, required: req.required_team_size })}` : ''}`}
                />
              ) : null
            ))}
          </div>
        </div>

        <div className="bg-ws-surface border-t border-ws-rule lg:border-t-0 px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
          <RegionHeader number="07" title={t('decisionTrace.s6')} meta={t('decisionTrace.s6Scope')} isHindi={isHindi} />
          <div className="border-t border-ws-rule">
            <FieldRow label={t('overview.conflictingServices')} value={(impact.conflicting || []).length} tone={(impact.conflicting || []).length ? 'text-ws-critical font-bold' : 'text-ws-ok font-bold'} />
            <FieldRow label={t('overview.adjacentServices')} value={(impact.adjacent || []).length} tone="text-ws-ok font-bold" />
            <FieldRow label={t('overview.estimatedDelay')} value={`0 ${t('common.min')}`} tone="text-ws-ok font-bold" />
          </div>
          <p className="font-ws text-[11px] text-ws-mid leading-relaxed pt-2">{impact.note}</p>
        </div>
      </div>

      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-3.5 space-y-2.5">
        {trace.explanation && <AdvisoryNote tone="info" title={t('decisionTrace.whyPreferred')}>{trace.explanation}</AdvisoryNote>}
        <AdvisoryNote tone="idle" title={t('decisionTrace.onePublishedTitle')}>{t('decisionTrace.onePublishedBody')}</AdvisoryNote>
      </div>

      <div className="bg-ws-band px-3.5 md:px-4 xl:px-5 py-2">
        <span className="font-mono text-[10px] text-ws-light break-all">
          {trace.provenance?.dataset} · $ PYTHONPATH=. python scripts/generate_decision_trace.py {req.task_id}
        </span>
      </div>
    </div>
  );
};
