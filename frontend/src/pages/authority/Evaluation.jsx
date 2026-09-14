import React from 'react';
import { useI18n } from '../../i18n';
import { RegionHeader, FieldRow, StatFigure, AdvisoryNote } from '../../components/ui/worksheet';
import evaluation from '../../data/model_evaluation.json';

/**
 * Risk-model evaluation. Every figure is recomputed from the predictions
 * artifact's own held-out ground truth, so nothing here rests on a published
 * claim we cannot re-derive.
 */
export const Evaluation = () => {
  const { t, isHindi } = useI18n();
  const c = evaluation.classification;
  const r = evaluation.regression_degradation_30d;
  const cm = c.confusion_matrix;
  const dist = evaluation.internal_consistency?.risk_level_distribution || {};
  const prov = evaluation.provenance || {};

  const pct = (n) => `${(n * 100).toFixed(2)}%`;

  return (
    <div className="bg-ws-band min-h-full">
      <div className="bg-ws-paper border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-2.5">
        <p className="font-ws text-xs text-ws-mid max-w-3xl leading-relaxed">{t('evaluation.subtitle')}</p>
      </div>

      {/* 01 — headline metrics */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
        <RegionHeader number="01" title={t('evaluation.title')} meta={t('scope.heldOut').toUpperCase()} isHindi={isHindi} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-3.5 border-t border-ws-rule pt-3">
          <StatFigure value={c.roc_auc.toFixed(4)} label={t('evaluation.rocAuc')} tone="text-ws-ok" />
          <StatFigure value={c.pr_auc_average_precision.toFixed(4)} label={t('evaluation.prAuc')} tone="text-ws-ok" />
          <StatFigure value={c.f1.toFixed(4)} label={`${t('evaluation.f1')} · ${t('evaluation.thresholdScope', { t: evaluation.threshold })}`} />
          <StatFigure value={evaluation.rows_evaluated.toLocaleString()} label={t('evaluation.rowsEvaluated')} />
        </div>
      </div>

      {/* 02 — classification / confusion matrix / degradation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 bg-ws-rule gap-px border-b border-ws-rule">
        <div className="bg-ws-surface px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
          <RegionHeader number="02" title={t('evaluation.classification')} meta={t('evaluation.thresholdScope', { t: evaluation.threshold })} isHindi={isHindi} />
          <div className="border-t border-ws-rule">
            <FieldRow label={t('evaluation.accuracy')} value={c.accuracy.toFixed(4)} />
            <FieldRow label={t('evaluation.precision')} value={c.precision.toFixed(4)} />
            <FieldRow label={t('evaluation.recall')} value={c.recall.toFixed(4)} tone="text-ws-warn font-bold" />
          </div>
          <p className="font-ws text-[11px] text-ws-mid leading-relaxed pt-2">{t('evaluation.recallSub')}</p>
        </div>

        <div className="bg-ws-surface border-t border-ws-rule lg:border-t-0 px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
          <RegionHeader number="03" title={t('evaluation.confusionMatrix')} meta={t('evaluation.rowsScope', { count: evaluation.rows_evaluated.toLocaleString() })} isHindi={isHindi} />
          <div className="grid grid-cols-2 gap-px bg-ws-rule border border-ws-rule">
            {[
              [t('evaluation.trueNegative'), cm.true_negative, 'text-ws-ok'],
              [t('evaluation.falsePositive'), cm.false_positive, 'text-ws-warn'],
              [t('evaluation.falseNegative'), cm.false_negative, 'text-ws-critical'],
              [t('evaluation.truePositive'), cm.true_positive, 'text-ws-ok'],
            ].map(([label, value, tone]) => (
              <div key={label} className="bg-ws-surface px-3 py-2.5">
                <div className="font-display text-[11px] font-semibold uppercase tracking-wide text-ws-light">{label}</div>
                <div className={`font-mono text-lg font-semibold mt-0.5 ${tone}`}>{value.toLocaleString()}</div>
              </div>
            ))}
          </div>
          <p className="font-ws text-[10px] text-ws-light mt-2 leading-relaxed">{t('evaluation.confusionNote', { count: cm.false_negative.toLocaleString() })}</p>
        </div>

        <div className="bg-ws-surface border-t border-ws-rule lg:border-t-0 px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
          <RegionHeader number="04" title={t('evaluation.degradationForecast')} meta={t('evaluation.degradationScope')} isHindi={isHindi} />
          <div className="border-t border-ws-rule">
            <FieldRow label={t('evaluation.mae')} value={r.mae.toFixed(4)} />
            <FieldRow label={t('evaluation.rmse')} value={r.rmse.toFixed(4)} />
            <FieldRow label={t('evaluation.r2')} value={r.r2.toFixed(4)} tone="text-ws-warn font-bold" />
          </div>
          <p className="font-ws text-[11px] text-ws-mid leading-relaxed pt-2">{t('evaluation.r2Sub')}</p>
        </div>
      </div>

      {/* 05 — band distribution */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
        <RegionHeader number="05" title={t('evaluation.bandDistribution')} meta={t('evaluation.predictionsScope', { count: evaluation.rows_evaluated.toLocaleString() })} isHindi={isHindi} />
        <div className="space-y-2 border-t border-ws-rule pt-3">
          {['CRITICAL', 'HIGH', 'MODERATE', 'LOW'].map((band) => {
            const n = dist[band] || 0;
            const share = n / evaluation.rows_evaluated;
            const tone = band === 'CRITICAL' ? 'bg-ws-critical' : band === 'HIGH' ? 'bg-ws-warn' : band === 'MODERATE' ? 'bg-ws-info' : 'bg-ws-ok';
            const bandKey = { CRITICAL: 'risk.critical', HIGH: 'risk.high', MODERATE: 'risk.moderate', LOW: 'risk.low' }[band];
            return (
              <div key={band} className="flex items-center gap-3">
                <span className="font-display text-[11px] font-semibold uppercase tracking-wide text-ws-light w-20 shrink-0">{t(bandKey)}</span>
                <div className="flex-1 h-4 bg-ws-tick border border-ws-hairline relative">
                  <div className={`absolute inset-y-0 left-0 ${tone}`} style={{ width: `${share * 100}%` }} />
                </div>
                <span className="font-mono text-[11px] text-ws-body w-28 text-right shrink-0">{n.toLocaleString()} · {pct(share)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-3.5">
        <AdvisoryNote tone="idle" title={t('evaluation.trainingTitle')}>{t('evaluation.trainingBody')}</AdvisoryNote>
      </div>

      <div className="bg-ws-band px-3.5 md:px-4 xl:px-5 py-2 flex flex-wrap items-center gap-3.5">
        <span className="font-mono text-[10px] text-ws-light break-all">
          {prov.predictions_artifact} · $ PYTHONPATH=. python scripts/evaluate_neev.py
        </span>
        <span className="flex-1 min-w-2" />
        <span className="font-mono text-[10px] text-ws-mid">{t('common.scope')}: {evaluation.scope}</span>
      </div>
    </div>
  );
};
