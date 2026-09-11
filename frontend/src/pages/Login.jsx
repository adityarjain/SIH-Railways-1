import React, { useState } from 'react';
import { useAuth, ROLES, DEPARTMENTS } from '../context/AuthContext';
import { Button, Select, Alert } from '../components/ui';

/**
 * Role selection for the demonstration. This is not authentication and does not
 * claim to be: no credential is checked, and the form exists so an evaluator can
 * enter either experience directly.
 */
export const Login = ({ onLoginSuccess }) => {
  const { login, selectedDept, setSelectedDept } = useAuth();
  const [role, setRole] = useState(ROLES.AUTHORITY);

  const enter = (selectedRole) => {
    login(selectedRole, '', selectedDept);
    if (onLoginSuccess) onLoginSuccess(selectedRole);
  };

  return (
    <div className="min-h-screen bg-rail-950 flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-lg space-y-5">
        <div className="border-l-2 border-status-info pl-4">
          <h1 className="text-[15px] font-semibold uppercase tracking-[0.14em] text-white">
            Railway Maintenance Operations
          </h1>
          <p className="text-xs text-rail-400 font-medium tracking-wide mt-1">
            Decision Support System
          </p>
          <span className="inline-block bg-rail-800 text-rail-300 text-[10px] px-2 py-0.5 font-mono border border-rail-700 mt-2.5">
            Demonstration · synthetic dataset
          </span>
        </div>

        <div className="bg-surface-panel rounded-lg border border-line overflow-hidden">
          <div className="px-4 py-3 bg-surface-sunken border-b border-line">
            <div className="t-label">Select operational role</div>
          </div>

          <div className="p-4 space-y-3">
            <button
              onClick={() => setRole(ROLES.AUTHORITY)}
              className={`w-full text-left px-4 py-3 border rounded-sm transition-colors ${
                role === ROLES.AUTHORITY
                  ? 'border-status-info bg-status-info-tint'
                  : 'border-line hover:border-line-strong'
              }`}
            >
              <div className="text-[13px] font-semibold text-rail-900">Authority / Operations Control</div>
              <div className="text-[11px] text-rail-500 mt-0.5">
                Plan · control · optimize — network overview, block planning, replanning, verification.
              </div>
            </button>

            <button
              onClick={() => setRole(ROLES.GROUND)}
              className={`w-full text-left px-4 py-3 border rounded-sm transition-colors ${
                role === ROLES.GROUND
                  ? 'border-status-info bg-status-info-tint'
                  : 'border-line hover:border-line-strong'
              }`}
            >
              <div className="text-[13px] font-semibold text-rail-900">Ground Operations</div>
              <div className="text-[11px] text-rail-500 mt-0.5">
                Execute · update · report — assigned work orders, block status, completion.
              </div>
            </button>

            {role === ROLES.GROUND && (
              <div className="pt-1">
                <Select
                  label="Department"
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </Select>
              </div>
            )}

            <Button size="lg" variant="primary" className="w-full" onClick={() => enter(role)}>
              ENTER
            </Button>
          </div>
        </div>

        <Alert tone="idle" title="Not an authentication system">
          Role selection is a demonstration control. No credential is checked and no account
          exists. Either experience can be entered directly, and the role can be switched at any
          time from the header.
        </Alert>

        <div className="text-center text-[10px] text-rail-500 font-mono">
          risk model · OR-Tools CP-SAT optimizer · dynamic replanning
        </div>
      </div>
    </div>
  );
};
