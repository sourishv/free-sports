import { initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut as fbSignOut,
} from 'firebase/auth';
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  documentId,
  getDoc,
  getDocs,
  increment,
  initializeFirestore,
  limit,
  onSnapshot,
  orderBy,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  type DocumentSnapshot,
  type QueryConstraint,
} from 'firebase/firestore';
import { isOp, type Patch, type QueryOpts, type Store, type Tx } from './store';

/** Realtime multiplayer backend on Firebase's free Spark plan (no credit card). */
export function createFirebaseStore(config: FirebaseOptions): Store {
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });

  const toFs = (patch: Patch) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (isOp(v)) {
        out[k] =
          v.__op === 'inc' ? increment(v.n) : v.__op === 'union' ? arrayUnion(...v.v) : v.__op === 'remove' ? arrayRemove(...v.v) : deleteField();
      } else out[k] = v;
    }
    return out;
  };
  const strip = (data: object) => {
    const { id: _id, ...rest } = data as Record<string, unknown>;
    void _id;
    return JSON.parse(JSON.stringify(rest)); // drop undefined values (Firestore rejects them)
  };
  const snap = <T,>(s: DocumentSnapshot): T | null => (s.exists() ? ({ ...s.data(), id: s.id } as T) : null);
  const build = (path: string, q: QueryOpts) => {
    const cs: QueryConstraint[] = [];
    for (const [f, op, v] of q.where ?? []) cs.push(where(f === '__id' ? documentId() : f, op, v));
    if (q.orderBy) cs.push(orderBy(q.orderBy[0], q.orderBy[1]));
    if (q.limit) cs.push(limit(q.limit));
    return query(collection(db, path), ...cs);
  };
  const google = new GoogleAuthProvider();

  return {
    mode: 'firebase',
    onAuth(cb) {
      return onAuthStateChanged(auth, (u) =>
        cb(u ? { uid: u.uid, isAnonymous: u.isAnonymous, displayName: u.displayName, email: u.email } : null),
      );
    },
    async signInGuest() {
      await signInAnonymously(auth);
    },
    async signInGoogle() {
      // If you're a guest, link Google to keep your coins & avatar; otherwise sign in.
      if (auth.currentUser?.isAnonymous) {
        try {
          await linkWithPopup(auth.currentUser, google);
          return;
        } catch (e) {
          const code = (e as { code?: string }).code;
          if (code !== 'auth/credential-already-in-use' && code !== 'auth/email-already-in-use') throw e;
        }
      }
      await signInWithPopup(auth, google);
    },
    async signOut() {
      await fbSignOut(auth);
    },
    newId: (path) => doc(collection(db, path)).id,
    async get<T>(path: string, id: string) {
      return snap<T>(await getDoc(doc(db, path, id)));
    },
    watch<T>(path: string, id: string, cb: (d: T | null) => void) {
      return onSnapshot(
        doc(db, path, id),
        (s) => cb(snap<T>(s)),
        (e) => console.warn('watch', path, e),
      );
    },
    async query<T>(path: string, q: QueryOpts) {
      const r = await getDocs(build(path, q));
      return r.docs.map((d) => ({ ...d.data(), id: d.id }) as T);
    },
    watchQuery<T>(path: string, q: QueryOpts, cb: (d: T[]) => void) {
      return onSnapshot(
        build(path, q),
        (r) => cb(r.docs.map((d) => ({ ...d.data(), id: d.id }) as T)),
        (e) => console.warn('query', path, e),
      );
    },
    async set(path, id, data) {
      await setDoc(doc(db, path, id), strip(data));
    },
    async update(path, id, patch) {
      await updateDoc(doc(db, path, id), toFs(strip(patch) as Patch) as never);
    },
    async tx<R>(fn: (t: Tx) => Promise<R>) {
      return runTransaction(db, async (t) => {
        const tx: Tx = {
          async get<T>(path: string, id: string) {
            return snap<T>(await t.get(doc(db, path, id)));
          },
          set(path, id, data) {
            t.set(doc(db, path, id), strip(data));
          },
          update(path, id, patch) {
            t.update(doc(db, path, id), toFs(strip(patch) as Patch) as never);
          },
        };
        return fn(tx);
      });
    },
  };
}
