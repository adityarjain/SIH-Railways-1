import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, detectApi } from '../lib/api';

const AuthContext = createContext();

/**
 * Three operational experiences.
 *
 * AUTHORITY — plan, control, optimize (divisional / OCC planning).
 * GROUND    — execute, update, report (section maintenance crews).
 * ADMIN     — model evaluation, solver telemetry and system verification.
 *
 * There is deliberately no public/citizen persona: this is a tool for railway
 * personnel, and the operational verification workflow lives inside AUTHORITY.
 */
export const ROLES = {
  AUTHORITY: 'Authority',
  GROUND: 'Ground Operations',
  ADMIN: 'Admin',
};

export const ROLE_LABEL = {
  [ROLES.AUTHORITY]: 'AUTHORITY',
  [ROLES.GROUND]: 'GROUND OPS',
  [ROLES.ADMIN]: 'ADMIN',
};

export const DEPARTMENTS = [
  'Track / Civil Engineering',
  'Electrical / TRD',
  'Signal & Telecommunications (S&T)',
  'Mechanical / Rolling Stock',
];

const PROFILE = {
  [ROLES.AUTHORITY]: {
    username: 'controller',
    name: 'Divisional Operations Controller',
    department: 'Operations Control',
  },
  [ROLES.GROUND]: {
    username: 'sse_trd',
    name: 'Senior Section Engineer',
    department: null, // resolved from the selected department
  },
  [ROLES.ADMIN]: {
    username: 'admin',
    name: 'System Administrator',
    department: 'Systems & Verification',
  },
};

/**
 * Entry is always role selection (Ground also picks its department). Two
 * modes, decided once at start-up:
 *
 * `api`   — the Operations API is reachable. Choosing a role opens a server
 *           session for that role/department, every action is saved to the
 *           shared log, and Ground is served only its own department's part.
 * `local` — no API (e.g. the static Netlify build). Actions live only in
 *           this browser tab, and the UI says so.
 */
export const AuthProvider = ({ children }) => {
  const [mode, setMode] = useState('checking');
  const [currentUser, setCurrentUser] = useState(null);

  // Electrical / TRD owns TASK-000005, the task the worked example follows.
  const [selectedDept, setSelectedDept] = useState(DEPARTMENTS[1]);

  const adopt = useCallback((u) => {
    setCurrentUser({ ...u, station: 'Northern Railway' });
    if (u.role === ROLES.GROUND && u.department) setSelectedDept(u.department);
  }, []);

  useEffect(() => {
    let live = true;
    detectApi().then((up) => { if (live) setMode(up ? 'api' : 'local'); });
    return () => { live = false; };
  }, []);

  const login = async (role, username = '', department = '') => {
    const dept = role === ROLES.GROUND ? department || selectedDept : null;
    if (mode === 'api') {
      adopt(await api.session(role, dept));
      return;
    }
    const base = PROFILE[role] || PROFILE[ROLES.AUTHORITY];
    adopt({
      username: username || (role === ROLES.GROUND ? `${base.username}:${dept}` : base.username),
      name: base.name,
      role,
      department: role === ROLES.GROUND ? dept : base.department,
    });
  };

  return (
    <AuthContext.Provider value={{ mode, currentUser, selectedDept, setSelectedDept, login, ROLES, DEPARTMENTS }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
