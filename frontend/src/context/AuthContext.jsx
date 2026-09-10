import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const ROLES = {
  OCC: 'Operations Control',
  MAINTENANCE: 'Maintenance Personnel',
  GENERAL: 'General User',
};

export const DEPARTMENTS = [
  'Track / Civil Engineering',
  'Electrical / TRD',
  'Signal & Telecommunications (S&T)',
  'Mechanical / Rolling Stock',
];

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState({
    username: 'chief_controller',
    name: 'S. K. Sharma (Chief Controller)',
    role: ROLES.OCC,
    department: 'Operations',
    station: 'New Delhi HQ',
  });

  const [selectedDept, setSelectedDept] = useState(DEPARTMENTS[1]); // Default to Electrical/TRD for TASK-000005

  const login = (role, username = '', department = '') => {
    let name = 'Operations Controller';
    let dept = 'Operations';
    if (role === ROLES.MAINTENANCE) {
      name = 'R. K. Verma (Senior Section Engineer)';
      dept = department || selectedDept;
    } else if (role === ROLES.GENERAL) {
      name = 'Citizen / Railway Auditor';
      dept = 'Public Verification';
    }

    setCurrentUser({
      username: username || (role === ROLES.OCC ? 'occ_operator' : role === ROLES.MAINTENANCE ? 'sse_trd' : 'public_user'),
      name,
      role,
      department: dept,
      station: 'Northern Railway',
    });
  };

  const logout = () => {
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        selectedDept,
        setSelectedDept,
        login,
        logout,
        ROLES,
        DEPARTMENTS,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
