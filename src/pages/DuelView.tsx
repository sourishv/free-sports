import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Avatar from '../avatar/Avatar';
import { KIND_LABEL } from '../components/DuelCard';
import { Coins, Empty, Icons, Sheet, Spinner, TeamLogo, fmtCountdown, fmtTime, shareLink, timeAgo, useAction, useToast } from '../components/ui';
import { botReply } from '../data/bots';
import { changePick, isLocked, joinDuel, sendMessage, settleDuel, voidDuel } from '../data/api';
import { gradeSlate, tryResolveDuel } from '../data/engine';
import { useDoc, useMe, useQuery } from '../data/hooks';
import { isDemo } from '../data/index';
import type { DuelDoc, MessageDoc } from '../data/types';
import { gradeMarket } from '../lib/markets';
import { fmtLine, fmtOdds } from '../lib/odds';
import { computePayouts } from '../lib/payouts';
import { useGame, useGames, useNow } from '../lib/useLive';
import { Scorebug } from './GameView';

const TRASH = ['🔒 Lock it in', '😂', 'Easy money', 'Fraud watch 👀', '🧢', 'GG', 'Pay up 💸', "It's over", 'Respect 🫡', '🔥🔥🔥'];

export default function DuelView() {
  const { id = '' } = useParams();
  const [sp, setSp] = useSearchParams();
  const me = useMe();
  const toast = useToast();
  const { doc: d, loading } = useDoc<DuelDoc>('duels', id);
  const now = useNow(1000);
  const [inviteOpen, setInviteOpen] = useState(sp.get('new') === '1');

  if (loading) return <Spinner />;
  if (!d)
    return (
      <div className="page">
        <Empty emoji="🕳️" title="Duel not found">
          It may have been deleted, or the link is wrong.
        </Empty>
      </div>
    );

  const url = `${location.origin}${location.pathname}#/join/${d.code}`;
  const invite = () => shareLink(url, `${me.name} challenged you: "${d.title}" — ${d.buyIn} coin buy-in on FreeSports. Code ${d.code}`, toast);
  const pot = Object.values(d.participants).reduce((a, p) => a + p.stake, 0);
  const locked = isLocked(d);
  const mine = d.participants[me.id];

  return (
    <div className="page">
      <div className="row">
        <Link to="/duels" className="icon-btn" aria-label="Back">
          <Icons.back />
        </Link>
        <div className="grow">
          <div className="tiny muted upper">
            {KIND_LABEL[d.kind]} · hosted by {d.hostUid === me.id ? 'you' : d.hostName}
          </div>
          <h2 style={{ textTransform: 'none', fontSize: 22 }}>{d.title}</h2>
        </div>
        <button className="icon-btn" onClick={invite} aria-label="Share invite">
          <Icons.share />
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="v gold">
            <Coins n={pot} size={22} />
          </div>
          <div className="k">Pot</div>
        </div>
        <div className="stat">
          <div className="v">
            {d.participantIds.length}
            {d.maxPlayers ? <span className="muted">/{d.maxPlayers}</span> : ''}
          </div>
          <div className="k">Players</div>
        </div>
        <div className="stat">
          <div className="v" style={{ fontSize: d.status === 'open' && !locked ? 20 : 22 }}>
            {d.status === 'settled' ? '🏁' : d.status === 'void' ? '↩️' : locked ? <span className="loss">LIVE</span> : fmtCountdown(d.locksAt - now)}
          </div>
          <div className="k">{d.status === 'settled' ? 'Final' : d.status === 'void' ? 'Refunded' : locked ? 'Locked' : 'Until lock'}</div>
        </div>
      </div>

      {d.result && (
        <div className={`card ${d.status === 'settled' ? 'glow' : ''}`}>
          <div className="tiny muted upper">Result</div>
          <div style={{ fontWeight: 800, fontSize: 17 }}>{d.result.summary}</div>
          {mine && d.payouts?.[me.id] !== undefined && (
            <div className="mt-8">
              {d.payouts[me.id] > mine.stake ? (
                <span className="pill win">You won +{(d.payouts[me.id] - mine.stake).toLocaleString()}</span>
              ) : d.payouts[me.id] < mine.stake ? (
                <span className="pill loss">You lost {(mine.stake - d.payouts[me.id]).toLocaleString()}</span>
              ) : (
                <span className="pill">Stake returned</span>
              )}
            </div>
          )}
        </div>
      )}

      {d.kind === 'game' && <GameDuel d={d} />}
      {d.kind === 'custom' && <CustomDuel d={d} />}
      {d.kind === 'slate' && <SlateDuel d={d} />}

      <Players d={d} />
      {d.status === 'open' && <HostControls d={d} />}
      <Chat d={d} />

      <div className="tiny dim center">
        Code <b className="num">{d.code}</b> · created {fmtTime(d.createdAt)} · {d.payoutMode === 'odds' ? 'fair-odds payouts' : 'winners split the pot'}
      </div>

      <Sheet
        open={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          sp.delete('new');
          setSp(sp, { replace: true });
        }}
      >
        <div className="col center" style={{ gap: 14 }}>
          <div style={{ fontSize: 44 }}>⚔️</div>
          <h2>Duel created!</h2>
          <div className="muted small">Send this to your friends. They can open the link or type the code.</div>
          <div className="code">{d.code}</div>
          <button className="btn block" onClick={invite}>
            <Icons.share size={20} /> Send invite
          </button>
          <button
            className="btn ghost block"
            onClick={async () => {
              await navigator.clipboard?.writeText(url).catch(() => {});
              toast('Link copied', 'ok');
            }}
          >
            <Icons.copy size={18} /> Copy link
          </button>
          {isDemo && <div className="tiny muted">Demo mode: bot friends will wander in within a few seconds.</div>}
        </div>
      </Sheet>
    </div>
  );
}

