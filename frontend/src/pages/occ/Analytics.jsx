import React from 'react';
import { usePlan } from '../../context/PlanContext';
import { useI18n } from '../../i18n';
import { RegionHeader, StatFigure } from '../../components/ui/worksheet';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

// Chart colours mirror the ws.* token values (SVG fills need literal hex, not
// Tailwind classes), so the charts read as one system with the rest of the
// interface. Teal stays reserved for bundling.
const TOKEN = {
  critical: '#C43D30',
  warn: '#B4791A',
  info: '#2C63D8',
  ok: '#2F7D5B',
  ink: '#3B414D',
};

const TIP_STYLE = {
  fontSize: '11px',
  borderRadius: '0',
  border: '1px solid #E2E6ED',
  padding: '4px 8px',
  fontFamily: 'Barlow, sans-serif',
};

export const Analytics = () => {
  const { metrics, scheduledTasks } = usePlan();
  const { t, isHindi } = useI18n();

  const totalScheduled = metrics.summary.total_scheduled;

  const riskData = [
    { name: `${t('risk.critical')} (≥80)`, count: metrics.risk_breakdown.critical_risk_scheduled, color: TOKEN.critical },
    { name: `${t('risk.high')} (60–79)`, count: metrics.risk_breakdown.high_risk_scheduled, color: TOKEN.warn },
    { name: `${t('risk.moderate')} (40–59)`, count: metrics.risk_breakdown.moderate_risk_scheduled, color: TOKEN.info },
    { name: `${t('risk.low')} (<40)`, count: metrics.risk_breakdown.low_risk_scheduled, color: TOKEN.ok },
  ];

  const departmentData = Object.entries(
    scheduledTasks.reduce((acc, task) => {
      acc[task.department] = (acc[task.department] || 0) + 1;
      return acc;
    }, {}),
  )
    .map(([name, count]) => ({
      name: name.replace(' Engineering', '').replace(' (S&T)', '').replace(' Stock', ''),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const nightDayData = [
    { name: t('analytics.nightLegend'), value: metrics.operational_metrics.night_maintenance_tasks, color: TOKEN.info },
    { name: t('analytics.dayLegend'), value: totalScheduled - metrics.operational_metrics.night_maintenance_tasks, color: TOKEN.warn },
  ];

  const nightPct = ((metrics.operational_metrics.night_maintenance_tasks / totalScheduled) * 100).toFixed(0);

  return (
    <div className="bg-ws-band min-h-full">
      <div className="bg-ws-paper border-b border-ws-rule px-3.5 md:px-4 xl:px-5 py-2.5">
        <p className="font-ws text-xs text-ws-mid max-w-3xl leading-relaxed">{t('analytics.subtitle')}</p>
      </div>

      {/* 01 — headline metrics */}
      <div className="bg-ws-surface border-b border-ws-rule px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
        <RegionHeader number="01" title={t('analytics.title')} meta={t('scope.demoScenario').toUpperCase()} isHindi={isHindi} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-3.5 border-t border-ws-rule pt-3">
          <StatFigure value={`${metrics.summary.runtime_seconds}s`} label={t('analytics.solveTime')} />
          <StatFigure value={metrics.summary.objective_value.toLocaleString()} label={`${t('analytics.objectiveValue')} · ${metrics.summary.solver_status}`} />
          <StatFigure value={`${nightPct}%`} label={t('analytics.nightShare')} tone="text-ws-info" />
          <StatFigure value={`${metrics.operational_metrics.total_team_maintenance_hours}h`} label={`${t('analytics.crewHours')} · ${t('analytics.crewHoursSub', { count: metrics.operational_metrics.teams_utilized })}`} />
        </div>
      </div>

      {/* 02/03/04 — three charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 bg-ws-rule gap-px border-b border-ws-rule">
        <div className="bg-ws-surface px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
          <RegionHeader number="02" title={t('analytics.riskDistribution')} meta={t('analytics.riskDistributionScope')} isHindi={isHindi} />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskData} margin={{ top: 8, right: 8, left: -20, bottom: 24 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#7C7466' }} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: '#7C7466' }} allowDecimals={false} />
                <Tooltip contentStyle={TIP_STYLE} cursor={{ fill: '#EFF1F5' }} />
                <Bar dataKey="count" radius={0}>
                  {riskData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-ws-surface border-t border-ws-rule lg:border-t-0 px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
          <RegionHeader number="03" title={t('analytics.workloadByDept')} meta={t('analytics.workloadScope')} isHindi={isHindi} />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 4 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#7C7466' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#7C7466' }} width={88} />
                <Tooltip contentStyle={TIP_STYLE} cursor={{ fill: '#EFF1F5' }} />
                <Bar dataKey="count" fill={TOKEN.ink} radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-ws-surface border-t border-ws-rule lg:border-t-0 px-3.5 md:px-4 xl:px-5 pt-[15px] pb-4">
          <RegionHeader number="04" title={t('analytics.nightVsDay')} meta={t('analytics.nightVsDayScope')} isHindi={isHindi} />
          <div className="h-56 flex flex-col justify-center">
            <ResponsiveContainer width="100%" height="78%">
              <PieChart>
                <Pie data={nightDayData} cx="50%" cy="50%" innerRadius={42} outerRadius={72} paddingAngle={2} dataKey="value">
                  {nightDayData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={TIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 font-ws text-[11px] mt-1">
              <span className="flex items-center gap-1.5 text-ws-body">
                <span className="h-2.5 w-2.5" style={{ background: TOKEN.info }} /> {t('analytics.nightLegend')} ({nightDayData[0].value})
              </span>
              <span className="flex items-center gap-1.5 text-ws-body">
                <span className="h-2.5 w-2.5" style={{ background: TOKEN.warn }} /> {t('analytics.dayLegend')} ({nightDayData[1].value})
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-ws-band px-3.5 md:px-4 xl:px-5 py-2 flex flex-wrap items-center gap-3.5">
        <span className="font-mono text-[10px] text-ws-mid">{t('analytics.footerScope', { count: metrics.summary.total_tasks_considered })}</span>
        <span className="flex-1 min-w-2" />
        <span className="font-mono text-[10px] text-ws-light break-all">{metrics.provenance?.scope} · $ PYTHONPATH=. python demo.py</span>
      </div>
    </div>
  );
};
