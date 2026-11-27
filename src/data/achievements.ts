export interface Achievement {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  /** shop item unlocked by this achievement */
  reward?: string;
  coins?: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win', name: 'First Blood', emoji: '🩸', desc: 'Win your first bet or duel', coins: 100 },
  { id: 'streak3', name: 'Heating Up', emoji: '🔥', desc: 'Win 3 in a row', coins: 150 },
  { id: 'streak5', name: 'On Fire', emoji: '☄️', desc: 'Win 5 in a row', reward: 'fr_fire', coins: 300 },
  { id: 'streak10', name: 'G.O.A.T.', emoji: '🐐', desc: 'Win 10 in a row', reward: 'fx_goat', coins: 1000 },
  { id: 'underdog', name: 'Dog Day', emoji: '🐶', desc: 'Win a pick at +250 or longer', reward: 't_dog', coins: 200 },
  { id: 'parlay3', name: 'Parlay Royalty', emoji: '👑', desc: 'Hit a parlay with 3+ legs', reward: 't_parlay', coins: 250 },
  { id: 'duel_win5', name: 'Duelist', emoji: '⚔️', desc: 'Win 5 duels', coins: 300 },
  { id: 'big_party', name: 'Party Time', emoji: '🎉', desc: 'Play in a duel with 5+ people', coins: 150 },
  { id: 'high_roller', name: 'High Roller', emoji: '💎', desc: 'Put 1,000+ on a single wager', coins: 100 },
  { id: 'rich', name: 'Five Figures', emoji: '🤑', desc: 'Reach 10,000 coins', coins: 500 },
  { id: 'daily7', name: 'Regular', emoji: '📅', desc: 'Claim the daily bonus 7 days in a row', coins: 200 },
  { id: 'collector', name: 'Drip Lord', emoji: '🧢', desc: 'Own 25 cosmetic items', coins: 300 },
  { id: 'social', name: 'Squad Up', emoji: '🤝', desc: 'Add 3 friends', coins: 150 },
  { id: 'bailout3', name: 'Too Big To Fail', emoji: '🏦', desc: 'Take 3 bailouts', reward: 't_bailout' },
];

export const ACH_MAP = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
