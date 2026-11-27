import { applyPatch, matchQuery, randomId, type AuthUser, type Patch, type QueryOpts, type Store, type Tx, type Unsub } from './store';

type DB = Record<string, Record<string, Record<string, unknown>>>;
const KEY = 'freesports:db:v1';
const UID_KEY = 'freesports:uid';

/** Demo Mode backend: everything lives in this browser's localStorage. Tabs stay in sync. */
export function createLocalStore(): Store {
  let db: DB = load();
  const docListeners = new Set<{ path: string; id: string; cb: (d: unknown) => void }>();
  const queryListeners = new Set<{ path: string; q: QueryOpts; cb: (d: unknown[]) => void }>();
  const authListeners = new Set<(u: AuthUser | null) => void>();
  let saveTimer: ReturnType<typeof setTimeout> | undefined;

  function load(): DB {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}');
    } catch {
      return {};
    }
  }
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(db));
      } catch {
        /* storage full or blocked: keep running in memory */
      }
    }, 50);
  }
  const col = (path: string) => (db[path] ??= {});
  const withId = (id: string, d: Record<string, unknown> | undefined) => (d ? { ...structuredClone(d), id } : null);

  function notify(paths?: Set<string>) {
    for (const l of docListeners) if (!paths || paths.has(l.path)) l.cb(withId(l.id, db[l.path]?.[l.id]));
    for (const l of queryListeners) if (!paths || paths.has(l.path)) l.cb(runQuery(l.path, l.q));
  }
  function runQuery(path: string, q: QueryOpts) {
    const docs = Object.entries(col(path)).map(([id, d]) => ({ ...structuredClone(d), id }));
    return matchQuery(docs, q);
  }

  if (typeof window !== 'undefined') window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      db = load();
      notify();
    }
    if (e.key === UID_KEY) authListeners.forEach((cb) => cb(currentUser()));
  });

  const currentUser = (): AuthUser | null => {
    const uid = typeof localStorage === 'undefined' ? null : localStorage.getItem(UID_KEY);
    return uid ? { uid, isAnonymous: true } : null;
  };

  const write = (path: string, id: string, data: Record<string, unknown>) => {
    const { id: _ignored, ...rest } = data;
    void _ignored;
    col(path)[id] = rest;
  };

  const store: Store = {
    mode: 'local',
    onAuth(cb) {
      authListeners.add(cb);
      setTimeout(() => cb(currentUser()), 0);
      return () => authListeners.delete(cb);
    },
    async signInGuest() {
      if (!localStorage.getItem(UID_KEY)) localStorage.setItem(UID_KEY, 'me_' + randomId(10));
      authListeners.forEach((cb) => cb(currentUser()));
    },
    async signInGoogle() {
      throw new Error('Google sign-in needs Firebase. Add your Firebase config to play with friends across devices.');
    },
    async signOut() {
      localStorage.removeItem(UID_KEY);
      localStorage.removeItem(KEY);
      db = {};
      authListeners.forEach((cb) => cb(null));
    },
    newId: () => randomId(),
    async get<T>(path: string, id: string) {
      return withId(id, col(path)[id]) as T | null;
    },
    watch<T>(path: string, id: string, cb: (d: T | null) => void): Unsub {
      const l = { path, id, cb: cb as (d: unknown) => void };
      docListeners.add(l);
      setTimeout(() => cb(withId(id, col(path)[id]) as T | null), 0);
      return () => docListeners.delete(l);
    },
    async query<T>(path: string, q: QueryOpts) {
      return runQuery(path, q) as T[];
    },
    watchQuery<T>(path: string, q: QueryOpts, cb: (d: T[]) => void): Unsub {
      const l = { path, q, cb: cb as (d: unknown[]) => void };
      queryListeners.add(l);
      setTimeout(() => cb(runQuery(path, q) as T[]), 0);
      return () => queryListeners.delete(l);
    },
    async set(path, id, data) {
      write(path, id, data as Record<string, unknown>);
      persist();
      notify(new Set([path]));
    },
    async update(path, id, patch) {
      const cur = col(path)[id];
      if (!cur) throw new Error(`No document ${path}/${id}`);
      col(path)[id] = applyPatch(cur, patch);
      persist();
      notify(new Set([path]));
    },
    async tx<R>(fn: (t: Tx) => Promise<R>) {
      const writes: (() => void)[] = [];
      const touched = new Set<string>();
      const staged: DB = {};
      const read = (path: string, id: string) => (staged[path]?.[id] !== undefined ? staged[path][id] : col(path)[id]);
      const t: Tx = {
        async get<T>(path: string, id: string) {
          return withId(id, read(path, id)) as T | null;
        },
        set(path, id, data) {
          const { id: _i, ...rest } = data as Record<string, unknown>;
          void _i;
          (staged[path] ??= {})[id] = structuredClone(rest);
          writes.push(() => write(path, id, rest));
          touched.add(path);
        },
        update(path, id, patch: Patch) {
          const cur = read(path, id);
          if (!cur) throw new Error(`No document ${path}/${id}`);
          const next = applyPatch(cur, patch);
          (staged[path] ??= {})[id] = next;
          writes.push(() => (col(path)[id] = next));
          touched.add(path);
        },
      };
      const r = await fn(t);
      writes.forEach((w) => w());
      persist();
      notify(touched);
      return r;
    },
  };
  return store;
}
