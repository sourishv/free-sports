import { createContext, useContext, useEffect, useState } from 'react';
import { store } from './index';
import type { AuthUser, QueryOpts } from './store';
import type { UserDoc } from './types';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(
    () =>
      store.onAuth((u) => {
        setUser(u);
        setReady(true);
      }),
    [],
  );
  return { user, ready };
}

export function useDoc<T>(path: string | null, id: string | null | undefined) {
  const [doc, setDoc] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!path || !id) {
      setDoc(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    return store.watch<T>(path, id, (d) => {
      setDoc(d);
      setLoading(false);
    });
  }, [path, id]);
  return { doc, loading };
}

export function useQuery<T>(path: string | null, q: QueryOpts) {
  const key = JSON.stringify(q);
  const [docs, setDocs] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!path) {
      setDocs([]);
      setLoading(false);
      return;
    }
    // Firestore 'in' queries accept max 30 values; empty 'in' is invalid.
    const bad = (q.where ?? []).some(([, op, v]) => op === 'in' && (!Array.isArray(v) || v.length === 0));
    if (bad) {
      setDocs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return store.watchQuery<T>(path, q, (d) => {
      setDocs(d);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key]);
  return { docs, loading };
}

/** Watches a set of user docs (friends lists, leaderboards). Chunks of 30 for Firestore 'in'. */
export function useUsers(ids: string[]) {
  const key = [...new Set(ids)].sort().join(',');
  const [users, setUsers] = useState<UserDoc[]>([]);
  useEffect(() => {
    const list = key ? key.split(',') : [];
    if (!list.length) {
      setUsers([]);
      return;
    }
    const chunks: string[][] = [];
    for (let i = 0; i < list.length; i += 30) chunks.push(list.slice(i, i + 30));
    const results: UserDoc[][] = chunks.map(() => []);
    const unsubs = chunks.map((c, i) =>
      store.watchQuery<UserDoc>('users', { where: [['__id', 'in', c]] }, (d) => {
        results[i] = d;
        setUsers(results.flat());
      }),
    );
    return () => unsubs.forEach((u) => u());
  }, [key]);
  return users;
}

export const MeContext = createContext<UserDoc | null>(null);
export function useMe(): UserDoc {
  const me = useContext(MeContext);
  if (!me) throw new Error('useMe outside of signed-in app');
  return me;
}
