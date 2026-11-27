import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StatusPill } from '../components/GameCard';
import { Coins, Empty, Icons, Seg, Spinner, TeamLogo, useAction } from '../components/ui';
import { createDuel, type DuelDraft } from '../data/api';
import { useMe } from '../data/hooks';
import type { SlateGame } from '../data/types';
import { fetchRoster, fetchTeams, type Athlete, type Game } from '../lib/espn';
import { LEAGUES, PROP_STATS, getLeague } from '../lib/leagues';
import { MARKET_LABELS, availableMarkets, buildOptions, defaultLine, gameRef, marketTitle, type Market, type MarketType, type Option } from '../lib/markets';
import { fmtLine, fmtOdds } from '../lib/odds';
import { useGame, useScoreboard } from '../lib/useLive';

type Kind = 'game' | 'slate' | 'custom';

function LeagueChips({ value, onChange, exclude = [] }: { value: string; onChange: (v: string) => void; exclude?: string[] }) {
  return (
    <div className="chips">
      {LEAGUES.filter((l) => !exclude.includes(l.key)).map((l) => (
        <button key={l.key} className={`chip ${l.key === value ? 'on' : ''}`} onClick={() => onChange(l.key)}>
          {l.emoji} {l.short}
        </button>
      ))}
    </div>
  );
}

function LineStepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      <div className="row">
        <button className="btn ghost sm" onClick={() => onChange(value - 0.5)}>
          −½
        </button>
        <input
          className="input num grow center"
          style={{ fontSize: 22 }}
          inputMode="decimal"
          value={String(value)}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
        />
        <button className="btn ghost sm" onClick={() => onChange(value + 0.5)}>
          +½
        </button>
      </div>
    </div>
  );
}

export function OptionGrid({ options, value, onChange }: { options: Option[]; value?: string; onChange: (id: string) => void }) {
  return (
    <div className="options">
      {options.map((o) => (
        <button key={o.id} className={`option ${value === o.id ? 'on' : ''}`} onClick={() => onChange(o.id)}>
          <span className="lbl">{o.label}</span>
          {o.sub && <span className="sub">{o.sub}</span>}
          {o.odds !== undefined && <span className="od">{fmtOdds(o.odds)}</span>}
        </button>
      ))}
    </div>
  );
}

function StakeSettings({
  buyIn,
  setBuyIn,
  maxPlayers,
  setMaxPlayers,
  coins,
}: {
  buyIn: number;
  setBuyIn: (n: number) => void;
  maxPlayers: number;
  setMaxPlayers: (n: number) => void;
  coins: number;
}) {
  return (
    <>
      <div className="field">
        <label className="label">Buy-in (everyone puts in the same)</label>
        <div className="stake-chips">
          {[50, 100, 250, 500].map((v) => (
            <button key={v} onClick={() => setBuyIn(v)} style={buyIn === v ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}>
              {v}
            </button>
          ))}
        </div>
        <input
          className="input num mt-8"
          inputMode="numeric"
          value={buyIn || ''}
          onChange={(e) => setBuyIn(parseInt(e.target.value.replace(/\D/g, '') || '0', 10))}
        />
        {buyIn > coins && <div className="tiny loss mt-8">You only have {coins.toLocaleString()} coins</div>}
      </div>
      <div className="field">
        <label className="label">Players</label>
        <Seg
          value={String(maxPlayers)}
          onChange={(v) => setMaxPlayers(parseInt(v, 10))}
          options={[
            { v: '2', label: '1v1' },
            { v: '4', label: 'Up to 4' },
            { v: '10', label: 'Up to 10' },
            { v: '0', label: 'Unlimited' },
          ]}
        />
      </div>
    </>
  );
}

export default function CreateDuel() {
  const [sp] = useSearchParams();
  const presetEvent = sp.get('event');
  const [kind, setKind] = useState<Kind | null>(presetEvent ? 'game' : null);

  return (
    <div className="page">
      <div className="row">
        <button className="icon-btn" onClick={() => (kind && !presetEvent ? setKind(null) : history.back())} aria-label="Back">
          <Icons.back />
        </button>
        <h1 className="grow">New duel</h1>
      </div>
      {!kind && <KindPicker onPick={setKind} />}
      {kind === 'game' && <GameDuelFlow presetLeague={sp.get('league') ?? undefined} presetEvent={presetEvent ?? undefined} presetDate={sp.get('d') ?? undefined} />}
      {kind === 'slate' && <SlateFlow />}
      {kind === 'custom' && <CustomFlow />}
    </div>
  );
}

