# Peepals 🚽

A social toilet finder: find the nearest toilet, see whether it's free, open and accessible, and rate it for the next person.

## Run it

```sh
npm install
npx expo start
```

The dev server runs on port **2233** (set in `.env`).

Scan the QR code with **Expo Go** on your phone. (The map only works on iOS/Android, not web.)

Without Supabase keys the app runs in **offline mode**: reviews, photos and added toilets are saved only on that phone, and signing in just saves your email and nickname on the device (no code is sent).

## Accounts

Anyone can browse the map, search and get directions as a **guest**. Leaving a review, adding a toilet or uploading a photo opens a sign-in sheet: enter your email, then the 6-digit code we send you. No passwords.

## Turn on shared reviews (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor** → run each file in [`supabase/migrations/`](supabase/migrations/) in order
   (the second one adds member-only writes, the `toilet_photos` table and the `toilet-photos` storage bucket).
3. **Authentication → Sign In / Providers → Email**: on. Then **Authentication → Emails → Magic Link** template:
   include `{{ .Token }}` so the email shows the 6-digit code the app asks for.
   Accounts get a nickname like "Peepal 4F2A" that they can change on the Profile tab.
4. Copy `.env.example` to `.env.local` and fill in the values from **Project Settings → API Keys**
   (Project URL and the publishable key).
5. Restart `npx expo start`. The Profile tab should now say reviews are shared.

## How it fits together

- Toilets come live from **OpenStreetMap** (Overpass API) within 2 km of the user: `lib/osm.ts`.
- Accounts, reviews, photos, user-added toilets and nicknames go through `lib/backend/`, either Supabase or on-device storage.
- Toilet details, sign-in and "add a spot" are native bottom sheets (`presentation: 'formSheet'` in `app/_layout.tsx`).
- "I need to go NOW" logic: `lib/emergency.ts`. Opening-hours parsing: `lib/openingHours.ts`.

Toilet data © OpenStreetMap contributors (ODbL).
