export type Slot = 'skin' | 'hair' | 'bg' | 'jersey' | 'eyes' | 'mouth' | 'hat' | 'eyewear' | 'face' | 'frame' | 'effect' | 'title' | 'celebrate';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Item {
  id: string;
  slot: Slot;
  name: string;
  price: number; // 0 = free starter
  rarity: Rarity;
  /** colors or drawing params */
  c?: string[];
  /** only unlockable via achievement */
  unlock?: string;
  desc?: string;
}

const it = (slot: Slot, id: string, name: string, price: number, rarity: Rarity, c?: string[], extra?: Partial<Item>): Item => ({
  slot,
  id,
  name,
  price,
  rarity,
  c,
  ...extra,
});

export const ITEMS: Item[] = [
  // skin tones (free) + fun skins
  it('skin', 'skin1', 'Tone 1', 0, 'common', ['#ffdbb4']),
  it('skin', 'skin2', 'Tone 2', 0, 'common', ['#f1c08f']),
  it('skin', 'skin3', 'Tone 3', 0, 'common', ['#d9a06b']),
  it('skin', 'skin4', 'Tone 4', 0, 'common', ['#b47a4a']),
  it('skin', 'skin5', 'Tone 5', 0, 'common', ['#8d5a36']),
  it('skin', 'skin6', 'Tone 6', 0, 'common', ['#5e3b24']),
  it('skin', 'alien', 'Martian', 600, 'rare', ['#8ee07a']),
  it('skin', 'smurf', 'Ice Blue', 600, 'rare', ['#7cc4ff']),
  it('skin', 'zombie', 'Overtime Zombie', 900, 'epic', ['#a3b89a']),
  it('skin', 'chrome', 'Gold Chrome', 4000, 'legendary', ['#ffd75e', '#c78a00']),

  // hair
  it('hair', 'hair_none', 'Clean Dome', 0, 'common'),
  it('hair', 'hair_buzz', 'Buzz Cut', 0, 'common'),
  it('hair', 'hair_fade', 'Fade', 0, 'common'),
  it('hair', 'hair_long', 'Flow', 0, 'common'),
  it('hair', 'hair_afro', 'Big Fro', 250, 'common'),
  it('hair', 'hair_mohawk', 'Mohawk', 300, 'rare'),
  it('hair', 'hair_spiky', 'Spikes', 300, 'rare'),
  it('hair', 'hair_bun', 'Top Knot', 250, 'common'),
  it('hair', 'hair_mullet', 'Business/Party', 700, 'epic'),

  // backgrounds
  it('bg', 'bg_slate', 'Locker Room', 0, 'common', ['#2b3350', '#1a2036']),
  it('bg', 'bg_turf', 'Turf', 150, 'common', ['#2fbf71', '#127a45']),
  it('bg', 'bg_court', 'Hardwood', 150, 'common', ['#f0a35e', '#b8692a']),
  it('bg', 'bg_ice', 'Fresh Ice', 150, 'common', ['#dff3ff', '#8dc8ef']),
  it('bg', 'bg_sunset', 'Sunset', 400, 'rare', ['#ff7e5f', '#7b2ff7']),
  it('bg', 'bg_ocean', 'Deep Sea', 400, 'rare', ['#00c6ff', '#0040a0']),
  it('bg', 'bg_lava', 'Lava', 800, 'epic', ['#ff3d00', '#4a0000']),
  it('bg', 'bg_galaxy', 'Galaxy', 1500, 'epic', ['#3a1c71', '#05010f']),
  it('bg', 'bg_money', 'Cash Stack', 2500, 'legendary', ['#1e9e4a', '#0b4a22']),
  it('bg', 'bg_gold', 'Solid Gold', 5000, 'legendary', ['#ffe27a', '#b8860b']),

  // jerseys
  it('jersey', 'j_red', 'Red Home', 0, 'common', ['#e63946', '#ffffff']),
  it('jersey', 'j_blue', 'Royal Away', 0, 'common', ['#1d4ed8', '#ffffff']),
  it('jersey', 'j_black', 'Blackout', 200, 'common', ['#151515', '#f5d742']),
  it('jersey', 'j_white', 'Clean Whites', 200, 'common', ['#f4f4f4', '#1d1d1d']),
  it('jersey', 'j_green', 'Kelly Green', 200, 'common', ['#118c4f', '#ffffff']),
  it('jersey', 'j_purple', 'Purple Reign', 300, 'rare', ['#5b2a86', '#fdb927']),
  it('jersey', 'j_teal', 'Teal Throwback', 350, 'rare', ['#00a3ad', '#ffffff']),
  it('jersey', 'j_pink', 'Pink Out', 350, 'rare', ['#ff5fa2', '#ffffff']),
  it('jersey', 'j_camo', 'Salute', 700, 'epic', ['#5c6b3c', '#e8e2c8']),
  it('jersey', 'j_tiedye', 'Tie-Dye', 1200, 'epic', ['#ff4ecd', '#ffffff', '#4ef2ff', '#ffe74e']),
  it('jersey', 'j_gold', '24K Kit', 3500, 'legendary', ['#ffd75e', '#3b2a00', '#c78a00']),

  // eyes
  it('eyes', 'e_dot', 'Locked In', 0, 'common'),
  it('eyes', 'e_happy', 'Good Vibes', 0, 'common'),
  it('eyes', 'e_wink', 'Wink', 150, 'common'),
  it('eyes', 'e_focus', 'Game Face', 200, 'common'),
  it('eyes', 'e_sleepy', 'Late Game', 200, 'common'),
  it('eyes', 'e_hearts', 'Smitten', 500, 'rare'),
  it('eyes', 'e_stars', 'Starstruck', 700, 'epic'),
  it('eyes', 'e_money', 'Dollar Signs', 900, 'epic'),
  it('eyes', 'e_laser', 'Laser Eyes', 3000, 'legendary'),

  // mouth
  it('mouth', 'm_smile', 'Smile', 0, 'common'),
  it('mouth', 'm_grin', 'Big Grin', 0, 'common'),
  it('mouth', 'm_smirk', 'Smirk', 150, 'common'),
  it('mouth', 'm_o', 'Shook', 150, 'common'),
  it('mouth', 'm_tongue', 'Silly', 250, 'rare'),
  it('mouth', 'm_guard', 'Mouthguard', 300, 'rare'),
  it('mouth', 'm_whistle', 'Ref Whistle', 400, 'rare'),
  it('mouth', 'm_grill', 'Gold Grill', 1800, 'legendary'),

  // hats
  it('hat', 'h_none', 'No Hat', 0, 'common'),
  it('hat', 'h_cap', 'Ball Cap', 150, 'common', ['#1d4ed8']),
  it('hat', 'h_back', 'Backwards Cap', 200, 'common', ['#e63946']),
  it('hat', 'h_beanie', 'Pom Beanie', 250, 'common', ['#f97316', '#fff']),
  it('hat', 'h_band', 'Sweatband', 200, 'common', ['#ffffff', '#e63946']),
  it('hat', 'h_helmet', 'Gridiron Helmet', 600, 'rare', ['#c0c7d6', '#1d4ed8']),
  it('hat', 'h_cowboy', 'Ten Gallon', 600, 'rare', ['#8b5a2b']),
  it('hat', 'h_prop', 'Propeller Beanie', 500, 'rare', ['#ffcc00', '#e63946', '#1d4ed8']),
  it('hat', 'h_viking', 'Viking Horns', 900, 'epic', ['#9aa3ad', '#f4ecd8']),
  it('hat', 'h_halo', 'Halo', 1600, 'epic', ['#fff7a8']),
  it('hat', 'h_crown', 'Crown', 4500, 'legendary', ['#ffd75e', '#e63946']),

  // eyewear
  it('eyewear', 'g_none', 'None', 0, 'common'),
  it('eyewear', 'g_shades', 'Shades', 200, 'common', ['#111']),
  it('eyewear', 'g_nerd', 'Stat Nerd', 250, 'common', ['#222']),
  it('eyewear', 'g_goggles', 'Ski Goggles', 500, 'rare', ['#ff8a00', '#2ad4ff']),
  it('eyewear', 'g_visor', 'Tinted Visor', 700, 'epic', ['#7b2ff7', '#00f0ff']),
  it('eyewear', 'g_vipers', 'Rainbow Vipers', 1200, 'epic', ['#ff004c', '#ffd400', '#00e676', '#2979ff']),
  it('eyewear', 'g_monocle', 'Monocle', 2000, 'legendary', ['#ffd75e']),

  // face extras
  it('face', 'f_none', 'None', 0, 'common'),
  it('face', 'f_eyeblack', 'Eye Black', 100, 'common'),
  it('face', 'f_blush', 'Blush', 100, 'common'),
  it('face', 'f_freckles', 'Freckles', 150, 'common'),
  it('face', 'f_stache', 'Mustache', 300, 'rare'),
  it('face', 'f_beard', 'Playoff Beard', 500, 'rare'),
  it('face', 'f_paint', 'War Paint', 600, 'epic', ['#1d4ed8', '#e63946']),
  it('face', 'f_scar', 'Battle Scar', 400, 'rare'),

  // frames
  it('frame', 'fr_none', 'None', 0, 'common'),
  it('frame', 'fr_bronze', 'Bronze', 300, 'common', ['#cd7f32', '#8a4b16']),
  it('frame', 'fr_silver', 'Silver', 700, 'rare', ['#e6e9ef', '#8a93a3']),
  it('frame', 'fr_gold', 'Gold', 1500, 'epic', ['#ffe27a', '#b8860b']),
  it('frame', 'fr_neon', 'Neon', 2000, 'epic', ['#00f0ff', '#ff2bd6']),
  it('frame', 'fr_fire', 'On Fire', 0, 'epic', ['#ffcc00', '#ff3d00'], { unlock: 'streak5', desc: 'Unlocked by a 5-win streak' }),
  it('frame', 'fr_diamond', 'Diamond', 6000, 'legendary', ['#e0fbff', '#5ad1ff']),

  // effects
  it('effect', 'fx_none', 'None', 0, 'common'),
  it('effect', 'fx_glow', 'Glow Up', 500, 'rare', ['#7dfcff']),
  it('effect', 'fx_sparkle', 'Sparkles', 900, 'epic', ['#fff6a8']),
  it('effect', 'fx_orbit', 'Orbiting Ball', 1200, 'epic'),
  it('effect', 'fx_fire', 'Heat Check Aura', 2500, 'legendary', ['#ff9100', '#ff1744']),
  it('effect', 'fx_bolt', 'Lightning', 2500, 'legendary', ['#fff176', '#40c4ff']),
  it('effect', 'fx_goat', 'G.O.A.T.', 0, 'legendary', undefined, { unlock: 'streak10', desc: 'Unlocked by a 10-win streak' }),

  // titles
  it('title', 't_rookie', 'Rookie', 0, 'common'),
  it('title', 't_couch', 'Couch GM', 100, 'common'),
  it('title', 't_sharp', 'Sharp', 400, 'rare'),
  it('title', 't_degen', 'Certified Degen', 400, 'rare'),
  it('title', 't_fade', 'Fade Me', 400, 'rare'),
  it('title', 't_bag', 'Bag Chaser', 700, 'epic'),
  it('title', 't_lock', 'Lock Smith', 900, 'epic'),
  it('title', 't_hammer', 'Hammer Time', 900, 'epic'),
  it('title', 't_oracle', 'The Oracle', 2500, 'legendary'),
  it('title', 't_whale', 'Whale', 10000, 'legendary'),
  it('title', 't_parlay', 'Parlay Prince(ss)', 0, 'epic', undefined, { unlock: 'parlay3', desc: 'Hit a 3+ leg parlay' }),
  it('title', 't_dog', 'Dog Whisperer', 0, 'epic', undefined, { unlock: 'underdog', desc: 'Win at +250 or longer' }),
  it('title', 't_bailout', 'Too Big To Fail', 0, 'rare', undefined, { unlock: 'bailout3', desc: 'Take 3 bailouts' }),

  // win celebrations
  it('celebrate', 'c_confetti', 'Confetti', 0, 'common'),
  it('celebrate', 'c_coins', 'Coin Shower', 600, 'rare'),
  it('celebrate', 'c_fire', 'Flamethrower', 1200, 'epic'),
  it('celebrate', 'c_goat', 'Goat Stampede', 2000, 'legendary'),
];

