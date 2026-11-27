import { useMemo, useState } from 'react';
import Avatar from '../avatar/Avatar';
import { CRATE_PRICE, HAIR_COLORS, ITEMS, ITEM_MAP, RARITY_COLOR, SHOP_SLOTS, SLOT_LABELS, type AvatarConfig, type Item, type Slot } from '../avatar/items';
import Confetti from '../components/Confetti';
import { Coins, Sheet, useAction } from '../components/ui';
import { ACH_MAP } from '../data/achievements';
import { buyItem, equip, openCrate, updateProfile } from '../data/api';
import { useMe } from '../data/hooks';

const CELEBRATE_EMOJI: Record<string, string> = { c_confetti: '🎊', c_coins: '🪙', c_fire: '🔥', c_goat: '🐐' };

function ItemThumb({ item, base }: { item: Item; base: AvatarConfig }) {
  if (item.slot === 'title')
    return (
      <div style={{ height: 64, display: 'grid', placeItems: 'center' }}>
        <span className="title-tag" style={{ fontSize: 11 }}>
          {item.name}
        </span>
      </div>
    );
  if (item.slot === 'celebrate') return <div style={{ height: 64, fontSize: 40, display: 'grid', placeItems: 'center' }}>{CELEBRATE_EMOJI[item.id]}</div>;
  return <Avatar a={{ ...base, [item.slot]: item.id }} size={64} still />;
}

