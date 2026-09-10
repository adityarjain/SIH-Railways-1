import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { TaskActionModal } from '../../components/maintenance/TaskActionModal';
import { useAuth } from '../../context/AuthContext';
import { usePlan } from '../../context/PlanContext';
import { minToHhmm } from '../../utils/time';
import {
  Wrench,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Play,
  Check,
  Calendar,
  Users,
  ShieldAlert,
} from 'lucide-react';

export const MyTasks = () => {
  const { selectedDept } = useAuth();
  const { tasksInventory, updateTaskStatus } = usePlan();

  const [activeModal, setActiveModal] = useState(null); // { task, actionType }

  // Tasks belonging to this department
  const deptTasks = tasksInventory.filter((t) => t.department === selectedDept);

  const handleOpenAction = (task, actionType) => {
    setActiveModal({ task, actionType });
  };

  const handleActionSubmit = (taskId, actionType, reason, proposedDate) => {
    let newStatus = 'Accepted';
    if (actionType === 'reject') newStatus = 'Rejected by Field Crew';
    if (actionType === 'reschedule') newStatus = `Reschedule Requested (${proposedDate})`;
    if (actionType === 'in_progress') newStatus = 'In Progress';
    if (actionType === 'completed') newStatus = 'Completed';

    updateTaskStatus(taskId, newStatus, reason, proposedDate);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-600 uppercase tracking-wider">
            <Wrench size={14} className="text-blue-500" />
            <span>Field Work Orders & Execution Control</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
            My Maintenance Tasks — {selectedDept}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Confirm crew availability, accept or request schedule adjustments, and report on-site work progress.
          </p>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Tasks assigned: <strong>{deptTasks.length}</strong>
        </div>
      </div>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deptTasks.map((t) => {
          const isTask5 = t.task_id === 'TASK-000005';
          const isCritical = t.risk_score >= 80;

          return (
            <div
              key={t.task_id}
              className={`p-5 rounded-xl border bg-white shadow-xs space-y-3.5 transition-all hover:shadow-md ${
                isTask5 ? 'border-blue-400 ring-1 ring-blue-200' : 'border-slate-200'
              }`}
            >
              {/* Top Row: Task ID & Risk */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono font-bold text-slate-900 text-sm block">{t.task_id}</span>
                  <h3 className="text-xs font-bold text-slate-800 mt-0.5">{t.maintenance_type}</h3>
                  <p className="text-[11px] text-slate-500">{t.department} • {t.section_id}</p>
                </div>
                <Badge variant={t.risk_level || 'MODERATE'} size="md">
                  {t.risk_score.toFixed(1)}% — {t.risk_level}
                </Badge>
              </div>

              {/* Specs Box — every value is this task's own, from the generated plan */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-700">
                  <span className="text-slate-400 font-sans">Scheduled:</span>
                  <span className="font-bold text-slate-900">
                    {t.scheduled_date
                      ? `${t.scheduled_date} | ${minToHhmm(t.start_minute)} – ${minToHhmm(t.end_minute)}`
                      : `Not yet scheduled (due ${t.deadline})`}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span className="text-slate-400 font-sans">Assigned Team:</span>
                  <span className="font-bold text-blue-700">
                    {t.assigned_teams?.length ? t.assigned_teams.join(', ') : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span className="text-slate-400 font-sans">Block Possession:</span>
                  <span className="font-bold text-slate-900">
                    {t.block_ids?.length ? t.block_ids.join(' + ') : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span className="text-slate-400 font-sans">Duration:</span>
                  <span className="font-bold">{t.required_duration_minutes} min (Crew: {t.required_team_size}p)</span>
                </div>
              </div>

              {/* Status & Feedback Notes */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="text-slate-500">Status:</span>
                <Badge variant={t.status || 'Pending'} size="sm">
                  {t.status}
                </Badge>
              </div>

              {t.statusMeta && (
                <div className="text-[10px] bg-amber-50 text-amber-900 p-2 rounded border border-amber-200">
                  <strong>Crew Note:</strong> {t.statusMeta.reason || 'Status updated'}
                </div>
              )}

              {/* Action Buttons Toolbar (Section 20 requirement) */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  onClick={() => handleOpenAction(t, 'accept')}
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded font-semibold transition-colors flex items-center gap-1"
                  title="Accept Task"
                >
                  <Check size={12} />
                  <span>Accept</span>
                </button>

                <button
                  onClick={() => handleOpenAction(t, 'in_progress')}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-300 rounded font-semibold transition-colors flex items-center gap-1"
                  title="Mark In Progress"
                >
                  <Play size={12} />
                  <span>In Progress</span>
                </button>

                <button
                  onClick={() => handleOpenAction(t, 'completed')}
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 rounded font-semibold transition-colors flex items-center gap-1"
                  title="Mark Completed"
                >
                  <CheckCircle2 size={12} />
                  <span>Completed</span>
                </button>

                <button
                  onClick={() => handleOpenAction(t, 'reschedule')}
                  className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded transition-colors text-[11px]"
                  title="Request Schedule Change"
                >
                  Reschedule...
                </button>

                <button
                  onClick={() => handleOpenAction(t, 'reject')}
                  className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded transition-colors text-[11px]"
                  title="Reject Task"
                >
                  Reject...
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Action Modal */}
      <TaskActionModal
        isOpen={Boolean(activeModal)}
        onClose={() => setActiveModal(null)}
        task={activeModal?.task}
        actionType={activeModal?.actionType}
        onSubmit={handleActionSubmit}
      />
    </div>
  );
};