export const ITEM_MAP: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export interface AvatarConfig {
  skin: string;
  hair: string;
  hairColor: string;
  bg: string;
  jersey: string;
  number: string;
  eyes: string;
  mouth: string;
  hat: string;
  eyewear: string;
  face: string;
  frame: string;
  effect: string;
  title: string;
  celebrate: string;
}

export const HAIR_COLORS = ['#1b1b1b', '#4a2c17', '#8a5a2b', '#e2b659', '#b5382c', '#e8e8e8', '#7c4dff', '#00c2a8', '#ff4f9a'];

export const SLOT_LABELS: Record<Slot, string> = {
  skin: 'Skin',
  hair: 'Hair',
  bg: 'Background',
  jersey: 'Jersey',
  eyes: 'Eyes',
  mouth: 'Mouth',
  hat: 'Hats',
  eyewear: 'Eyewear',
  face: 'Face',
  frame: 'Frames',
  effect: 'Effects',
  title: 'Titles',
  celebrate: 'Win FX',
};

export const SHOP_SLOTS: Slot[] = ['hat', 'eyewear', 'jersey', 'bg', 'frame', 'effect', 'title', 'celebrate', 'hair', 'eyes', 'mouth', 'face', 'skin'];

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9aa6bf',
  rare: '#4da3ff',
  epic: '#b46bff',
  legendary: '#ffb020',
};

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export function randomStarterAvatar(): AvatarConfig {
  return {
    skin: pick(['skin1', 'skin2', 'skin3', 'skin4', 'skin5', 'skin6']),
    hair: pick(['hair_buzz', 'hair_fade', 'hair_long', 'hair_none']),
    hairColor: pick(HAIR_COLORS.slice(0, 6)),
    bg: 'bg_slate',
    jersey: pick(['j_red', 'j_blue']),
    number: String(Math.floor(Math.random() * 99)),
    eyes: pick(['e_dot', 'e_happy']),
    mouth: pick(['m_smile', 'm_grin']),
    hat: 'h_none',
    eyewear: 'g_none',
    face: 'f_none',
    frame: 'fr_none',
    effect: 'fx_none',
    title: 't_rookie',
    celebrate: 'c_confetti',
  };
}

export const FREE_ITEMS = ITEMS.filter((i) => i.price === 0 && !i.unlock).map((i) => i.id);

/** Mystery crate: weighted random paid item you don't own yet. */
export const CRATE_PRICE = 400;
export function rollCrate(owned: string[]): Item | null {
  const pool = ITEMS.filter((i) => i.price > 0 && !owned.includes(i.id));
  if (!pool.length) return null;
  const weight: Record<Rarity, number> = { common: 50, rare: 30, epic: 15, legendary: 5 };
  const total = pool.reduce((a, i) => a + weight[i.rarity], 0);
  let r = Math.random() * total;
  for (const i of pool) {
    r -= weight[i.rarity];
    if (r <= 0) return i;
  }
  return pool[pool.length - 1];
}
