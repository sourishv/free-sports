// A tiny document-store interface. The app talks only to this, so it runs either
// fully in the browser (Demo Mode) or on Firebase's free Spark plan (real friends, realtime).

export type Unsub = () => void;

export type FieldOp =
  | { __op: 'inc'; n: number }
  | { __op: 'union'; v: unknown[] }
  | { __op: 'remove'; v: unknown[] }
  | { __op: 'delete' };

export const inc = (n: number): FieldOp => ({ __op: 'inc', n });
export const union = (...v: unknown[]): FieldOp => ({ __op: 'union', v });
export const remove = (...v: unknown[]): FieldOp => ({ __op: 'remove', v });
export const del = (): FieldOp => ({ __op: 'delete' });

export const isOp = (v: unknown): v is FieldOp => !!v && typeof v === 'object' && '__op' in (v as object);

/** Patch keys may be dotted paths ("stats.wins"). Values may be FieldOps. */
export type Patch = Record<string, unknown>;

export type WhereOp = '==' | 'array-contains' | 'in' | '>=' | '<=' | '>' | '<';
export type Where = [string, WhereOp, unknown];
export interface QueryOpts {
  where?: Where[];
  orderBy?: [string, 'asc' | 'desc'];
  limit?: number;
}

export interface AuthUser {
  uid: string;
  isAnonymous: boolean;
  displayName?: string | null;
  email?: string | null;
}

export interface Tx {
  get<T>(path: string, id: string): Promise<T | null>;
  set(path: string, id: string, data: object): void;
  update(path: string, id: string, patch: Patch): void;
}

export interface Store {
  mode: 'local' | 'firebase';
  onAuth(cb: (u: AuthUser | null) => void): Unsub;
  signInGuest(): Promise<void>;
  signInGoogle(): Promise<void>;
  signOut(): Promise<void>;

  newId(path: string): string;
  get<T>(path: string, id: string): Promise<T | null>;
  watch<T>(path: string, id: string, cb: (d: T | null) => void): Unsub;
  query<T>(path: string, q: QueryOpts): Promise<T[]>;
  watchQuery<T>(path: string, q: QueryOpts, cb: (docs: T[]) => void): Unsub;
  set(path: string, id: string, data: object): Promise<void>;
  update(path: string, id: string, patch: Patch): Promise<void>;
  tx<R>(fn: (t: Tx) => Promise<R>): Promise<R>;
}

/* ---------- helpers shared by the local backend & tests ---------- */

export function applyPatch<T extends object>(doc: T, patch: Patch): T {
  const out = structuredClone(doc) as Record<string, unknown>;
  for (const [path, val] of Object.entries(patch)) {
    const keys = path.split('.');
    let cur = out;
    for (const k of keys.slice(0, -1)) {
      if (typeof cur[k] !== 'object' || cur[k] === null) cur[k] = {};
      cur = cur[k] as Record<string, unknown>;
    }
    const last = keys[keys.length - 1];
    if (isOp(val)) {
      const prev = cur[last];
      switch (val.__op) {
        case 'inc':
          cur[last] = (typeof prev === 'number' ? prev : 0) + val.n;
          break;
        case 'union': {
          const arr = Array.isArray(prev) ? [...prev] : [];
          for (const v of val.v) if (!arr.some((x) => JSON.stringify(x) === JSON.stringify(v))) arr.push(v);
          cur[last] = arr;
          break;
        }
        case 'remove':
          cur[last] = (Array.isArray(prev) ? prev : []).filter((x) => !val.v.some((v) => JSON.stringify(v) === JSON.stringify(x)));
          break;
        case 'delete':
          delete cur[last];
          break;
      }
    } else {
      cur[last] = structuredClone(val);
    }
  }
  return out as T;
}

const getPath = (o: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((acc, k) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[k] : undefined), o);

export function matchQuery<T extends object>(docs: T[], q: QueryOpts): T[] {
  let out = docs.filter((d) =>
    (q.where ?? []).every(([f, op, v]) => {
      const x = f === '__id' ? (d as { id?: string }).id : getPath(d, f);
      switch (op) {
        case '==':
          return x === v;
        case 'array-contains':
          return Array.isArray(x) && x.includes(v);
        case 'in':
          return Array.isArray(v) && v.includes(x);
        case '>=':
          return (x as number) >= (v as number);
        case '<=':
          return (x as number) <= (v as number);
        case '>':
          return (x as number) > (v as number);
        case '<':
          return (x as number) < (v as number);
      }
    }),
  );
  if (q.orderBy) {
    const [f, dir] = q.orderBy;
    out = [...out].sort((a, b) => {
      const x = getPath(a, f) as number;
      const y = getPath(b, f) as number;
      return (x > y ? 1 : x < y ? -1 : 0) * (dir === 'desc' ? -1 : 1);
    });
  }
  if (q.limit) out = out.slice(0, q.limit);
  return out;
}

export const randomId = (len = 20) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const a = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(a, (b) => chars[b % chars.length]).join('');
};
