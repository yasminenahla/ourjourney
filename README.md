# Our Journey - Wedding & Honeymoon Tracker

A private, shared planning tool for the wedding, honeymoon, and both bach
trips - budgets, vendors, itineraries, a to-do list, and a monthly household
budget, all in one place.

## Data syncing

Every shared value in the app (budgets, vendors, itineraries, to-dos,
bookings...) is persisted to a **Firebase Firestore** collection called
`wt_shared`, one document per key. The `useShared` hook in `src/App.jsx`
subscribes to each document with `onSnapshot`, so edits from either of you
show up live on the other's screen - phone, laptop, doesn't matter -
without needing to refresh.

You need your own free Firebase project for this to work; the app won't
load data until you do the setup below.

## Set up Firebase (~10 minutes, free)

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
   and sign in with a Google account.
2. Click **Add project**. Give it a name (e.g. `our-journey`). You can
   decline Google Analytics - it's not needed for this app.
3. Once the project is created, click the **web icon (`</>`)** on the
   project overview page to register a new web app. Give it any nickname
   and click **Register app**. Firebase Hosting is not needed - skip it.
4. You'll see a `firebaseConfig` object with keys like `apiKey`,
   `authDomain`, `projectId`, etc. Keep this tab open - you'll copy these
   values in a moment.
5. In the left sidebar, go to **Build -> Firestore Database** and click
   **Create database**. Choose a location close to you, and start in
   **production mode** (the app ships its own rules - see step 7).
6. Copy `.env.example` to `.env` in this project, and fill in the values
   from the `firebaseConfig` object in step 4:
   ```bash
   cp .env.example .env
   ```
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
7. Back in the Firebase console, go to **Firestore Database -> Rules**,
   and paste in the contents of `firestore.rules` from this repo, then
   click **Publish**. (This app has no login screen, so - same as any
   link-only shared doc - anyone with your live URL can read/write it;
   the rules just scope that access to this app's own collection instead
   of leaving the whole database open.)

That's it - `npm run dev` will now read/write live to your Firestore
project, and the same `.env` values need to be added as environment
variables wherever you deploy (see below).

## Run it locally

```bash
npm install
npm run dev
```

Open the local URL it prints (usually http://localhost:5173). Make sure
you've done the Firebase setup above first, or the app will sit on
"Loading your tracker..." (check the browser console for the missing-config
error).

## Deploy it (so you can both use it from anywhere)

### Vercel (recommended)
1. Push this repo to GitHub (already done if you're reading this from the
   repo Claude Code set up).
2. Go to [vercel.com](https://vercel.com), **Add New -> Project**, and
   import the `ourjourney` repo.
3. Framework preset: **Vite** (auto-detected). Before deploying, open
   **Environment Variables** and add the same six `VITE_FIREBASE_*` keys
   from your `.env` file.
4. Click **Deploy**. You'll get a live `https://....vercel.app` URL you
   can both open on any device - every push to the repo redeploys it
   automatically.

### GitHub Pages (alternative)
1. In `vite.config.js`, set `base: "/your-repo-name/"`.
2. `npm run build`
3. Deploy the `dist/` folder to the `gh-pages` branch (e.g. using the
   `gh-pages` npm package, or GitHub's own Pages-from-branch setting).
   You'll still need the `VITE_FIREBASE_*` variables available at build
   time, e.g. as GitHub Actions secrets.

## Project structure

```
index.html          Entry HTML
src/main.jsx         React root
src/App.jsx           Everything: design tokens, seed data, all sections
src/index.css         Tailwind entry point
tailwind.config.js
vite.config.js
```

Everything lives in `src/App.jsx` for now (it started as a single-file
Claude artifact). If the file gets unwieldy, it's a clean split into
`src/components/*.jsx` and `src/data/seed.js` - the code is already
organized in clearly commented sections that map 1:1 to a good file
split, if/when you want to do that.

## What's pre-loaded

- Wedding budget (Cairo, 350 guests) with venue, catering, planner,
  photography, entertainment, florals, attire, and pre-wedding events
- Vendor directory: planners, outdoor venues, DJs, photographers
- Honeymoon budget (two tiers) + day-by-day itinerary, Zanzibar + Seychelles
- Both bach trips (Sharm El Sheikh for the groomsmen, Istanbul for the
  bridesmaids) including the full 19-listing Airbnb comparison
- A categorized, editable to-do list seeded from the original timeline
- A booking tracker for deposits/balances
- A monthly budget carried over from your Google Sheet, all categories
