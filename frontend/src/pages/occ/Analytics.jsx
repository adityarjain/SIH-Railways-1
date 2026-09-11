import React from 'react';
import { Panel, PanelHeader, PanelBody, Metric, ScopeCaption, ProvenanceNote } from '../../components/ui';
import { usePlan } from '../../context/PlanContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

// Chart colours are the semantic status tokens, so the charts read as one
// system with the rest of the interface. Purple stays reserved for bundling.
const TOKEN = {
  critical: '#C2303B',
  warn: '#B7791F',
  info: '#2563EB',
  ok: '#2F7D5B',
  idle: '#6B7684',
  rail: '#27354F',
};

const TIP_STYLE = {
  fontSize: '11px',
  borderRadius: '2px',
  border: '1px solid #D8DEE7',
  padding: '4px 8px',
};

export const Analytics = () => {
  const { metrics, scheduledTasks } = usePlan();

  const totalScheduled = metrics.summary.total_scheduled;

  const riskData = [
    { name: 'Critical (≥80)', count: metrics.risk_breakdown.critical_risk_scheduled, color: TOKEN.critical },
    { name: 'High (60–79)', count: metrics.risk_breakdown.high_risk_scheduled, color: TOKEN.warn },
    { name: 'Moderate (40–59)', count: metrics.risk_breakdown.moderate_risk_scheduled, color: TOKEN.info },
    { name: 'Low (<40)', count: metrics.risk_breakdown.low_risk_scheduled, color: TOKEN.ok },
  ];

  // Counted from the scheduled plan, so the chart moves with the data.
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
    { name: 'Night window', value: metrics.operational_metrics.night_maintenance_tasks, color: TOKEN.info },
    { name: 'Day window', value: totalScheduled - metrics.operational_metrics.night_maintenance_tasks, color: TOKEN.warn },
  ];

  const nightPct = ((metrics.operational_metrics.night_maintenance_tasks / totalScheduled) * 100).toFixed(0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="t-section-title">Risk Analytics</h2>
        <p className="text-xs text-rail-500 mt-0.5 max-w-3xl leading-relaxed">
          Risk distribution, departmental workload and night-window share for the demo scenario.
          Solver telemetry for the full run is on the Performance screen.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Panel><PanelBody><Metric label="Solve time" value={`${metrics.summary.runtime_seconds}s`} sub="demo scenario" scope="Demo scenario" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="Objective value" value={metrics.summary.objective_value.toLocaleString()} sub={`status: ${metrics.summary.solver_status}`} scope="Demo scenario" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="Night-window share" value={`${nightPct}%`} tone="info" sub={`${metrics.operational_metrics.night_maintenance_tasks} of ${totalScheduled} tasks`} scope="Demo scenario" /></PanelBody></Panel>
        <Panel><PanelBody><Metric label="Crew hours" value={`${metrics.operational_metrics.total_team_maintenance_hours}h`} sub={`${metrics.operational_metrics.teams_utilized} crews deployed`} scope="Demo scenario" /></PanelBody></Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel>
          <PanelHeader title="Risk distribution of scheduled work" scope="By failure risk band" />
          <PanelBody>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskData} margin={{ top: 8, right: 8, left: -20, bottom: 24 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6B7684' }} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: '#6B7684' }} allowDecimals={false} />
                  <Tooltip contentStyle={TIP_STYLE} cursor={{ fill: '#EEF1F5' }} />
                  <Bar dataKey="count" radius={0}>
                    {riskData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Workload by department" scope="Tasks scheduled per discipline" />
          <PanelBody>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 4 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#6B7684' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#6B7684' }} width={88} />
                  <Tooltip contentStyle={TIP_STYLE} cursor={{ fill: '#EEF1F5' }} />
                  <Bar dataKey="count" fill={TOKEN.rail} radius={0} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Night vs day window" scope="Operational preference (C010)" />
          <PanelBody>
            <div className="h-56 flex flex-col justify-center">
              <ResponsiveContainer width="100%" height="78%">
                <PieChart>
                  <Pie data={nightDayData} cx="50%" cy="50%" innerRadius={42} outerRadius={72} paddingAngle={2} dataKey="value">
                    {nightDayData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 text-[11px] mt-1">
                <span className="flex items-center gap-1.5 text-rail-700">
                  <span className="h-2.5 w-2.5" style={{ background: TOKEN.info }} />
                  Night ({nightDayData[0].value})
                </span>
                <span className="flex items-center gap-1.5 text-rail-700">
                  <span className="h-2.5 w-2.5" style={{ background: TOKEN.warn }} />
                  Day ({nightDayData[1].value})
                </span>
              </div>
            </div>
          </PanelBody>
        </Panel>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ScopeCaption>
          All figures: demo scenario, {metrics.summary.total_tasks_considered} tasks. Full-run
          risk breakdown is on the Overview screen.
        </ScopeCaption>
        <ProvenanceNote
          generatedBy={metrics.provenance?.scope}
          command="PYTHONPATH=. python demo.py"
          dataset={metrics.provenance?.dataset}
        />
      </div>
    </div>
  );
};
