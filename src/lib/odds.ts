/** American odds helpers. */
export const toDecimal = (american: number): number => (american >= 100 ? 1 + american / 100 : american <= -100 ? 1 + 100 / -american : 2);

export const toAmerican = (decimal: number): number => {
  if (decimal <= 1) return 0;
  return decimal >= 2 ? Math.round((decimal - 1) * 100) : Math.round(-100 / (decimal - 1));
};

export const fmtOdds = (american?: number): string => {
  if (american === undefined || american === null || !Number.isFinite(american)) return '—';
  if (american === 100 || american === -100) return 'EVEN';
  return american > 0 ? `+${american}` : `${american}`;
};

export const fmtLine = (line?: number): string => {
  if (line === undefined || line === null) return '';
  if (line === 0) return 'PK';
  return line > 0 ? `+${line}` : `${line}`;
};

export const impliedProb = (american: number) => 1 / toDecimal(american);

/** Profit (not including stake) for a stake at american odds. */
export const profitFor = (stake: number, american: number) => Math.floor(stake * (toDecimal(american) - 1));

export const parlayDecimal = (americans: number[]) => americans.reduce((acc, a) => acc * toDecimal(a), 1);
