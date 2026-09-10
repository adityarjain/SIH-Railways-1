import React, { useState } from 'react';
import { MetricCard } from '../../components/common/MetricCard';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { usePlan } from '../../context/PlanContext';
import corridorsSectionsData from '../../data/corridors_sections.json';
import networkStats from '../../data/network_stats.json';
import teamsData from '../../data/teams.json';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  ShieldCheck,
  Calendar,
  TrainTrack,
  ArrowRight,
  GitBranch,
  Layers,
  MapPin,
  ExternalLink,
} from 'lucide-react';

export const Overview = ({ onNavigate }) => {
  // These KPIs report the full 30,000-task optimizer run, not the scenario
  // rendered on the planning screen. The row is captioned accordingly so the
  // two are never read as one number.
  const { baselineMetrics: metrics, scheduledTasks, activeEvent } = usePlan();
  const [selectedCorridorId, setSelectedCorridorId] = useState('COR-001');
  const teamsTotal = teamsData.length;

  const corridors = corridorsSectionsData.corridors;
  const sections = corridorsSectionsData.sections;

  const currentCorridor = corridors.find((c) => c.corridor_id === selectedCorridorId) || corridors[0];
  const corridorSections = sections.filter((s) => s.corridor_id === selectedCorridorId);

  // Derive upcoming possessions (top 5)
  const upcomingTasks = scheduledTasks.slice(0, 5);

  const minToHhmm = (m) => {
    const hh = String(Math.floor(m / 60) % 24).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Info */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-mono font-semibold uppercase tracking-wider">
            <TrainTrack size={16} />
            <span>Indian Railways • Central Control Office</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1">
            Operations Control Center (OCC)
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            AI-Powered Automatic Block Planning Engine. Continuously balancing predictive asset failure risks (Neev) against train movements, crew shifts, and corridor throughput headroom.
          </p>
        </div>

        <div className="text-right hidden sm:block bg-white/10 p-3.5 rounded-xl border border-white/15 backdrop-blur-xs">
          <div className="text-[11px] text-blue-200">Current Simulation Date</div>
          <div className="text-lg font-bold font-mono text-white">07 Sep 2026</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 justify-end mt-0.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span>7-Day Rolling Horizon Active</span>
          </div>
        </div>
      </div>

      {/* 6 Core KPIs — full-dataset optimizer baseline */}
      <div className="flex items-center justify-between flex-wrap gap-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Optimizer Baseline — Full Dataset
        </h3>
        <p className="text-[11px] text-slate-500">
          30,000 tasks · 14-day horizon · CP-SAT run recorded in{' '}
          <code className="font-mono text-slate-600">benchmarks/full_run_metrics.json</code>
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <MetricCard
          title="Critical Maintenance"
          value={metrics.risk_breakdown.critical_risk_scheduled}
          subtext="High-risk tasks scheduled"
          icon={AlertTriangle}
          color="red"
          onClick={() => onNavigate('demand')}
        />
        <MetricCard
          title="Pending Demand"
          value={metrics.summary.total_deferred.toLocaleString()}
          subtext="Not scheduled in this horizon"
          icon={Clock}
          color="amber"
          onClick={() => onNavigate('demand')}
        />
        <MetricCard
          title="Planned Blocks"
          value={metrics.operational_metrics.unique_blocks_utilized}
          subtext="Conflict-free possessions"
          icon={CheckCircle2}
          color="blue"
          onClick={() => onNavigate('block-planning')}
        />
        <MetricCard
          title="Active Conflicts"
          value={activeEvent ? 1 : 0}
          subtext={activeEvent ? 'Ritvik conflict active' : 'Zero train collisions'}
          icon={AlertTriangle}
          color={activeEvent ? 'orange' : 'green'}
          onClick={() => onNavigate(activeEvent ? 'live-ops' : 'block-planning')}
        />
        <MetricCard
          title="Teams Utilized"
          value={`${metrics.operational_metrics.teams_utilized}/${teamsTotal}`}
          subtext="Specialist maintenance crews"
          icon={Users}
          color="purple"
        />
        <MetricCard
          title="Track Availability"
          value={`${networkStats.track_availability_percent}%`}
          subtext={`${networkStats.track_available_block_windows.toLocaleString()} of ${networkStats.total_block_windows.toLocaleString()} block windows`}
          icon={ShieldCheck}
          color="green"
        />
      </div>

      {/* Main Row: Corridor Section Map + Upcoming Windows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Railway Section Map */}
        <div className="lg:col-span-2 space-y-4">
          <Card
            title="Railway Network & Corridor Sections Overview"
            subtitle="Track possession availability, electrification and active maintenance, from the synthetic network dataset"
            action={
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Corridor:</span>
                <select
                  value={selectedCorridorId}
                  onChange={(e) => setSelectedCorridorId(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 font-semibold text-slate-800"
                >
                  {corridors.slice(0, 5).map((c) => (
                    <option key={c.corridor_id} value={c.corridor_id}>
                      {c.corridor_id} — {c.corridor_name}
                    </option>
                  ))}
                </select>
              </div>
            }
          >
            <div className="space-y-3">
              {/* Corridor specs bar */}
              <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">{currentCorridor.corridor_name}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600">Region: {currentCorridor.region}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600">{corridorSections.length} Sections</span>
                </div>
                <button
                  onClick={() => onNavigate('block-planning')}
                  className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                >
                  <span>Open in Block Planner</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              {/* Sections Interactive Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                {corridorSections.slice(0, 9).map((sec) => {
                  const hasMaintenance = scheduledTasks.some((t) => t.section_id === sec.section_id);
                  const isTask5 = sec.section_id === 'SEC-0004';

                  return (
                    <div
                      key={sec.section_id}
                      onClick={() => onNavigate('block-planning')}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xs ${
                        isTask5
                          ? 'bg-red-50/70 border-red-300 ring-1 ring-red-200'
                          : hasMaintenance
                          ? 'bg-blue-50/60 border-blue-200'
                          : 'bg-slate-50/80 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-slate-800">{sec.section_id}</span>
                        {isTask5 ? (
                          <Badge variant="CRITICAL" size="sm">CRITICAL WORK</Badge>
                        ) : hasMaintenance ? (
                          <Badge variant="primary" size="sm">SCHEDULED</Badge>
                        ) : (
                          <Badge variant="LOW" size="sm">CLEAR</Badge>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-slate-600 mt-1 truncate">{sec.section_name}</p>
                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>{sec.track_type}</span>
                        <span>{sec.maximum_speed_kmph} km/h</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Col: Upcoming Maintenance Windows */}
        <div className="space-y-4">
          <Card
            title="Upcoming Maintenance Windows"
            subtitle="Prioritized possessions across network"
            action={
              <button
                onClick={() => onNavigate('block-planning')}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                View All ({scheduledTasks.length})
              </button>
            }
          >
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <div
                  key={task.task_id}
                  onClick={() => onNavigate('block-planning')}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-blue-50/60 hover:border-blue-200 transition-all cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-800">{task.task_id}</span>
                    <Badge
                      variant={task.risk_score >= 80 ? 'CRITICAL' : task.is_bundled ? 'purple' : 'primary'}
                      size="sm"
                    >
                      {task.risk_score >= 80 ? 'CRITICAL' : task.is_bundled ? 'BUNDLED' : 'SCHEDULED'}
                    </Badge>
                  </div>
                  <div className="text-xs font-semibold text-slate-700 truncate">
                    {task.department} • {task.section_id}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {minToHhmm(task.start_minute)} – {minToHhmm(task.end_minute)}
                    </span>
                    <span>{task.duration_minutes} min</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
