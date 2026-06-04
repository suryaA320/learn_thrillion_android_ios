import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchParentMyChildren, fetchParentStudentContext } from '../utils/schoolApi';

const ParentPortalContext = createContext(null);

function formatErr(e) {
  const d = e?.response?.data;
  if (typeof d?.detail === 'string') return d.detail;
  return e?.message || 'Could not load linked students.';
}

export function ParentPortalProvider({ children }) {
  const [childrenList, setChildrenList] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reloadChildren = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchParentMyChildren();
      const list = Array.isArray(data?.children) ? data.children : [];
      setChildrenList(list);
      setSelectedStudentId((prev) => {
        if (prev && list.some((c) => String(c.id) === String(prev))) return prev;
        return list.length ? String(list[0].id) : '';
      });
    } catch (e) {
      setChildrenList([]);
      setSelectedStudentId('');
      setProfile(null);
      setError(formatErr(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadProfile = useCallback(async (studentId) => {
    if (!studentId) {
      setProfile(null);
      return;
    }
    try {
      const data = await fetchParentStudentContext(studentId);
      setProfile(data);
      setError('');
    } catch (e) {
      setProfile(null);
      setError(formatErr(e));
    }
  }, []);

  useEffect(() => {
    reloadChildren();
  }, [reloadChildren]);

  useEffect(() => {
    if (!selectedStudentId) {
      setProfile(null);
      return;
    }
    reloadProfile(selectedStudentId);
  }, [selectedStudentId, reloadProfile]);

  const value = useMemo(
    () => ({
      childrenList,
      selectedStudentId,
      setSelectedStudentId,
      profile,
      loading,
      error,
      reloadChildren,
      reloadProfile,
    }),
    [childrenList, selectedStudentId, profile, loading, error, reloadChildren, reloadProfile]
  );

  return <ParentPortalContext.Provider value={value}>{children}</ParentPortalContext.Provider>;
}

export function useParentPortal() {
  const ctx = useContext(ParentPortalContext);
  if (!ctx) throw new Error('useParentPortal must be used within ParentPortalProvider');
  return ctx;
}
