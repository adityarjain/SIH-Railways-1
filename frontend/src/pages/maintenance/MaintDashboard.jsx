import React from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { MetricCard } from '../../components/common/MetricCard';
import { useAuth } from '../../context/AuthContext';
import { usePlan } from '../../context/PlanContext';
import { minToHhmm } from '../../utils/time';
import {
  Wrench,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const MaintDashboard = ({ onNavigate }) => {
  const { selectedDept } = useAuth();
  const { tasksInventory, completedWork } = usePlan();

  // Filter tasks for the selected department
  const deptTasks = tasksInventory.filter((t) => t.department === selectedDept);
  const pendingTasks = deptTasks.filter((t) => t.status === 'Pending');
  const criticalTasks = deptTasks.filter((t) => t.risk_score >= 80);
  // Inventory records carry both the work-order fields and the scheduling facts,
  // so the cards below need no fallbacks.
  const scheduledDeptTasks = deptTasks.filter((t) => t.status !== 'Pending' && t.scheduled_date);
  const completedDeptWork = completedWork.filter((j) => j.department === selectedDept);
  // Crews actually assigned to this department's scheduled possessions.
  const activeCrews = new Set(scheduledDeptTasks.flatMap((t) => t.assigned_teams || []));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-600 uppercase tracking-wider">
            <Wrench size={14} className="text-blue-500" />
            <span>Field Engineering Management</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
            Maintenance Dashboard — {selectedDept}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage field work orders, inspect Neev asset failure predictions, and confirm crew readiness.
          </p>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Department: <strong>{selectedDept}</strong>
        </div>
      </div>

      {/* 5 Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <MetricCard
          title="Pending Work Orders"
          value={pendingTasks.length}
          subtext="Awaiting block allocation"
          icon={Clock}
          color="amber"
          onClick={() => onNavigate('my-tasks')}
        />
        <MetricCard
          title="Critical Assets"
          value={criticalTasks.length}
          subtext="Neev risk &ge; 80"
          icon={AlertTriangle}
          color="red"
          onClick={() => onNavigate('asset-health')}
        />
        <MetricCard
          title="Scheduled Work"
          value={scheduledDeptTasks.length}
          subtext="Active in block plan"
          icon={Calendar}
          color="blue"
          onClick={() => onNavigate('my-tasks')}
        />
        <MetricCard
          title="Assigned Crews"
          value={activeCrews.size}
          subtext="Distinct crews in block plan"
          icon={Users}
          color="purple"
          onClick={() => onNavigate('teams')}
        />
        <MetricCard
          title="Completed Work"
          value={completedDeptWork.length}
          subtext="Possessions handed back"
          icon={CheckCircle2}
          color="green"
          onClick={() => onNavigate('completed')}
        />
      </div>

      {/* Main Scheduled Work Cards */}
      <Card
        title="Prioritized Scheduled Work for Your Department"
        subtitle="Review assigned possession windows, asset failure risks, and crew dispatch"
        action={
          <button
            onClick={() => onNavigate('my-tasks')}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
          >
            <span>Go to My Tasks</span>
            <ArrowRight size={13} />
          </button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scheduledDeptTasks.map((t) => (
            <div
              key={t.task_id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-300 hover:shadow-xs transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono font-bold text-slate-900 text-sm">{t.task_id}</span>
                  <h4 className="text-xs font-bold text-slate-800 mt-0.5">{t.maintenance_type || '\u2014'}</h4>
                  <p className="text-[11px] text-slate-500">{t.section_id} • Asset {t.asset_id}</p>
                </div>
                <Badge variant={t.risk_score >= 80 ? 'CRITICAL' : 'primary'} size="sm">
                  {t.risk_score ? `${t.risk_score.toFixed(1)}%` : 'Critical'}
                </Badge>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 text-xs space-y-1 font-mono">
                <div className="flex justify-between text-slate-700">
                  <span className="text-slate-400 font-sans">Window:</span>
                  <span className="font-bold">
                    {t.scheduled_date} | {minToHhmm(t.start_minute)} – {minToHhmm(t.end_minute)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span className="text-slate-400 font-sans">Assigned Team:</span>
                  <span className="font-bold">
                    {Array.isArray(t.assigned_teams) ? t.assigned_teams.join(', ') : t.assigned_teams}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">Duration: {t.required_duration_minutes}m</span>
                <button
                  onClick={() => onNavigate('my-tasks')}
                  className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold transition-colors"
                >
                  Manage Task &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
