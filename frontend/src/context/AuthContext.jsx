import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

/**
 * Two operational experiences, and only two.
 *
 * AUTHORITY — plan, control, optimize (divisional / OCC planning).
 * GROUND    — execute, update, report (section maintenance crews).
 *
 * There is deliberately no public/citizen persona: this is a tool for railway
 * personnel, and the verification workflow lives inside AUTHORITY.
 */
export const ROLES = {
  AUTHORITY: 'Authority',
  GROUND: 'Ground Operations',
};

export const ROLE_LABEL = {
  [ROLES.AUTHORITY]: 'AUTHORITY',
  [ROLES.GROUND]: 'GROUND OPS',
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
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState({
    ...PROFILE[ROLES.AUTHORITY],
    role: ROLES.AUTHORITY,
    station: 'Northern Railway',
  });

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

  const logout = () => setCurrentUser(null);

  return (
    <AuthContext.Provider
      value={{ currentUser, selectedDept, setSelectedDept, login, logout, ROLES, DEPARTMENTS }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
