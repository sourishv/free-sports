import { firebaseConfig, hasFirebase } from '../config';
import { createFirebaseStore } from './firebaseStore';
import { createLocalStore } from './localStore';
import type { Store } from './store';

export const store: Store = hasFirebase ? createFirebaseStore(firebaseConfig) : createLocalStore();
export const isDemo = store.mode === 'local';