/* ---------- join / pick area for game & custom duels ---------- */

function OptionsBoard({ d, leading, final }: { d: DuelDoc; leading?: string[]; final?: boolean }) {
  const me = useMe();
  const { busy, run } = useAction();
  const mine = d.participants[me.id];
  const [sel, setSel] = useState<string | undefined>(mine?.pick);
  const locked = isLocked(d);
  const full = !!d.maxPlayers && d.participantIds.length >= d.maxPlayers;
  const canJoin = !mine && !locked && !full;
  const canChange = mine && !locked;
  const byOpt = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const [u, p] of Object.entries(d.participants)) if (p.pick) (m[p.pick] ??= []).push(u);
    return m;
  }, [d.participants]);
  const winners = d.status === 'settled' ? d.result?.winners ?? [] : leading ?? [];

  // preview payout if I win
  const preview = useMemo(() => {
    if (!sel || !d.options) return null;
    const entries = Object.entries(d.participants).map(([uid, p]) => ({ uid, stake: p.stake, pick: p.pick ?? '', odds: p.odds }));
    const opt = d.options.find((o) => o.id === sel);
    const meE = { uid: me.id, stake: d.buyIn, pick: sel, odds: d.payoutMode === 'odds' ? opt?.odds : undefined };
    const all = [...entries.filter((e) => e.uid !== me.id), meE];
    const pay = computePayouts(all, [sel], d.payoutMode);
    return pay[me.id] - d.buyIn;
  }, [sel, d, me.id]);

  return (
    <div className="col">
      <div className="options">
        {(d.options ?? []).map((o) => {
          const who = byOpt[o.id] ?? [];
          const isWin = winners.includes(o.id);
          const cls = [
            sel === o.id && (canJoin || canChange) ? 'on' : '',
            mine?.pick === o.id && !(canJoin || canChange) ? 'on' : '',
            isWin ? (d.status === 'settled' || final ? 'won' : 'leading') : '',
            d.status === 'settled' && winners.length && !isWin ? 'lost' : '',
          ].join(' ');
          return (
            <button key={o.id} className={`option ${cls}`} onClick={() => (canJoin || canChange) && setSel(o.id)} disabled={!(canJoin || canChange)}>
              {isWin && <span className={`tag pill ${d.status === 'settled' ? 'win' : 'live'}`}>{d.status === 'settled' ? 'Winner' : 'Leading'}</span>}
              <span className="lbl">{o.label}</span>
              {o.sub && <span className="sub">{o.sub}</span>}
              {o.odds !== undefined && d.payoutMode === 'odds' && <span className="od">{fmtOdds(o.odds)}</span>}
              {who.length > 0 && (
                <span className="stack mt-8">
                  {who.slice(0, 5).map((u) => (
                    <Avatar key={u} a={d.participants[u].avatar} size={24} still />
                  ))}
                  {who.length > 5 && <span className="tiny muted" style={{ marginLeft: 4 }}>+{who.length - 5}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {canJoin && (
        <>
          {preview !== null && preview > 0 && (
            <div className="small muted center">
              If you win right now you'd take <b className="win">+{preview.toLocaleString()}</b> (grows as more people take the other side)
            </div>
          )}
          <button
            className="btn block"
            disabled={!sel || busy || me.coins < d.buyIn}
            onClick={() =>
              run(
                () => joinDuel(me.id, d.id, { pick: sel, odds: d.payoutMode === 'odds' ? d.options?.find((o) => o.id === sel)?.odds : undefined }),
                "You're in! 🔒",
              )
            }
          >
            {me.coins < d.buyIn ? 'Not enough coins' : sel ? <>Join · <Coins n={d.buyIn} size={17} /></> : 'Pick a side to join'}
          </button>
        </>
      )}
      {canChange && sel !== mine.pick && (
        <button
          className="btn outline block"
          disabled={busy}
          onClick={() => run(() => changePick(me.id, d.id, { pick: sel, odds: d.payoutMode === 'odds' ? d.options?.find((o) => o.id === sel)?.odds : undefined }), 'Pick updated')}
        >
          Switch my pick
        </button>
      )}
      {!mine && full && !locked && <div className="small muted center">This duel is full.</div>}
      {!mine && locked && d.status === 'open' && <div className="small muted center">Picks are locked — you can still watch & talk trash.</div>}
    </div>
  );
}

function GameDuel({ d }: { d: DuelDoc }) {
  const me = useMe();
  const { detail, game } = useGame(d.game?.league, d.game?.eventId, d.game?.date);
  const grade = game && d.market ? gradeMarket(d.market, game, detail) : null;
  const resolving = useRef(false);
  useEffect(() => {
    if (grade?.final && d.status === 'open' && !resolving.current && isLocked(d)) {
      resolving.current = true;
      tryResolveDuel(d, me.id).finally(() => (resolving.current = false));
    }
  }, [grade?.final, d, me.id]);

  return (
    <>
      {game ? (
        <Link to={`/game/${game.league}/${game.id}?d=${encodeURIComponent(game.date)}`} className="card pressable" style={{ display: 'block' }}>
          <Scorebug g={game} />
          {grade && d.status === 'open' && (
            <div className="center small mt-8">
              <span className={grade.final ? 'win' : 'accent'}>{grade.final ? 'Final' : 'Live'}:</span> {grade.summary}
            </div>
          )}
        </Link>
      ) : d.game ? (
        <div className="card tight row">
          <TeamLogo team={d.game.away} />
          <TeamLogo team={d.game.home} />
          <b className="grow">{d.game.shortName}</b>
          <span className="tiny muted">{fmtTime(d.game.date)}</span>
        </div>
      ) : null}
      <div className="section-head">
        <h3>{d.marketTitle}</h3>
        {d.market?.line !== undefined && d.market.type === 'spread' && d.game && (
          <span className="small muted">
            {d.game.home.abbr} {fmtLine(d.market.line)}
          </span>
        )}
      </div>
      {d.market?.type === 'prop' && d.market.prop && (
        <div className="card tight row">
          {d.market.prop.headshot && <img src={d.market.prop.headshot} alt="" width={44} height={44} style={{ borderRadius: '50%', objectFit: 'cover' }} />}
          <div className="grow">
            <b>{d.market.prop.name}</b> <span className="tiny muted">{d.market.prop.team}</span>
            <div className="small muted">
              {d.market.prop.statLabel} · line {d.market.line}
            </div>
          </div>
        </div>
      )}
      <OptionsBoard d={d} leading={d.status === 'open' && grade && !grade.push ? grade.winners : undefined} final={grade?.final} />
    </>
  );
}

function CustomDuel({ d }: { d: DuelDoc }) {
  return (
    <>
      <div className="section-head">
        <h3>{d.scope === 'season' ? '📅 Season-long' : d.scope === 'event' ? '🏆 Event' : '🎯 Anything goes'}</h3>
        <span className="tiny muted">Locks {fmtTime(d.locksAt)}</span>
      </div>
      <OptionsBoard d={d} />
    </>
  );
}

/* ---------- pick'em slate ---------- */

function SlateDuel({ d }: { d: DuelDoc }) {
  const me = useMe();
  const { busy, run } = useAction();
  const games = d.slate?.games ?? [];
  const details = useGames(games.map((g) => ({ league: g.game.league, eventId: g.game.eventId, date: g.game.date })));
  const live = gradeSlate(d, details);
  const mine = d.participants[me.id];
  const locked = isLocked(d);
  const [picks, setPicks] = useState<Record<string, 'home' | 'away'>>(mine?.picks ?? {});
  const canEdit = !locked && d.status === 'open';
  const allPicked = games.every((g) => picks[g.game.eventId]);
  const scores = d.result?.scores ?? live.scores;
  const standings = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const resolving = useRef(false);
  useEffect(() => {
    if (live.final && d.status === 'open' && locked && !resolving.current) {
      resolving.current = true;
      tryResolveDuel(d, me.id).finally(() => (resolving.current = false));
    }
  }, [live.final, d, locked, me.id]);

  return (
    <>
      {locked && (
        <div className="card tight">
          <div className="tiny muted upper" style={{ marginBottom: 4 }}>
            Standings {d.status === 'open' ? '(live)' : ''}
          </div>
          {standings.map(([u, s], i) => (
            <div key={u} className={`lb-row ${u === me.id ? 'me' : ''}`}>
              <span className="lb-rank">{i === 0 && s > 0 ? '👑' : i + 1}</span>
              <Avatar a={d.participants[u]?.avatar} size={30} still />
              <span className="grow" style={{ fontWeight: 700 }}>
                {d.participants[u]?.name}
              </span>
              <span className="num" style={{ fontSize: 20 }}>
                {s}
                <span className="muted small">/{games.length}</span>
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="section-head">
        <h3>
          {games.length} games · {d.slate?.ats ? 'against the spread' : 'straight up'}
        </h3>
        {!locked && <span className="tiny muted">Others' picks hidden until lock</span>}
      </div>
      <div className="list">
        {games.map((sg) => {
          const det = details[sg.game.eventId];
          const g = det?.game;
          const winners = live.perGame[sg.game.eventId];
          const myPick = canEdit ? picks[sg.game.eventId] : mine?.picks?.[sg.game.eventId];
          return (
            <div key={sg.game.eventId} className="card tight">
              <div className="row between" style={{ marginBottom: 6 }}>
                <span className="tiny muted">{g ? (g.state === 'pre' ? fmtTime(g.date) : g.detail) : fmtTime(sg.game.date)}</span>
                {g && g.state !== 'pre' && (
                  <span className="num small">
                    {g.away.abbr} {g.away.score} – {g.home.score} {g.home.abbr}
                  </span>
                )}
              </div>
              <div className="options" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {(['away', 'home'] as const).map((side) => {
                  const t = sg.game[side];
                  const isW = winners?.includes(side);
                  const pickers = locked ? d.participantIds.filter((u) => d.participants[u]?.picks?.[sg.game.eventId] === side) : [];
                  return (
                    <button
                      key={side}
                      disabled={!canEdit || (!mine && false)}
                      onClick={() => canEdit && setPicks((p) => ({ ...p, [sg.game.eventId]: side }))}
                      className={`option ${myPick === side ? 'on' : ''} ${isW ? (g?.completed ? 'won' : 'leading') : ''}`}
                      style={{ minHeight: 56 }}
                    >
                      <span className="row gap-6">
                        <TeamLogo team={t} size={22} />
                        <span className="lbl" style={{ fontSize: 17 }}>
                          {t.abbr}
                          {d.slate?.ats && <span className="od" style={{ fontSize: 13 }}> {fmtLine(side === 'home' ? sg.spread ?? 0 : -(sg.spread ?? 0))}</span>}
                        </span>
                      </span>
                      {pickers.length > 0 && (
                        <span className="stack">
                          {pickers.slice(0, 6).map((u) => (
                            <Avatar key={u} a={d.participants[u].avatar} size={20} still />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {canEdit && !mine && (
        <button
          className="btn block"
          disabled={!allPicked || busy || me.coins < d.buyIn}
          onClick={() => run(() => joinDuel(me.id, d.id, { picks }), "You're in! 🔒")}
        >
          {allPicked ? (
            <>
              Join · <Coins n={d.buyIn} size={17} />
            </>
          ) : (
            `Pick ${games.filter((g) => !picks[g.game.eventId]).length} more to join`
          )}
        </button>
      )}
      {canEdit && mine && JSON.stringify(picks) !== JSON.stringify(mine.picks) && (
        <button className="btn outline block" disabled={!allPicked || busy} onClick={() => run(() => changePick(me.id, d.id, { picks }), 'Picks saved')}>
          Save picks
        </button>
      )}
    </>
  );
}

/* ---------- players, host tools, chat ---------- */

function Players({ d }: { d: DuelDoc }) {
  const me = useMe();
  const showPicks = isLocked(d) || d.kind !== 'slate';
  return (
    <section className="col">
      <h3>Players</h3>
      <div className="card tight">
        {d.participantIds.map((u) => {
          const p = d.participants[u];
          if (!p) return null;
          const pay = d.payouts?.[u];
          const pickTxt = d.kind === 'slate' ? null : d.options?.find((o) => o.id === p.pick)?.label;
          return (
            <Link to={u === me.id ? '/me' : `/u/${u}`} key={u} className={`lb-row ${u === me.id ? 'me' : ''}`}>
              <Avatar a={p.avatar} size={36} still />
              <div className="grow">
                <div style={{ fontWeight: 700 }}>
                  {p.name} {u === d.hostUid && <span className="pill">Host</span>}
                </div>
                <div className="tiny muted">
                  {showPicks && pickTxt ? `Picked ${pickTxt}` : 'Picks hidden'}
                  {p.odds !== undefined && d.payoutMode === 'odds' ? ` (${fmtOdds(p.odds)})` : ''} · joined {timeAgo(p.joinedAt)} ago
                </div>
              </div>
              {pay !== undefined ? (
                <span className={`num ${pay > p.stake ? 'win' : pay < p.stake ? 'loss' : 'muted'}`} style={{ fontSize: 18 }}>
                  {pay > p.stake ? '+' : ''}
                  {(pay - p.stake).toLocaleString()}
                </span>
              ) : (
                <Coins n={p.stake} size={14} className="muted" />
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function HostControls({ d }: { d: DuelDoc }) {
  const me = useMe();
  const nav = useNavigate();
  const { busy, run } = useAction();
  const [settleOpen, setSettleOpen] = useState(false);
  const [winners, setWinners] = useState<string[]>([]);
  if (d.hostUid !== me.id) return null;
  const locked = isLocked(d);
  const canSettle = d.kind === 'custom' && locked && d.participantIds.length >= 2;
  const canCancel = !locked || d.participantIds.length < 2;
  if (!canSettle && !canCancel) return null;
  return (
    <section className="col">
      {canSettle && (
        <button className="btn gold block" onClick={() => setSettleOpen(true)}>
          <Icons.trophy size={20} /> Declare the winner
        </button>
      )}
      {canCancel && (
        <button
          className="btn ghost block"
          disabled={busy}
          onClick={() => {
            if (confirm('Cancel this duel and refund everyone?')) run(() => voidDuel(d, me.id), 'Duel canceled — refunds on the way').then(() => nav('/duels'));
          }}
        >
          Cancel duel & refund
        </button>
      )}
      <Sheet open={settleOpen} onClose={() => setSettleOpen(false)}>
        <div className="col" style={{ gap: 14 }}>
          <h2>Who won?</h2>
          <div className="small muted">Pick the winning option(s). Everyone in the duel will see your call. Be honest. 😇</div>
          <div className="options">
            {(d.options ?? []).map((o) => (
              <button
                key={o.id}
                className={`option ${winners.includes(o.id) ? 'on' : ''}`}
                onClick={() => setWinners((w) => (w.includes(o.id) ? w.filter((x) => x !== o.id) : [...w, o.id]))}
              >
                <span className="lbl" style={{ fontSize: 17 }}>
                  {o.label}
                </span>
              </button>
            ))}
          </div>
          <button
            className="btn block"
            disabled={!winners.length || busy}
            onClick={() =>
              run(async () => {
                const labels = (d.options ?? []).filter((o) => winners.includes(o.id)).map((o) => o.label);
                await settleDuel(d, me.id, { winners, summary: `${labels.join(' / ')} ${labels.length > 1 ? 'win' : 'wins'} (called by ${me.name})` });
                setSettleOpen(false);
              }, 'Settled! Payouts are being collected.')
            }
          >
            Settle duel
          </button>
          <button
            className="btn ghost block"
            disabled={busy}
            onClick={() => run(() => settleDuel(d, me.id, { winners: [], summary: `No contest (called by ${me.name})`, void: true }), 'Voided — everyone refunded')}
          >
            No contest — refund all
          </button>
        </div>
      </Sheet>
    </section>
  );
}

function Chat({ d }: { d: DuelDoc }) {
  const me = useMe();
  const { docs } = useQuery<MessageDoc>(`duels/${d.id}/messages`, { orderBy: ['createdAt', 'desc'], limit: 80 });
  const msgs = useMemo(() => [...docs].sort((a, b) => a.createdAt - b.createdAt), [docs]);
  const [text, setText] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' });
    if (isDemo) botReply(me.id, d, msgs);
  }, [msgs.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const send = (t: string) => {
    if (!t.trim()) return;
    sendMessage(d.id, me, t).catch(() => {});
    setText('');
  };
  const canTalk = !!d.participants[me.id];
  return (
    <section className="col">
      <h3>Trash talk</h3>
      <div className="card tight col">
        <div className="chat" ref={box}>
          {!msgs.length && <div className="small muted center" style={{ padding: 16 }}>Quiet in here… say something.</div>}
          {msgs.map((m) =>
            m.system ? (
              <div key={m.id} className="msg sys">
                <div className="bubble">{m.text}</div>
              </div>
            ) : (
              <div key={m.id} className={`msg ${m.uid === me.id ? 'mine' : ''}`}>
                <Avatar a={m.avatar} size={28} still />
                <div className="bubble">
                  {m.uid !== me.id && <div className="tiny muted" style={{ fontWeight: 700 }}>{m.name}</div>}
                  {m.text}
                </div>
              </div>
            ),
          )}
        </div>
        {canTalk ? (
          <>
            <div className="quick">
              {TRASH.map((t) => (
                <button key={t} onClick={() => send(t)}>
                  {t}
                </button>
              ))}
            </div>
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault();
                send(text);
              }}
            >
              <input className="input grow" style={{ height: 42 }} placeholder="Talk your talk…" value={text} maxLength={280} onChange={(e) => setText(e.target.value)} />
              <button className="icon-btn" style={{ background: 'var(--accent)', color: 'var(--ink)' }} aria-label="Send">
                <Icons.send size={18} />
              </button>
            </form>
          </>
        ) : (
          <div className="tiny muted center">Join the duel to chat.</div>
        )}
      </div>
    </section>
  );
}