export default function Shop() {
  const me = useMe();
  const [slot, setSlot] = useState<Slot>('hat');
  const [tryOn, setTryOn] = useState<Partial<AvatarConfig>>({});
  const [sel, setSel] = useState<Item | null>(null);
  const [crate, setCrate] = useState<Item | null>(null);
  const { busy, run } = useAction();
  const owned = new Set(me.owned);
  const preview = { ...me.avatar, ...tryOn };
  const items = useMemo(() => ITEMS.filter((i) => i.slot === slot).sort((a, b) => Number(!!a.unlock) - Number(!!b.unlock) || a.price - b.price), [slot]);
  const ownedCount = me.owned.filter((id) => ITEM_MAP[id]?.price > 0 || ITEM_MAP[id]?.unlock).length;
  const paidTotal = ITEMS.filter((i) => i.price > 0 || i.unlock).length;

  const choose = (i: Item) => {
    setSel(i);
    setTryOn((t) => ({ ...t, [i.slot]: i.id }));
  };
  const reset = () => {
    setTryOn({});
    setSel(null);
  };

  const isOwned = sel ? owned.has(sel.id) : false;
  const equipped = sel ? me.avatar[sel.slot as keyof AvatarConfig] === sel.id : false;

  return (
    <div className="page">
      <div className="row between">
        <div>
          <h1>Drip shop</h1>
          <div className="small muted">
            {ownedCount}/{paidTotal} collected
          </div>
        </div>
        <Coins n={me.coins} size={22} className="gold" />
      </div>

      <div className="preview-stage">
        <Avatar a={preview} size={160} />
        <span className="title-tag">{ITEM_MAP[preview.title]?.name ?? 'Rookie'}</span>
        <div className="tiny muted">{me.name}</div>
        {Object.keys(tryOn).length > 0 && (
          <button className="btn xs ghost" onClick={reset} style={{ position: 'absolute', top: 10, right: 10 }}>
            Reset
          </button>
        )}
        {sel && (
          <div className="row" style={{ width: '100%', padding: '0 14px' }}>
            <div className="grow">
              <div style={{ fontWeight: 800 }}>
                {sel.name} <span className="tiny" style={{ color: RARITY_COLOR[sel.rarity], textTransform: 'uppercase', fontWeight: 800 }}>{sel.rarity}</span>
              </div>
              <div className="tiny muted">{sel.unlock ? `🔒 ${ACH_MAP[sel.unlock]?.desc ?? sel.desc}` : SLOT_LABELS[sel.slot]}</div>
            </div>
            {isOwned ? (
              equipped ? (
                <span className="pill accent">Equipped</span>
              ) : (
                <button className="btn sm" disabled={busy} onClick={() => run(() => equip(me.id, sel.slot, sel.id), 'Equipped ✨')}>
                  Equip
                </button>
              )
            ) : sel.unlock ? (
              <span className="pill">Locked</span>
            ) : (
              <button className="btn sm gold" disabled={busy || me.coins < sel.price} onClick={() => run(() => buyItem(me.id, sel.id), `${sel.name} unlocked & equipped 🛍️`)}>
                <Coins n={sel.price} size={15} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="card row" style={{ background: 'linear-gradient(135deg, #2a1b4a, #141b2f)', borderColor: 'rgba(180,107,255,.4)' }}>
        <span style={{ fontSize: 40 }}>🎁</span>
        <div className="grow">
          <h3>Mystery crate</h3>
          <div className="tiny muted">A random item you don't own. 5% legendary.</div>
        </div>
        <button
          className="btn sm"
          style={{ background: 'var(--purple)', color: '#fff' }}
          disabled={busy || me.coins < CRATE_PRICE}
          onClick={() => run(() => openCrate(me.id)).then((i) => i && setCrate(i))}
        >
          <Coins n={CRATE_PRICE} size={15} />
        </button>
      </div>

      <div className="chips">
        {SHOP_SLOTS.map((s) => (
          <button key={s} className={`chip ${s === slot ? 'on' : ''}`} onClick={() => setSlot(s)}>
            {SLOT_LABELS[s]}
          </button>
        ))}
      </div>

      {slot === 'hair' && (
        <div className="row wrap gap-6">
          {HAIR_COLORS.map((c) => (
            <button
              key={c}
              aria-label={`Hair color ${c}`}
              onClick={() => {
                setTryOn((t) => ({ ...t, hairColor: c }));
                updateProfile(me.id, { avatar: { hairColor: c } });
              }}
              style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: preview.hairColor === c ? '3px solid var(--accent)' : '2px solid var(--line2)' }}
            />
          ))}
        </div>
      )}
      {slot === 'jersey' && (
        <div className="row">
          <label className="label" style={{ margin: 0 }}>
            Jersey #
          </label>
          <input
            className="input num"
            style={{ width: 90, height: 40, fontSize: 18 }}
            inputMode="numeric"
            maxLength={2}
            defaultValue={me.avatar.number}
            onChange={(e) => setTryOn((t) => ({ ...t, number: e.target.value.replace(/\D/g, '').slice(0, 2) }))}
            onBlur={(e) => updateProfile(me.id, { avatar: { number: e.target.value.replace(/\D/g, '').slice(0, 2) || '0' } })}
          />
          <span className="tiny muted">free</span>
        </div>
      )}

      <div className="shop-grid">
        {items.map((i) => {
          const own = owned.has(i.id);
          const eq = me.avatar[i.slot as keyof AvatarConfig] === i.id;
          return (
            <button key={i.id} className={`item ${sel?.id === i.id ? 'on' : ''} ${i.unlock && !own ? 'locked' : ''}`} onClick={() => choose(i)}>
              <span className="rar" style={{ background: RARITY_COLOR[i.rarity], boxShadow: `0 0 8px ${RARITY_COLOR[i.rarity]}` }} />
              <ItemThumb item={i} base={me.avatar} />
              <span className="nm">{i.name}</span>
              {eq ? (
                <span className="pill accent">On</span>
              ) : own ? (
                <span className="pill">Owned</span>
              ) : i.unlock ? (
                <span className="pill">🔒 Earn</span>
              ) : (
                <Coins n={i.price} size={13} className={me.coins >= i.price ? 'gold' : 'dim'} />
              )}
            </button>
          );
        })}
      </div>

      <Sheet open={!!crate} onClose={() => setCrate(null)} center>
        {crate && (
          <div className="celebrate">
            <Confetti kind={crate.rarity === 'legendary' ? 'c_goat' : 'c_confetti'} count={crate.rarity === 'common' ? 30 : 70} />
            <div className="tiny upper" style={{ color: RARITY_COLOR[crate.rarity], fontWeight: 800 }}>
              {crate.rarity} {SLOT_LABELS[crate.slot]}
            </div>
            <div className="row mt-16" style={{ justifyContent: 'center' }}>
              <ItemThumb item={crate} base={me.avatar} />
            </div>
            <h2 className="mt-16">{crate.name}</h2>
            <div className="row mt-24">
              <button className="btn ghost grow" onClick={() => setCrate(null)}>
                Nice
              </button>
              <button
                className="btn grow"
                onClick={() => {
                  equip(me.id, crate.slot, crate.id);
                  setCrate(null);
                }}
              >
                Equip
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
