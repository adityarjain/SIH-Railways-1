import React from 'react';
import { Drawer } from '../common/Drawer';
import { Badge } from '../common/Badge';
import { minToHhmm } from '../../utils/time';
import { bandOf } from '../../utils/risk';
import { Clock, Calendar, Users, Layers, ShieldAlert, MapPin } from 'lucide-react';

export const BlockDrawer = ({ task, isOpen, onClose, onOpenDecisionTrace }) => {
  if (!task) return null;

  const startTime = minToHhmm(task.start_minute);
  const endTime = minToHhmm(task.end_minute);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Maintenance Block Details — ${task.task_id}`}
      subtitle={`Asset: ${task.asset_id} • Section: ${task.section_id}`}
    >
      {/* Decision trace entry point */}
      <div className="bg-rail-900 text-white p-4 border border-rail-700">
        <div className="flex items-center justify-between">
          <span className="t-label text-rail-300">OR-Tools CP-SAT Decision Trace</span>
          <Badge variant="LOW" size="sm">Constraint-checked</Badge>
        </div>
        <p className="text-xs text-rail-300 mt-1.5 leading-relaxed">
          Every candidate block window evaluated for this task, with the constraint
          that rejected each one.
        </p>
        <button
          onClick={() => onOpenDecisionTrace(task)}
          className="mt-3 w-full bg-status-info hover:bg-status-info text-white text-xs font-semibold py-2 px-3 transition-colors"
        >
          Why This Block Was Selected
        </button>
      </div>

      {/* 1. BLOCK INFORMATION */}
      <div className="bg-surface-sunken rounded-lg p-4 border border-line space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-rail-500 flex items-center gap-1.5">
          <Clock size={14} className="text-status-info" />
          <span>Block Possession Schedule</span>
        </h4>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-rail-500 block text-[11px]">Assigned Block(s)</span>
            <span className="font-mono font-bold text-rail-900 text-sm">
              {Array.isArray(task.block_ids) ? task.block_ids.join(' + ') : task.block_ids}
            </span>
          </div>
          <div>
            <span className="text-rail-500 block text-[11px]">Execution Window</span>
            <span className="font-mono font-bold text-rail-900 text-sm">
              {startTime} – {endTime} ({task.duration_minutes}m)
            </span>
          </div>
          <div>
            <span className="text-rail-500 block text-[11px]">Scheduled Date</span>
            <span className="font-medium text-rail-800 flex items-center gap-1 mt-0.5">
              <Calendar size={13} className="text-rail-400" />
              {task.date}
            </span>
          </div>
          <div>
            <span className="text-rail-500 block text-[11px]">Location / Section</span>
            <span className="font-medium text-rail-800 flex items-center gap-1 mt-0.5">
              <MapPin size={13} className="text-rail-400" />
              {task.section_id} ({task.corridor_id})
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAINTENANCE WORK ORDER */}
      <div className="bg-surface-panel rounded-lg p-4 border border-line space-y-3 ">
        <h4 className="text-xs font-bold uppercase tracking-wider text-rail-500 flex items-center gap-1.5">
          <ShieldAlert size={14} className="text-status-critical" />
          <span>Work Order & Risk Assessment</span>
        </h4>

        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-sunken border border-line-subtle">
          <div>
            <span className="text-xs font-semibold text-rail-800 block">
              {task.maintenance_type || 'Track Inspection / Renewal'}
            </span>
            <span className="text-[11px] text-rail-500">{task.department}</span>
          </div>
          <Badge
            variant={bandOf(task) || 'MODERATE'}
            size="md"
          >
            Failure Risk: {task.risk_score != null ? `${task.risk_score.toFixed(1)}%` : '\u2014'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs pt-1">
          <div>
            <span className="text-rail-500 block text-[11px]">Asset Identifier</span>
            <span className="font-mono font-bold text-rail-800">{task.asset_id}</span>
          </div>
          <div>
            <span className="text-rail-500 block text-[11px]">Optimizer Priority Score</span>
            <span className="font-mono font-bold text-rail-800">
              {task.priority_score != null ? task.priority_score.toFixed(1) : '\u2014'}
            </span>
          </div>
          <div>
            <span className="text-rail-500 block text-[11px]">Night Window Bonus</span>
            <span className="font-medium text-rail-800">
              {task.is_night ? 'Applied (00:00 - 08:00)' : 'Day Execution'}
            </span>
          </div>
          <div>
            <span className="text-rail-500 block text-[11px]">Operational Status</span>
            <Badge variant="Scheduled" size="sm">Scheduled</Badge>
          </div>
        </div>
      </div>

      {/* 3. ASSIGNED CREW */}
      <div className="bg-surface-sunken rounded-lg p-4 border border-line space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-rail-500 flex items-center gap-1.5">
          <Users size={14} className="text-status-ok" />
          <span>Assigned Maintenance Crew</span>
        </h4>

        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-rail-900 font-mono">
              {Array.isArray(task.assigned_teams) && task.assigned_teams.length > 0
                ? task.assigned_teams.join(', ')
                : task.assigned_teams || 'No crew recorded'}
            </span>
            <p className="text-[11px] text-rail-500 mt-0.5">{task.department} Specialist Team</p>
          </div>
          <Badge variant="success" size="sm">Assigned crew</Badge>
        </div>
      </div>

      {/* 4. BUNDLING DETAILS (If applicable) */}
      {task.is_bundled && (
        <div className="bg-bundle-tint rounded-lg p-4 border border-bundle space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-bundle">
            <Layers size={15} className="text-bundle" />
            <span>Smart Bundled Possession (C006 & S008)</span>
          </div>
          <p className="text-xs text-bundle leading-relaxed">
            This task shares its possession window with compatible work in the same section:
          </p>
          <div className="bg-surface-panel p-2.5 rounded-lg border border-bundle text-xs text-rail-800 font-mono">
            {task.bundled_with && task.bundled_with.length > 0
              ? `Shared with: ${task.bundled_with.join(', ')}`
              : 'Bundled possession — partner task not recorded in this artifact'}
          </div>
        </div>
      )}
    </Drawer>
  );
};
