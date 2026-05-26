import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchStudentPortalContext } from '../utils/schoolApi';

const StudentPortalContext = createContext(null);

function formatErr(e) {
  const d = e?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  return e?.message || 'Could not load student profile.';
}

export function StudentPortalProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchStudentPortalContext();
      setProfile(data);
    } catch (e) {
      setProfile(null);
      setError(formatErr(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(
    () => ({ profile, loading, error, reload }),
    [profile, loading, error, reload]
  );
  return <StudentPortalContext.Provider value={value}>{children}</StudentPortalContext.Provider>;
}

export function useStudentPortal() {
  const ctx = useContext(StudentPortalContext);
  if (!ctx) throw new Error('useStudentPortal must be used within StudentPortalProvider');
  return ctx;
}
