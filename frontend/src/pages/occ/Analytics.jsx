import React from 'react';
import { Card } from '../../components/common/Card';
import { usePlan } from '../../context/PlanContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { BarChart3, Clock, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';

export const Analytics = () => {
  const { metrics, scheduledTasks } = usePlan();

  // Total scheduled tasks, from the metrics artifact rather than a literal 53.
  const totalScheduled = metrics.summary.total_scheduled;

  const riskData = [
    { name: 'Critical (≥80)', count: metrics.risk_breakdown.critical_risk_scheduled, color: '#DC2626' },
    { name: 'High (60–79)', count: metrics.risk_breakdown.high_risk_scheduled, color: '#EA580C' },
    { name: 'Moderate (40–59)', count: metrics.risk_breakdown.moderate_risk_scheduled, color: '#D97706' },
    { name: 'Low (<40)', count: metrics.risk_breakdown.low_risk_scheduled, color: '#16A34A' },
  ];

  // Counted from the scheduled plan, so the chart moves with the data.
  const DEPT_COLORS = {
    'Track / Civil Engineering': '#2563EB',
    'Electrical / TRD': '#7C3AED',
    'Signal & Telecommunications (S&T)': '#059669',
    'Mechanical / Rolling Stock': '#D97706',
  };
  const departmentData = Object.entries(
    scheduledTasks.reduce((acc, task) => {
      acc[task.department] = (acc[task.department] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, count]) => ({
      name: name.replace(' Engineering', '').replace(' (S&T)', '').replace(' Stock', ''),
      count,
      fill: DEPT_COLORS[name] || '#64748B',
    }))
    .sort((a, b) => b.count - a.count);

  const nightDayData = [
    { name: 'Night Window (00:00 - 08:00)', value: metrics.operational_metrics.night_maintenance_tasks, color: '#1E40AF' },
    { name: 'Day Window (08:00 - 16:00)', value: totalScheduled - metrics.operational_metrics.night_maintenance_tasks, color: '#F59E0B' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-600 uppercase tracking-wider">
          <BarChart3 size={14} className="text-blue-500" />
          <span>Performance & Operational Analytics</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
          Optimization Metrics & Solver Telemetry
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Solver telemetry and Neev risk distribution for the <strong>demo scenario</strong> (62
          tasks solved by <code className="font-mono">demo.py</code>). Full-dataset baseline figures
          are on the Overview screen.
        </p>
      </div>

      {/* Top 4 Performance Banners */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">CP-SAT Wall Runtime</span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
            {metrics.summary.runtime_seconds}s
          </span>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
            <CheckCircle2 size={12} /> Demo scenario solve time
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Final Objective Value</span>
          <span className="text-2xl font-bold font-mono text-blue-600 mt-1 block">
            {metrics.summary.objective_value.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 font-mono mt-1 block">
            Status: {metrics.summary.solver_status}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Night Window Preference</span>
          <span className="text-2xl font-bold font-mono text-indigo-700 mt-1 block">
            {((metrics.operational_metrics.night_maintenance_tasks / totalScheduled) * 100).toFixed(0)}%
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {metrics.operational_metrics.night_maintenance_tasks} of {totalScheduled} tasks in night slot
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Team Maintenance Hours</span>
          <span className="text-2xl font-bold font-mono text-emerald-700 mt-1 block">
            {metrics.operational_metrics.total_team_maintenance_hours}h
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Across {metrics.operational_metrics.teams_utilized} deployed crews
          </span>
        </div>
      </div>

      {/* 3 Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution Chart */}
        <Card title="Neev Risk Distribution of Scheduled Work" subtitle="Prioritized task allocation by failure risk score">
          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Department Workload Chart */}
        <Card title="Maintenance Workload by Department" subtitle="Tasks scheduled per engineering discipline">
          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Night vs Day Window Preference */}
        <Card title="Night vs Day Window Share" subtitle="Adherence to low-passenger-traffic window rule (C010)">
          <div className="h-64 pt-2 flex flex-col justify-center">
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={nightDayData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {nightDayData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 text-slate-700">
                <span className="h-2.5 w-2.5 rounded bg-blue-800"></span>
                <span>Night ({nightDayData[0].value})</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <span className="h-2.5 w-2.5 rounded bg-amber-500"></span>
                <span>Day ({nightDayData[1].value})</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
