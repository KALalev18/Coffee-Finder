import { useCallback, useMemo, useState } from 'react';
import { loadSaved, storeSaved, toSaved } from '../lib/saved';
import type { Cafe, SavedCafe } from '../lib/types';

export function useSaved() {
  const [saved, setSaved] = useState<SavedCafe[]>(() => loadSaved());

  const save = useCallback((cafe: Cafe) => {
    setSaved((current) => {
      if (current.some((c) => c.id === cafe.id)) return current;
      const next = [toSaved(cafe), ...current];
      storeSaved(next);
      return next;
    });
  }, []);

  const unsave = useCallback((id: string) => {
    setSaved((current) => {
      const next = current.filter((c) => c.id !== id);
      storeSaved(next);
      return next;
    });
  }, []);

  const savedIds = useMemo(() => new Set(saved.map((c) => c.id)), [saved]);

  return { saved, savedIds, save, unsave };
}
