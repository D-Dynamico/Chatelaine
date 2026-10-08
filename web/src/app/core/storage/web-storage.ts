import { DOCUMENT, InjectionToken, inject } from '@angular/core';

/**
 * Browser storage that never throws. Private modes and blocked site data make
 * `sessionStorage` and `localStorage` throw on access, and a theme or a token that cannot
 * be saved must not break the app: reads come back empty and writes are dropped.
 */
export interface KeyValueStore {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}

function guarded(getStorage: () => Storage): KeyValueStore {
  return {
    read: (key) => {
      try {
        return getStorage().getItem(key);
      } catch {
        return null;
      }
    },
    write: (key, value) => {
      try {
        getStorage().setItem(key, value);
      } catch {
        // Not persisted; the in-memory state still holds the value for this page.
      }
    },
    remove: (key) => {
      try {
        getStorage().removeItem(key);
      } catch {
        // Nothing stored that could be removed.
      }
    },
  };
}

function storageOf(kind: 'sessionStorage' | 'localStorage'): () => KeyValueStore {
  return () => {
    const view = inject(DOCUMENT).defaultView;
    return guarded(() => {
      if (!view) throw new Error('No window to hold storage');
      return view[kind];
    });
  };
}

/** Per tab: the session token (D9) and latency settings. */
export const SESSION_STORAGE = new InjectionToken<KeyValueStore>('SESSION_STORAGE', {
  providedIn: 'root',
  factory: storageOf('sessionStorage'),
});

/** Per device: preferences that should outlive a tab, such as the theme. */
export const LOCAL_STORAGE = new InjectionToken<KeyValueStore>('LOCAL_STORAGE', {
  providedIn: 'root',
  factory: storageOf('localStorage'),
});
