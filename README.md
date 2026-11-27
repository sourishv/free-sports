# 🪙 FreeSports: duel your friends with play money

A mobile-first web app for betting **virtual coins** against your friends on real sports, with live scores and real sportsbook lines. Spend your winnings on avatar drip. **$0 to run**: no paid APIs, servers, or hosting.

> Coins are play money. They can't be bought, sold, or cashed out.

## What's in it

**Live sports, for free**
- Scores, schedules, and DraftKings lines (moneyline, spread, total, 3-way soccer) from ESPN's public feed, refreshed every 15s while games are live
- NFL, NBA, NHL, MLB, college football and hoops (men's and women's), WNBA, Premier League, Champions League, La Liga, Serie A, Bundesliga, Ligue 1, MLS, and UFC

**Sportsbook (vs. the house)**
- Tap any odds to build a bet slip: straight bets or parlays
- Bets settle automatically from final scores
- Postponed games are refunded, and a voided parlay leg is dropped

**Duels (vs. your friends)**, from 1v1 up to any number of players
- **Single game**: moneyline, spread, total, 1st half / 1st period / first 5 innings, team totals, and **player props** (points, PRA, passing yards, shots, Ks…) with any line you choose. Works pregame or **live in-game** (picks lock 2–20 minutes after you create it).
- **Pick'em slate**: everyone picks every game on a day or week, straight up or against the spread. Most correct wins the pot.
- **Season / event / anything**: champion, MVP, win totals, the draft, the Oscars, "who's late to brunch". Fill the options with every team in a league in one tap. The host declares the winner.
- **Payouts**: "winners split the pot", or **fair odds** (taking the favorite pays less, like a real book)
- Invite by link or 6-letter code, see who picked what, follow the live score, and talk trash in chat with quick reactions
- Game and pick'em duels auto-settle. If nobody else joins before the lock, your buy-in comes back.

**Progression and flex**
- 🔥 **Win streaks with Heat Check bonuses**: from your 3rd straight win, every win pays +10% extra per streak level (max +50%). Cold streaks show 🧊.
- Daily login streak (day 7 pays 750), XP and levels, 14 achievements (some unlock exclusive items), and friend and global leaderboards
- **Drip shop**: 100+ original avatar items across hats, eyewear, jerseys (pick your number), hair, faces, backgrounds, animated frames and auras, titles ("Certified Degen", "The Oracle", "Whale"), and win celebrations. Includes a 🎁 mystery crate.
- Broke? Take a daily **bailout**. Your bailout count is public. 😬

## Run it

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # payout, grading, settlement and duel-lifecycle tests
npm run build
```

With no configuration the app runs in **Demo Mode**. Everything is stored in the browser, and five bot "friends" join your duels, talk trash, and fill the leaderboard. That's the quickest way to try it.

## Play with real friends: free Firebase setup (≈10 min, no credit card)

1. Go to <https://console.firebase.google.com> → **Add project** (you can turn off Analytics). It stays on the free **Spark** plan.
2. **Build → Authentication → Get started**. Enable **Anonymous**, and **Google** too if you want people to keep their account across devices.
3. **Build → Firestore Database → Create database** (production mode, any region). Open the **Rules** tab, paste in [`firestore.rules`](firestore.rules), and click **Publish**.
4. **Project settings (⚙️) → Your apps → Web (`</>`)**: register an app and copy the `firebaseConfig` values.
5. Paste them into `src/config.ts` (`PASTED_CONFIG`), or into `.env.local` using [`.env.example`](.env.example). The web config isn't secret, so it's safe to commit. Security comes from the rules.

## Free hosting: Vercel (works with private repos, can be done from a phone)

1. Go to <https://vercel.com> → **Sign up with GitHub** (Hobby plan, free, no card).
2. **Add New… → Project** → give Vercel access to this repo → **Import**. Vite is detected automatically (build `npm run build`, output `dist`). Click **Deploy**.
3. You get a URL like `https://free-sports-xxxx.vercel.app`. Every push redeploys automatically.
4. Once you have Firebase: **Project → Settings → Environment Variables** → add the six `VITE_FIREBASE_*` values → **Deployments → Redeploy**. If you use Google sign-in, add the `vercel.app` domain under Firebase **Authentication → Settings → Authorized domains**.

## Alternative: GitHub Pages (public repos only on the free GitHub plan)

1. Repo **Settings → Pages → Source: GitHub Actions**.
2. If you used env vars instead of `config.ts`: **Settings → Secrets and variables → Actions → Variables** → add the six `VITE_FIREBASE_*` values.
3. Push to `main`. [`deploy.yml`](.github/workflows/deploy.yml) tests, builds, and publishes to `https://<you>.github.io/<repo>/`.
4. Using Google sign-in? Add `<you>.github.io` under Firebase **Authentication → Settings → Authorized domains**.

On a phone, open the site and choose **Add to Home Screen**. It runs full-screen like an app.

Other free options: `npx firebase-tools deploy` (Firebase Hosting, `firebase.json` is included), Netlify, or Cloudflare Pages. Build command `npm run build`, output folder `dist`.

## How it works (for vibe-coding further)

| Piece | Where |
|---|---|
| ESPN fetch and parsing (scores, odds, box scores, rosters) | `src/lib/espn.ts` |
| Markets, options, and grading (live and final) | `src/lib/markets.ts` |
| Payout math (pot / fair odds / pick'em) | `src/lib/payouts.ts` |
| Game rules: bets, duels, streaks, achievements, shop | `src/data/api.ts` |
| Background settler and payout collection | `src/data/engine.tsx` |
| Storage: one interface, two backends | `src/data/store.ts`, `localStore.ts`, `firebaseStore.ts` |
| Avatar items and SVG renderer | `src/avatar/items.ts`, `src/avatar/Avatar.tsx` |
| Leagues and prop stats | `src/lib/leagues.ts` |
| Pages | `src/pages/*` |

**No server needed.** Any participant's app can settle a finished game: it checks the final score and writes the result in a transaction, so settling twice does nothing. Each player's own app then **collects** their payout, so nobody ever writes to someone else's balance. That keeps everything inside Firebase's free tier (no Cloud Functions). The trade-off: it's trust-among-friends. Someone determined, with dev tools, could edit their own coin count.

**Free-tier headroom:** Firestore's free tier allows 50k reads and 20k writes per day, which is plenty for a friend group. ESPN's feed is unofficial and keyless. If it ever changes shape, `src/lib/espn.ts` is the only file to touch.
