import React from 'react';
import { useI18n } from '../../i18n';
import { Panel, PanelHeader, PanelBody, MetricRow, Metric, Alert, ProvenanceNote, ScopeCaption } from '../../components/ui';
import evaluation from '../../data/model_evaluation.json';

/**
 * Risk-model evaluation. Every figure is recomputed from the predictions
 * artifact's own held-out ground truth, so nothing here rests on a published
 * claim we cannot re-derive.
 */
export const Evaluation = () => {
  const { t: tx } = useI18n();
  const c = evaluation.classification;
  const r = evaluation.regression_degradation_30d;
  const cm = c.confusion_matrix;
  const dist = evaluation.internal_consistency?.risk_level_distribution || {};
  const prov = evaluation.provenance || {};

  const pct = (n) => `${(n * 100).toFixed(2)}%`;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="t-section-title">{tx('evaluation.title')}</h2>
        <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
          {tx('evaluation.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Panel><PanelBody><Metric label={tx('evaluation.rocAuc')} value={c.roc_auc.toFixed(4)} tone="ok" scope={tx('scope.heldOut')} /></PanelBody></Panel>
        <Panel><PanelBody><Metric label={tx('evaluation.prAuc')} value={c.pr_auc_average_precision.toFixed(4)} tone="ok" scope={tx('scope.heldOut')} /></PanelBody></Panel>
        <Panel><PanelBody><Metric label={tx('evaluation.f1')} value={c.f1.toFixed(4)} scope={tx('evaluation.thresholdScope', { t: evaluation.threshold })} /></PanelBody></Panel>
        <Panel><PanelBody><Metric label={tx('evaluation.rowsEvaluated')} value={evaluation.rows_evaluated.toLocaleString()} sub={tx('evaluation.rowsSub', { pos: evaluation.positives.toLocaleString(), neg: evaluation.negatives.toLocaleString() })} /></PanelBody></Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel>
          <PanelHeader title={tx('evaluation.classification')} scope={tx('evaluation.thresholdScope', { t: evaluation.threshold })} />
          <MetricRow label={tx('evaluation.accuracy')} value={c.accuracy.toFixed(4)} />
          <MetricRow label={tx('evaluation.precision')} value={c.precision.toFixed(4)} />
          <MetricRow label={tx('evaluation.recall')} value={c.recall.toFixed(4)} tone="warn" sub={tx('evaluation.recallSub')} />
          <MetricRow label={tx('evaluation.f1')} value={c.f1.toFixed(4)} />
        </Panel>

        <Panel>
          <PanelHeader title={tx('evaluation.confusionMatrix')} scope={tx('evaluation.rowsScope', { count: evaluation.rows_evaluated.toLocaleString() })} />
          <PanelBody>
            <div className="grid grid-cols-2 gap-px bg-line border border-line">
              {[
                [tx('evaluation.trueNegative'), cm.true_negative, 'ok'],
                [tx('evaluation.falsePositive'), cm.false_positive, 'warn'],
                [tx('evaluation.falseNegative'), cm.false_negative, 'critical'],
                [tx('evaluation.truePositive'), cm.true_positive, 'ok'],
              ].map(([label, value, tone]) => (
                <div key={label} className="bg-surface-panel px-3 py-2.5">
                  <div className="t-label">{label}</div>
                  <div className={`font-mono text-lg font-semibold mt-0.5 ${
                    tone === 'ok' ? 'text-status-ok' : tone === 'warn' ? 'text-status-warn' : 'text-status-critical'
                  }`}>
                    {value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-rail-400 mt-2 leading-relaxed">
              {tx('evaluation.confusionNote', { count: cm.false_negative.toLocaleString() })}
            </p>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title={tx('evaluation.degradationForecast')} scope={tx('evaluation.degradationScope')} />
          <MetricRow label={tx('evaluation.mae')} value={r.mae.toFixed(4)} />
          <MetricRow label={tx('evaluation.rmse')} value={r.rmse.toFixed(4)} />
          <MetricRow label={tx('evaluation.r2')} value={r.r2.toFixed(4)} tone="warn" sub={tx('evaluation.r2Sub')} />
        </Panel>
      </div>

      <Panel>
        <PanelHeader title={tx('evaluation.bandDistribution')} scope={tx('evaluation.predictionsScope', { count: evaluation.rows_evaluated.toLocaleString() })} />
        <PanelBody>
          <div className="space-y-1.5">
            {['CRITICAL', 'HIGH', 'MODERATE', 'LOW'].map((band) => {
              const n = dist[band] || 0;
              const share = n / evaluation.rows_evaluated;
              const tone = band === 'CRITICAL' ? 'bg-status-critical'
                : band === 'HIGH' ? 'bg-status-warn'
                : band === 'MODERATE' ? 'bg-status-info' : 'bg-status-ok';
              const bandKey = { CRITICAL: 'risk.critical', HIGH: 'risk.high', MODERATE: 'risk.moderate', LOW: 'risk.low' }[band];
              return (
                <div key={band} className="flex items-center gap-3">
                  <span className="t-label w-20 shrink-0">{tx(bandKey)}</span>
                  <div className="flex-1 h-4 bg-surface-sunken border border-line-subtle relative">
                    <div className={`absolute inset-y-0 left-0 ${tone}`} style={{ width: `${share * 100}%` }} />
                  </div>
                  <span className="font-mono text-[11px] text-rail-700 w-24 text-right shrink-0">
                    {n.toLocaleString()} · {pct(share)}
                  </span>
                </div>
              );
            })}
          </div>
        </PanelBody>
      </Panel>

      <Alert tone="idle" title={tx('evaluation.trainingTitle')}>
        {tx('evaluation.trainingBody')}
      </Alert>

      <Panel>
        <PanelBody>
          <ProvenanceNote
            generatedBy={prov.predictions_artifact}
            command="PYTHONPATH=. python scripts/evaluate_neev.py"
            note={prov.model_training ? tx('evaluation.modelTraining', { value: prov.model_training }) : undefined}
          />
          <ScopeCaption className="block mt-2">{tx('common.scope')}: {evaluation.scope}</ScopeCaption>
        </PanelBody>
      </Panel>
    </div>
  );
};
