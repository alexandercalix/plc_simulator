// hooks/useTagValues.ts
import { useEffect, useMemo, useState, useCallback } from 'react';
import { usePlcSocket } from '@/hooks/usePlcSocket';
import type { SourceTag } from '@/types';            // you already export SourceTag here

type TagEvt = { plcId: number; tagId: number; value: any };

export function useTagValues(sources: SourceTag[]) {
  const [map, setMap] = useState<Record<string, any>>({}); // key = "plcId:tagId"

  // track exactly which keys we care about
  const keySet = useMemo(
    () => new Set(sources.map(s => `${s.plcId}:${s.tagId}`)),
    // stringify keeps deps simple & stable enough
    [JSON.stringify(sources)]
  );

  // socket handler (matches your usePlcSocket event name: "tag:update")
  const onTagUpdate = useCallback((e: TagEvt) => {
    const k = `${e.plcId}:${e.tagId}`;
    if (!keySet.has(k)) return;
    setMap(prev => (prev[k] === e.value ? prev : { ...prev, [k]: e.value }));
  }, [keySet]);

  // subscribe via the shared socket (no new io() connections)
  usePlcSocket({ onTagUpdate });

  // prune values when widget list changes (avoid stale keys)
  useEffect(() => {
    setMap(prev => {
      const next: Record<string, any> = {};
      for (const k of keySet) if (k in prev) next[k] = prev[k];
      return next;
    });
  }, [keySet]);

  return {
    get: (src: SourceTag) => map[`${src.plcId}:${src.tagId}`],
    raw: map
  };
}
