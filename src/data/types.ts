import type { AvatarConfig } from '../avatar/items';
import type { GameRef, Market, Option } from '../lib/markets';
import type { PayoutMode } from '../lib/payouts';

export interface Stats {
  wins: number;
  losses: number;
  pushes: number;
  /** >0 win streak, <0 losing streak */
  streak: number;
  bestStreak: number;
  wagered: number;
  profit: number;
  biggestWin: number;
  duelsPlayed: number;
  duelsWon: number;
  betsPlayed: number;
  betsWon: number;
  parlaysHit: number;
}

export interface UserDoc {
  id: string;
  name: string;
  handle: string;
  avatar: AvatarConfig;
  coins: number;
  owned: string[];
  stats: Stats;
  friends: string[];
  daily: { last: string; streak: number };
  achievements: string[];
  xp: number;
  bailouts: number;
  lastBailout?: string;
  createdAt: number;
  isBot?: boolean;
}

export interface BetLeg {
  game: GameRef;
  market: Market;
  marketTitle: string;
  pick: string;
  label: string;
  odds: number;
  result?: 'won' | 'lost' | 'push' | 'void';
}

export interface BetDoc {
  id: string;
  uid: string;
  kind: 'straight' | 'parlay';
  legs: BetLeg[];
  stake: number;
  odds: number; // american (combined for parlays)
  toWin: number; // profit
  status: 'open' | 'won' | 'lost' | 'push';
  placedAt: number;
  settledAt?: number;
  payout?: number;
  bonus?: number;
}

export type DuelKind = 'game' | 'slate' | 'custom';

export interface SlateGame {
  game: GameRef;
  spread?: number; // home line for ATS
}

export interface Participant {
  name: string;
  avatar: AvatarConfig;
  pick?: string; // game & custom duels
  picks?: Record<string, 'home' | 'away'>; // slate duels
  odds?: number;
  stake: number;
  joinedAt: number;
  claimed?: boolean;
}

export interface DuelDoc {
  id: string;
  code: string;
  kind: DuelKind;
  title: string;
  hostUid: string;
  hostName: string;
  createdAt: number;
  locksAt: number;
  status: 'open' | 'settled' | 'void';
  buyIn: number;
  payoutMode: PayoutMode;
  maxPlayers: number; // 0 = unlimited
  league?: string;
  // game duels
  game?: GameRef;
  market?: Market;
  marketTitle?: string;
  // game & custom
  options?: Option[];
  // slate
  slate?: { label: string; ats: boolean; games: SlateGame[] };
  // custom
  scope?: 'season' | 'event' | 'other';
  participants: Record<string, Participant>;
  participantIds: string[];
  result?: {
    winners: string[];
    summary: string;
    scores?: Record<string, number>;
    settledAt: number;
    settledBy: string;
  };
  payouts?: Record<string, number>;
}

export interface MessageDoc {
  id: string;
  uid: string;
  name: string;
  avatar?: AvatarConfig;
  text: string;
  createdAt: number;
  system?: boolean;
}
