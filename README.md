# Peepals 🚽

A social toilet finder: find the nearest toilet, see whether it's free, open and accessible, and rate it for the next person.

## Run it

```sh
npm install
npx expo start
```

The dev server runs on port **2233** (set in `.env`).

Scan the QR code with **Expo Go** on your phone. (The map only works on iOS/Android, not web.)

Without Supabase keys the app runs in **offline mode**: reviews and added toilets are saved only on that phone.

## Turn on shared reviews (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor** → paste and run [`supabase/migrations/20261009000000_init.sql`](supabase/migrations/20261009000000_init.sql).
3. **Authentication → Sign In / Providers** → enable **Allow anonymous sign-ins**.
   Users get a nickname like "Peepal 4F2A" on first launch, with no sign-up form.
4. Copy `.env.example` to `.env.local` and fill in the values from **Project Settings → API Keys**
   (Project URL and the publishable key).
5. Restart `npx expo start`. The Profile tab should now say reviews are shared.

## How it fits together

- Toilets come live from **OpenStreetMap** (Overpass API) within 2 km of the user: `lib/osm.ts`.
- Reviews, user-added toilets and nicknames go through `lib/backend/`, either Supabase or on-device storage.
- "I need to go NOW" logic: `lib/emergency.ts`. Opening-hours parsing: `lib/openingHours.ts`.

Toilet data © OpenStreetMap contributors (ODbL).
