import React, { useState, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import teamsData from '../../data/teams.json';
import { useAuth } from '../../context/AuthContext';
import { Users, Clock, ShieldCheck, Search } from 'lucide-react';

export const TeamAvailability = () => {
  const { selectedDept } = useAuth();
  const [filterShift, setFilterShift] = useState('ALL');

  const deptTeams = useMemo(() => {
    return teamsData.filter((t) => {
      const matchesDept = t.department === selectedDept;
      const matchesShift = filterShift === 'ALL' || t.shift.includes(filterShift);
      return matchesDept && matchesShift;
    });
  }, [selectedDept, filterShift]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-600 uppercase tracking-wider">
            <Users size={14} className="text-purple-500" />
            <span>Crew Roster & Shift Management</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
            Team Availability — {selectedDept}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Specialist gangs, active shift coverage, and crew deployment capacity across the corridor network.
          </p>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Teams available: <strong>{deptTeams.length}</strong>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <span className="text-xs font-semibold text-slate-600">Filter Shift:</span>
        <select
          value={filterShift}
          onChange={(e) => setFilterShift(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1 font-medium text-slate-700"
        >
          <option value="ALL">All Shifts</option>
          <option value="Night">Night Shift (00:00 - 08:00)</option>
          <option value="Day">Day Shift (08:00 - 16:00)</option>
          <option value="Evening">Evening Shift (16:00 - 24:00)</option>
        </select>
      </div>

      {/* Grid of Teams */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deptTeams.map((team) => {
          const isTeam13 = team.team_id === 'TEAM-013';
          const isTeam18 = team.team_id === 'TEAM-015';

          return (
            <div
              key={team.team_id}
              className={`p-4 rounded-xl border bg-white shadow-xs space-y-3 transition-all ${
                isTeam13 || isTeam18 ? 'border-blue-400 ring-1 ring-blue-100' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono font-bold text-slate-900 text-sm">{team.team_id}</span>
                  <h4 className="text-xs font-semibold text-slate-800 mt-0.5">{team.team_name}</h4>
                  <p className="text-[11px] text-slate-500">{team.department}</p>
                </div>
                <Badge variant={team.availability_percent >= 90 ? 'success' : 'warning'} size="sm">
                  {team.availability_percent}% Ready
                </Badge>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1 font-mono">
                <div className="flex justify-between text-slate-700">
                  <span className="text-slate-400 font-sans">Shift:</span>
                  <span className="font-semibold text-slate-900">{team.shift}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span className="text-slate-400 font-sans">Crew Size:</span>
                  <span className="font-semibold">{team.crew_size} specialists</span>
                </div>
              </div>

              {isTeam13 && (
                <div className="text-[11px] bg-blue-50 text-blue-900 p-2 rounded border border-blue-200 font-mono">
                  ★ Assigned: TASK-000005 on 07 Sep (00:00 - 03:20)
                </div>
              )}

              {isTeam18 && (
                <div className="text-[11px] bg-orange-50 text-orange-900 p-2 rounded border border-orange-200 font-mono">
                  ★ Assigned: TASK-000005 (Replanned) on 08 Sep (18:00 - 21:20)
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
