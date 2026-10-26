function defaultStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null; // access itself can throw when site data is blocked
  }
}

/** Reads a list from storage. Missing, corrupt or blocked storage gives an empty list. */
export function loadList<T>(
  key: string,
  isItem: (value: unknown) => value is T,
  storage: Storage | null = defaultStorage(),
): T[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(key) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isItem) : [];
  } catch {
    return [];
  }
}

export function saveList<T>(key: string, items: T[], storage: Storage | null = defaultStorage()) {
  try {
    storage?.setItem(key, JSON.stringify(items));
  } catch {
    // Storage can be full or blocked (private mode); the data then only lasts for this visit.
  }
}
