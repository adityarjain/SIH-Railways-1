import React, { createContext, useContext, useState } from 'react';

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

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);

  // Electrical / TRD is the department that owns TASK-000005, the task the
  // guided demo follows end to end.
  const [selectedDept, setSelectedDept] = useState(DEPARTMENTS[1]);

  const login = (role, username = '', department = '') => {
    const base = PROFILE[role] || PROFILE[ROLES.AUTHORITY];
    setCurrentUser({
      username: username || base.username,
      name: base.name,
      role,
      department: role === ROLES.GROUND ? department || selectedDept : base.department,
      station: 'Northern Railway',
    });
  };

  return (
    <AuthContext.Provider
      value={{ currentUser, selectedDept, setSelectedDept, login, ROLES, DEPARTMENTS }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
