import React from 'react';
import { Badge } from '../common/Badge';
import { HeartPulse, Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const AssetHealthCard = ({ asset }) => {
  const isCritical = asset.risk_score >= 80;
  const isHigh = asset.risk_score >= 60 && asset.risk_score < 80;

  // Risk banding, which is a restatement of the model's own risk_level -- not a
  // separate physical observation. Fault counts and wear readings were shown here
  // previously; the pipeline carries neither, so they have been removed rather
  // than derived from the risk score and presented as sensor data.

  return (
    <div className={`p-4 rounded-xl border bg-white shadow-xs transition-all hover:shadow-md ${
      isCritical ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-slate-900 text-sm">{asset.asset_id}</span>
            <span className="text-slate-400">•</span>
            <span className="text-xs text-slate-600 font-medium">{asset.asset_type || 'Track Component'}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">{asset.department} • {asset.section_id}</p>
        </div>
        <Badge variant={asset.risk_level || 'MODERATE'} size="md">
          {asset.risk_level || 'MODERATE'}
        </Badge>
      </div>

      {/* Failure Risk Meter */}
      <div className="mt-3.5 bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
        <div className="flex justify-between items-baseline text-xs">
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <HeartPulse size={13} className={isCritical ? 'text-red-600' : 'text-blue-600'} />
            Neev AI Failure Risk
          </span>
          <span className={`font-mono font-bold text-sm ${
            isCritical ? 'text-red-600' : isHigh ? 'text-orange-600' : 'text-emerald-600'
          }`}>
            {asset.risk_score.toFixed(1)}%
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
          <div
            style={{ width: `${Math.min(asset.risk_score, 100)}%` }}
            className={`h-full rounded-full transition-all ${
              isCritical ? 'bg-red-600' : isHigh ? 'bg-orange-500' : 'bg-emerald-500'
            }`}
          />
        </div>
      </div>

      {/* Degradation and Physical Indicators */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded bg-slate-50 border border-slate-100">
          <span className="text-[10px] text-slate-400 block">30-Day Degradation</span>
          <span className="font-mono font-bold text-slate-800">
            {asset.forecast_30d_degradation != null ? `${asset.forecast_30d_degradation.toFixed(1)} index` : '\u2014'}
          </span>
        </div>
        <div className="p-2 rounded bg-slate-50 border border-slate-100">
          <span className="text-[10px] text-slate-400 block">Failure Probability</span>
          <span className="font-mono font-bold text-slate-800">
            {asset.failure_probability_30d != null ? `${(asset.failure_probability_30d * 100).toFixed(1)}%` : '\u2014'}
          </span>
        </div>
        <div className="p-2 rounded bg-slate-50 border border-slate-100">
          <span className="text-[10px] text-slate-400 block">Risk Band</span>
          <span className={`font-semibold ${isCritical ? 'text-red-700' : 'text-slate-700'}`}>
            {asset.risk_level || '—'}
          </span>
        </div>
        <div className="p-2 rounded bg-slate-50 border border-slate-100">
          <span className="text-[10px] text-slate-400 block">Maintenance Type</span>
          <span className="font-semibold text-slate-700 truncate block">
            {asset.maintenance_type || '—'}
          </span>
        </div>
      </div>
    </div>
  );
};