function KindPicker({ onPick }: { onPick: (k: Kind) => void }) {
  const kinds: { k: Kind; ico: string; title: string; desc: string }[] = [
    { k: 'game', ico: '🏟️', title: 'Single game', desc: 'Moneyline, spread, total, 1st half, team totals, player props — live or pregame. Auto-settles.' },
    { k: 'slate', ico: '📋', title: "Pick'em slate", desc: 'Everyone picks every game on a day or week. Most correct takes the pot. Auto-settles.' },
    { k: 'custom', ico: '🏆', title: 'Season, event, or anything', desc: 'Champion, MVP, win totals, the draft, the Oscars, who gets engaged first. Host settles.' },
  ];
  return (
    <div className="list">
      {kinds.map((x) => (
        <button key={x.k} className="card pressable kind-card" onClick={() => onPick(x.k)}>
          <span className="ico">{x.ico}</span>
          <span className="grow">
            <h3>{x.title}</h3>
            <span className="small muted">{x.desc}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/* ---------------- single game ---------------- */

function GamePicker({ league, setLeague, onPick }: { league: string; setLeague: (l: string) => void; onPick: (g: Game) => void }) {
  const { games, loading } = useScoreboard(league);
  const list = games.filter((g) => g.state !== 'post' && !g.canceled);
  return (
    <>
      <LeagueChips value={league} onChange={setLeague} />
      {loading ? (
        <Spinner />
      ) : !list.length ? (
        <Empty emoji="🗓️" title="No upcoming or live games here">
          Try another league.
        </Empty>
      ) : (
        <div className="list">
          {list.map((g) => (
            <button key={g.id} className="card tight pressable row" onClick={() => onPick(g)} style={{ textAlign: 'left' }}>
              <TeamLogo team={g.away} />
              <TeamLogo team={g.home} />
              <div className="grow">
                <div style={{ fontWeight: 700 }} className="ellipsis">
                  {g.shortName}
                </div>
                <div className="tiny muted">{g.odds?.details ?? (getLeague(g.league).individual ? g.note : 'No line yet')}</div>
              </div>
              <StatusPill g={g} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function PropPicker({ g, value, onChange }: { g: Game; value?: Market['prop']; onChange: (p: Market['prop']) => void }) {
  const lg = getLeague(g.league);
  const stats = PROP_STATS[lg.sport] ?? [];
  const [players, setPlayers] = useState<(Athlete & { team: string })[] | null>(null);
  const [q, setQ] = useState('');
  const [stat, setStat] = useState(value?.stat ?? stats[0]?.key);
  useEffect(() => {
    let alive = true;
    Promise.all(
      [g.away, g.home].map((t) =>
        fetchRoster(g.league, t.id)
          .then((r) => r.map((a) => ({ ...a, team: t.abbr })))
          .catch(() => []),
      ),
    ).then((r) => alive && setPlayers(r.flat()));
    return () => {
      alive = false;
    };
  }, [g]);
  const list = (players ?? []).filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 40);
  const st = stats.find((s) => s.key === stat);
  return (
    <div className="col">
      <div className="chips">
        {stats.map((s) => (
          <button
            key={s.key}
            className={`chip ${s.key === stat ? 'on' : ''}`}
            onClick={() => {
              setStat(s.key);
              if (value) onChange({ ...value, stat: s.key, statLabel: s.label });
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      {value ? (
        <div className="card tight row">
          {value.headshot && <img src={value.headshot} alt="" width={40} height={40} style={{ borderRadius: '50%', objectFit: 'cover' }} />}
          <div className="grow">
            <b>{value.name}</b> <span className="tiny muted">{value.team}</span>
            <div className="tiny muted">{value.statLabel}</div>
          </div>
          <button className="btn xs ghost" onClick={() => onChange(undefined)}>
            Change
          </button>
        </div>
      ) : (
        <>
          <input className="input" placeholder="Search players…" value={q} onChange={(e) => setQ(e.target.value)} />
          {!players ? (
            <Spinner />
          ) : (
            <div className="card tight" style={{ maxHeight: 280, overflowY: 'auto' }}>
              {list.map((p) => (
                <button
                  key={p.id}
                  className="lb-row"
                  style={{ width: '100%', textAlign: 'left' }}
                  onClick={() => st && onChange({ athleteId: p.id, name: p.name, team: p.team, stat: st.key, statLabel: st.label, headshot: p.headshot })}
                >
                  {p.headshot ? (
                    <img src={p.headshot} alt="" width={32} height={32} style={{ borderRadius: '50%', objectFit: 'cover', background: 'var(--card2)' }} loading="lazy" />
                  ) : (
                    <span style={{ width: 32 }} />
                  )}
                  <span className="grow">
                    {p.name} <span className="tiny muted">{p.position}</span>
                  </span>
                  <span className="tiny muted">{p.team}</span>
                </button>
              ))}
              {!list.length && <div className="small muted" style={{ padding: 8 }}>No players found</div>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GameDuelFlow({ presetLeague, presetEvent, presetDate }: { presetLeague?: string; presetEvent?: string; presetDate?: string }) {
  const me = useMe();
  const nav = useNavigate();
  const { busy, run } = useAction();
  const [league, setLeague] = useState(presetLeague ?? 'nfl');
  const [picked, setPicked] = useState<Game | null>(null);
  const preset = useGame(presetEvent ? presetLeague : undefined, presetEvent, presetDate);
  const g = picked ?? preset.game;

  const [type, setType] = useState<MarketType>('spread');
  const [line, setLine] = useState<number>(0);
  const [team, setTeam] = useState<'home' | 'away'>('home');
  const [prop, setProp] = useState<Market['prop']>();
  const [pick, setPick] = useState<string>();
  const [buyIn, setBuyIn] = useState(100);
  const [maxPlayers, setMaxPlayers] = useState(0);
  const [mode, setMode] = useState<'pot' | 'odds'>('odds');
  const [liveLock, setLiveLock] = useState(10);
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!g) return;
    const types = availableMarkets(g);
    const t = types.includes(type) ? type : types[0];
    if (t !== type) setType(t);
    setLine(defaultLine(t, g) ?? 0);
    setPick(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g?.id]);

  if (presetEvent && preset.loading && !g) return <Spinner />;
  if (!g) return <GamePicker league={league} setLeague={setLeague} onPick={setPicked} />;

  const market: Market = { type, ...(type !== 'ml' && type !== 'h1_ml' ? { line } : {}), ...(type === 'team_total' ? { team } : {}), ...(type === 'prop' ? { prop } : {}) };
  const options = buildOptions(market, g, g.odds);
  const hasOdds = options.some((o) => o.odds !== undefined);
  const payoutMode = hasOdds ? mode : 'pot';
  const isLive = g.state === 'in';
  const locksAt = isLive ? Date.now() + liveLock * 60_000 : Date.parse(g.date);
  const mTitle = marketTitle(market, g);
  const autoTitle = `${g.shortName} · ${type === 'prop' && prop ? `${prop.name} ${prop.statLabel} ${line}` : `${mTitle}${market.line !== undefined && type !== 'spread' ? ` ${market.line}` : type === 'spread' ? ` ${g.home.abbr} ${fmtLine(line)}` : ''}`}`;
  const ready = pick && (type !== 'prop' || prop) && buyIn > 0 && buyIn <= me.coins;

  const create = () =>
    run(async () => {
      if (type === 'prop' && !prop) throw new Error('Pick a player');
      if (!pick) throw new Error('Make your pick');
      const draft: DuelDraft = {
        kind: 'game',
        title: (title || autoTitle).slice(0, 80),
        locksAt,
        buyIn,
        payoutMode,
        maxPlayers,
        league: g.league,
        game: gameRef(g),
        market,
        marketTitle: mTitle,
        options,
      };
      const opt = options.find((o) => o.id === pick);
      const id = await createDuel(me.id, draft, { pick, odds: payoutMode === 'odds' ? opt?.odds : undefined });
      nav(`/duel/${id}?new=1`, { replace: true });
    });

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="card tight row">
        <TeamLogo team={g.away} />
        <TeamLogo team={g.home} />
        <div className="grow">
          <div className="ellipsis" style={{ fontWeight: 800 }}>{g.shortName}</div>
          <div className="tiny muted ellipsis">{g.odds?.details ?? 'No book line — set your own'}</div>
        </div>
        <StatusPill g={g} />
        {!presetEvent && (
          <button className="btn xs ghost" onClick={() => setPicked(null)}>
            Change
          </button>
        )}
      </div>

      <div className="field">
        <label className="label">Market</label>
        <div className="chips">
          {availableMarkets(g).map((t) => (
            <button
              key={t}
              className={`chip ${t === type ? 'on' : ''}`}
              onClick={() => {
                setType(t);
                setLine(defaultLine(t, g) ?? 0);
                setPick(undefined);
              }}
            >
              {t === 'ml' ? marketTitle({ type: 'ml' }, g) : t.startsWith('h1') ? marketTitle({ type: t }, g) : MARKET_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {type === 'team_total' && (
        <Seg
          value={team}
          onChange={setTeam}
          options={[
            { v: 'away', label: g.away.abbr },
            { v: 'home', label: g.home.abbr },
          ]}
        />
      )}
      {type === 'prop' && <PropPicker g={g} value={prop} onChange={setProp} />}
      {market.line !== undefined && (
        <LineStepper
          value={line}
          onChange={(n) => {
            setLine(n);
          }}
          label={type === 'spread' ? `${g.home.abbr} spread (negative = ${g.home.abbr} favored)` : 'Line'}
        />
      )}

      <div className="field">
        <label className="label">Your pick</label>
        <OptionGrid options={options} value={pick} onChange={setPick} />
      </div>

      <StakeSettings buyIn={buyIn} setBuyIn={setBuyIn} maxPlayers={maxPlayers} setMaxPlayers={setMaxPlayers} coins={me.coins} />

      {hasOdds && (
        <div className="field">
          <label className="label">Payouts</label>
          <Seg
            value={mode}
            onChange={setMode}
            options={[
              { v: 'odds', label: 'Fair odds' },
              { v: 'pot', label: 'Winners split pot' },
            ]}
          />
          <div className="tiny muted mt-8">
            {mode === 'odds'
              ? 'Each winner is paid like a sportsbook at the odds above (taking the favorite pays less), funded by the losers. Unused coins go back to the losers.'
              : 'Everyone on the right side splits the whole pot equally, whatever the odds.'}
          </div>
        </div>
      )}

      {isLive && (
        <div className="field">
          <label className="label">Live duel — picks lock in</label>
          <Seg
            value={String(liveLock)}
            onChange={(v) => setLiveLock(parseInt(v, 10))}
            options={[
              { v: '2', label: '2 min' },
              { v: '5', label: '5 min' },
              { v: '10', label: '10 min' },
              { v: '20', label: '20 min' },
            ]}
          />
        </div>
      )}

      <div className="field">
        <label className="label">Title (optional)</label>
        <input className="input" placeholder={autoTitle} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <button className="btn block" disabled={!ready || busy} onClick={create}>
        Create duel · <Coins n={buyIn} size={17} />
      </button>
      <div className="tiny dim center">{isLive ? 'Picks lock a few minutes after you create it.' : 'Picks lock at game time. Settles automatically from the final score.'}</div>
    </div>
  );
}

/* ---------------- pick'em slate ---------------- */

function SlateFlow() {
  const me = useMe();
  const nav = useNavigate();
  const { busy, run } = useAction();
  const [league, setLeague] = useState('nfl');
  const { games, loading } = useScoreboard(league);
  const upcoming = useMemo(() => games.filter((g) => g.state === 'pre' && !g.canceled && Date.parse(g.date) > Date.now()), [games]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [ats, setAts] = useState(false);
  const [picks, setPicks] = useState<Record<string, 'home' | 'away'>>({});
  const [buyIn, setBuyIn] = useState(100);
  const [maxPlayers, setMaxPlayers] = useState(0);
  const [title, setTitle] = useState('');

  useEffect(() => {
    setExcluded(new Set());
    setPicks({});
  }, [league]);

  const chosen = upcoming.filter((g) => !excluded.has(g.id)).slice(0, 25);
  const lg = getLeague(league);
  const autoTitle = `${lg.short} pick'em${ats ? ' (ATS)' : ''} · ${new Date(chosen[0]?.date ?? Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  const allPicked = chosen.length > 0 && chosen.every((g) => picks[g.id]);

  const create = () =>
    run(async () => {
      if (chosen.length < 2) throw new Error('Pick at least 2 games');
      if (!allPicked) throw new Error('Make a pick for every game');
      const sg: SlateGame[] = chosen.map((g) => ({ game: gameRef(g), ...(ats ? { spread: g.odds?.spread ?? 0 } : {}) }));
      const draft: DuelDraft = {
        kind: 'slate',
        title: (title || autoTitle).slice(0, 80),
        locksAt: Math.min(...chosen.map((g) => Date.parse(g.date))),
        buyIn,
        payoutMode: 'pot',
        maxPlayers,
        league,
        slate: { label: autoTitle, ats, games: sg },
      };
      const myPicks = Object.fromEntries(chosen.map((g) => [g.id, picks[g.id]]));
      const id = await createDuel(me.id, draft, { picks: myPicks });
      nav(`/duel/${id}?new=1`, { replace: true });
    });

  return (
    <div className="col" style={{ gap: 16 }}>
      <LeagueChips value={league} onChange={setLeague} exclude={['ufc']} />
      <Seg
        value={ats ? 'ats' : 'su'}
        onChange={(v) => setAts(v === 'ats')}
        options={[
          { v: 'su', label: 'Straight up' },
          { v: 'ats', label: 'Against the spread' },
        ]}
      />
      {loading ? (
        <Spinner />
      ) : !upcoming.length ? (
        <Empty emoji="🗓️" title={`No upcoming ${lg.short} games`}>
          Try another league.
        </Empty>
      ) : (
        <div className="list">
          <div className="small muted">Tap a team to pick it. Remove games with ✕. Locks at the first kickoff.</div>
          {upcoming.slice(0, 25).map((g) => {
            const off = excluded.has(g.id);
            const sp = g.odds?.spread ?? 0;
            return (
              <div key={g.id} className="card tight" style={off ? { opacity: 0.4 } : undefined}>
                <div className="row between" style={{ marginBottom: 8 }}>
                  <span className="tiny muted">{new Date(g.date).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                  <button
                    className="tiny link"
                    onClick={() =>
                      setExcluded((s) => {
                        const n = new Set(s);
                        if (n.has(g.id)) n.delete(g.id);
                        else n.add(g.id);
                        return n;
                      })
                    }
                  >
                    {off ? '+ Add back' : '✕ Remove'}
                  </button>
                </div>
                {!off && (
                  <div className="options" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    {(['away', 'home'] as const).map((side) => {
                      const t = g[side];
                      return (
                        <button key={side} className={`option ${picks[g.id] === side ? 'on' : ''}`} onClick={() => setPicks((p) => ({ ...p, [g.id]: side }))} style={{ minHeight: 60, flexDirection: 'row', gap: 8 }}>
                          <TeamLogo team={t} size={26} />
                          <span className="lbl" style={{ fontSize: 18 }}>
                            {t.abbr}
                            {ats && <span className="od" style={{ fontSize: 14 }}> {fmtLine(side === 'home' ? sp : -sp)}</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <StakeSettings buyIn={buyIn} setBuyIn={setBuyIn} maxPlayers={maxPlayers} setMaxPlayers={setMaxPlayers} coins={me.coins} />
      <div className="field">
        <label className="label">Title (optional)</label>
        <input className="input" placeholder={autoTitle} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <button className="btn block" disabled={!allPicked || busy || buyIn > me.coins || !buyIn} onClick={create}>
        {allPicked ? (
          <>
            Create pick'em · <Coins n={buyIn} size={17} />
          </>
        ) : (
          `Pick ${chosen.filter((g) => !picks[g.id]).length} more`
        )}
      </button>
    </div>
  );
}

/* ---------------- custom / season / event ---------------- */

function CustomFlow() {
  const me = useMe();
  const nav = useNavigate();
  const { busy, run } = useAction();
  const [scope, setScope] = useState<'season' | 'event' | 'other'>('season');
  const [question, setQuestion] = useState('');
  const [opts, setOpts] = useState<string[]>(['', '']);
  const [teamLeague, setTeamLeague] = useState('');
  const [lockAt, setLockAt] = useState(() => {
    const d = new Date(Date.now() + 2 * 86400000);
    d.setMinutes(0, 0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [pick, setPick] = useState<string>();
  const [buyIn, setBuyIn] = useState(100);
  const [maxPlayers, setMaxPlayers] = useState(0);

  const ideas: Record<typeof scope, string[]> = {
    season: ['Who wins the title?', 'MVP?', 'Over/under 10.5 wins for my team?', 'First coach fired?'],
    event: ['Super Bowl MVP?', 'Who wins the Masters?', 'First pick in the draft?', 'Halftime show opener?'],
    other: ['Who shows up late to brunch?', 'Fantasy league champ?', 'Does Dave finish the marathon?'],
  };

  const fillTeams = async (l: string) => {
    setTeamLeague(l);
    if (!l) return;
    const teams = await fetchTeams(l).catch(() => []);
    if (teams.length) setOpts(teams.map((t) => t.name));
  };

  const clean = opts.map((o) => o.trim()).filter(Boolean);
  const options: Option[] = clean.map((label, i) => ({ id: `o${i}`, label }));
  const ready = question.trim() && options.length >= 2 && new Set(clean).size === clean.length && pick && buyIn > 0 && buyIn <= me.coins;

  const create = () =>
    run(async () => {
      const t = Date.parse(lockAt);
      if (!(t > Date.now() + 60_000)) throw new Error('Lock time must be in the future');
      const draft: DuelDraft = {
        kind: 'custom',
        title: question.trim().slice(0, 100),
        locksAt: t,
        buyIn,
        payoutMode: 'pot',
        maxPlayers,
        scope,
        options,
        ...(teamLeague ? { league: teamLeague } : {}),
      };
      const id = await createDuel(me.id, draft, { pick });
      nav(`/duel/${id}?new=1`, { replace: true });
    });

  return (
    <div className="col" style={{ gap: 16 }}>
      <Seg
        value={scope}
        onChange={setScope}
        options={[
          { v: 'season', label: 'Season' },
          { v: 'event', label: 'Event' },
          { v: 'other', label: 'Anything' },
        ]}
      />
      <div className="field">
        <label className="label">The question</label>
        <input className="input" placeholder={ideas[scope][0]} value={question} maxLength={100} onChange={(e) => setQuestion(e.target.value)} />
        <div className="quick mt-8">
          {ideas[scope].map((i) => (
            <button key={i} onClick={() => setQuestion(i)}>
              {i}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="label">Options</label>
        <select className="select input" value={teamLeague} onChange={(e) => fillTeams(e.target.value)}>
          <option value="">Fill with every team from a league… (optional)</option>
          {LEAGUES.filter((l) => !l.individual).map((l) => (
            <option key={l.key} value={l.key}>
              {l.emoji} {l.label}
            </option>
          ))}
        </select>
        <div className="col mt-8" style={{ gap: 6, maxHeight: 340, overflowY: 'auto' }}>
          {opts.map((o, i) => (
            <div key={i} className="row gap-6">
              <input
                className="input"
                style={{ height: 42 }}
                placeholder={`Option ${i + 1}`}
                value={o}
                maxLength={40}
                onChange={(e) => setOpts((x) => x.map((y, j) => (j === i ? e.target.value : y)))}
              />
              {opts.length > 2 && (
                <button className="icon-btn" onClick={() => setOpts((x) => x.filter((_, j) => j !== i))} aria-label="Remove option">
                  <Icons.close size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="row mt-8">
          <button className="btn ghost sm" onClick={() => setOpts((x) => [...x, ''])} disabled={opts.length >= 40}>
            <Icons.plus size={16} /> Add option
          </button>
          <button className="btn ghost sm" onClick={() => setOpts(['Over', 'Under'])}>
            Over / Under
          </button>
          <button className="btn ghost sm" onClick={() => setOpts(['Yes', 'No'])}>
            Yes / No
          </button>
        </div>
      </div>

      {options.length >= 2 && (
        <div className="field">
          <label className="label">Your pick</label>
          <OptionGrid options={options} value={pick} onChange={setPick} />
        </div>
      )}

      <div className="field">
        <label className="label">Picks lock at</label>
        <input className="input" type="datetime-local" value={lockAt} onChange={(e) => setLockAt(e.target.value)} />
        <div className="tiny muted mt-8">After it locks, you (the host) declare the winner. Everyone sees the result.</div>
      </div>

      <StakeSettings buyIn={buyIn} setBuyIn={setBuyIn} maxPlayers={maxPlayers} setMaxPlayers={setMaxPlayers} coins={me.coins} />

      <button className="btn block" disabled={!ready || busy} onClick={create}>
        Create duel · <Coins n={buyIn} size={17} />
      </button>
    </div>
  );
}
