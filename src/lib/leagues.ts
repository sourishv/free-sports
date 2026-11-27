export interface League {
  key: string;
  path: string; // ESPN sport/league path
  label: string;
  short: string;
  emoji: string;
  sport: 'football' | 'basketball' | 'baseball' | 'hockey' | 'soccer' | 'mma';
  /** how many linescore periods make up the "first half" style market */
  firstHalf: { n: number; label: string };
  draws?: boolean; // 3-way moneyline (soccer)
  individual?: boolean; // fighters instead of teams
}

const S = (n: number, label: string) => ({ n, label });

export const LEAGUES: League[] = [
  { key: 'nfl', path: 'football/nfl', label: 'NFL', short: 'NFL', emoji: '🏈', sport: 'football', firstHalf: S(2, '1st Half') },
  { key: 'nba', path: 'basketball/nba', label: 'NBA', short: 'NBA', emoji: '🏀', sport: 'basketball', firstHalf: S(2, '1st Half') },
  { key: 'ncaaf', path: 'football/college-football', label: 'College Football', short: 'NCAAF', emoji: '🏈', sport: 'football', firstHalf: S(2, '1st Half') },
  { key: 'ncaam', path: 'basketball/mens-college-basketball', label: "Men's College Hoops", short: 'NCAAM', emoji: '🏀', sport: 'basketball', firstHalf: S(1, '1st Half') },
  { key: 'nhl', path: 'hockey/nhl', label: 'NHL', short: 'NHL', emoji: '🏒', sport: 'hockey', firstHalf: S(1, '1st Period') },
  { key: 'mlb', path: 'baseball/mlb', label: 'MLB', short: 'MLB', emoji: '⚾', sport: 'baseball', firstHalf: S(5, 'First 5 Inn') },
  { key: 'epl', path: 'soccer/eng.1', label: 'Premier League', short: 'EPL', emoji: '⚽', sport: 'soccer', firstHalf: S(1, '1st Half'), draws: true },
  { key: 'ucl', path: 'soccer/uefa.champions', label: 'Champions League', short: 'UCL', emoji: '⚽', sport: 'soccer', firstHalf: S(1, '1st Half'), draws: true },
  { key: 'laliga', path: 'soccer/esp.1', label: 'La Liga', short: 'LaLiga', emoji: '⚽', sport: 'soccer', firstHalf: S(1, '1st Half'), draws: true },
  { key: 'seriea', path: 'soccer/ita.1', label: 'Serie A', short: 'Serie A', emoji: '⚽', sport: 'soccer', firstHalf: S(1, '1st Half'), draws: true },
  { key: 'bundesliga', path: 'soccer/ger.1', label: 'Bundesliga', short: 'BUND', emoji: '⚽', sport: 'soccer', firstHalf: S(1, '1st Half'), draws: true },
  { key: 'ligue1', path: 'soccer/fra.1', label: 'Ligue 1', short: 'Ligue 1', emoji: '⚽', sport: 'soccer', firstHalf: S(1, '1st Half'), draws: true },
  { key: 'mls', path: 'soccer/usa.1', label: 'MLS', short: 'MLS', emoji: '⚽', sport: 'soccer', firstHalf: S(1, '1st Half'), draws: true },
  { key: 'wnba', path: 'basketball/wnba', label: 'WNBA', short: 'WNBA', emoji: '🏀', sport: 'basketball', firstHalf: S(2, '1st Half') },
  { key: 'ncaaw', path: 'basketball/womens-college-basketball', label: "Women's College Hoops", short: 'NCAAW', emoji: '🏀', sport: 'basketball', firstHalf: S(2, '1st Half') },
  { key: 'ufc', path: 'mma/ufc', label: 'UFC', short: 'UFC', emoji: '🥊', sport: 'mma', firstHalf: S(1, 'Round 1'), individual: true },
];

export const LEAGUE_MAP: Record<string, League> = Object.fromEntries(LEAGUES.map((l) => [l.key, l]));
export const getLeague = (key: string): League => LEAGUE_MAP[key] ?? LEAGUES[0];

/** Leagues shown on the Home "live now" rail. */
export const HOME_LEAGUES = ['nfl', 'nba', 'ncaaf', 'nhl', 'ncaam', 'mlb', 'epl', 'ucl', 'mls', 'ufc'];

export interface PropStat {
  key: string; // stat key (from ESPN boxscore keys; '+' combines)
  label: string;
}

export const PROP_STATS: Partial<Record<League['sport'], PropStat[]>> = {
  basketball: [
    { key: 'points', label: 'Points' },
    { key: 'rebounds', label: 'Rebounds' },
    { key: 'assists', label: 'Assists' },
    { key: 'points+rebounds+assists', label: 'Pts + Reb + Ast' },
    { key: 'threePointFieldGoalsMade', label: '3-Pointers Made' },
    { key: 'steals+blocks', label: 'Steals + Blocks' },
  ],
  football: [
    { key: 'passingYards', label: 'Passing Yards' },
    { key: 'passingTouchdowns', label: 'Passing TDs' },
    { key: 'rushingYards', label: 'Rushing Yards' },
    { key: 'receivingYards', label: 'Receiving Yards' },
    { key: 'receptions', label: 'Receptions' },
    { key: 'rushingTouchdowns+receivingTouchdowns', label: 'Rush + Rec TDs' },
  ],
  hockey: [
    { key: 'goals', label: 'Goals' },
    { key: 'assists', label: 'Assists' },
    { key: 'goals+assists', label: 'Points' },
    { key: 'shotsTotal', label: 'Shots on Goal' },
    { key: 'saves', label: 'Goalie Saves' },
  ],
  baseball: [
    { key: 'hits', label: 'Hits' },
    { key: 'homeRuns', label: 'Home Runs' },
    { key: 'RBIs', label: 'RBIs' },
    { key: 'hits+runs+RBIs', label: 'Hits + Runs + RBIs' },
    { key: 'pitching.strikeouts', label: 'Pitcher Strikeouts' },
  ],
};
