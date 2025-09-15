// lib/useLocalDash.ts
import { Dashboard } from '@/types';
import { useEffect, useState } from 'react';


export function useLocalDash(key = 'dashboards') {
  const [dashes, setDashes] = useState<Dashboard[]>(() => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(dashes)); }, [dashes]);
  return { dashes, setDashes };
}
