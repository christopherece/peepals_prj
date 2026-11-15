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
   (the second adds member-only writes, the `toilet_photos` table and the `toilet-photos` storage bucket;
   the third adds in-app account deletion and the `reports` table).
3. **Authentication → Sign In / Providers → Email**: on. Then **Authentication → Emails → Magic Link** template:
   include `{{ .Token }}` so the email shows the 6-digit code the app asks for.
   Accounts get a nickname like "Peepal 4F2A" that they can change on the Profile tab.
4. Copy `.env.example` to `.env.local` and fill in the values from **Project Settings → API Keys**
   (Project URL and the publishable key).
5. Restart `npx expo start`. The Profile tab should now say reviews are shared.

## Ship it (iOS and Android)

Builds run in the cloud with [EAS](https://docs.expo.dev/build/introduction/); profiles are in `eas.json`.
You need an Expo account, an Apple Developer account (99 USD/year) and a Google Play Console account (25 USD once).

1. **App IDs.** `app.json` uses `com.christopherece.peepals` for both `ios.bundleIdentifier` and `android.package`.
   Change it now if you want a different one: it can't be changed after the first store release.
2. **Link the project:** `npx eas-cli@latest login`, then `npx eas-cli@latest init`.
3. **Environment variables.** `.env.local` is git-ignored, so cloud builds never see it. Without these the
   store build silently runs in offline mode. Run each for `production` (and `preview` / `development` if you use them):

   ```sh
   npx eas-cli@latest env:set --environment production --visibility plaintext --name EXPO_PUBLIC_SUPABASE_URL --value https://YOUR-PROJECT.supabase.co
   npx eas-cli@latest env:set --environment production --visibility plaintext --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value YOUR_PUBLISHABLE_KEY
   npx eas-cli@latest env:set --environment production --visibility sensitive --name GOOGLE_MAPS_API_KEY --value YOUR_ANDROID_MAPS_KEY
   ```

4. **Google Maps key (Android only).** In Google Cloud Console enable **Maps SDK for Android**, create an API key and
   restrict it to the package name plus the SHA-1 fingerprints of the EAS keystore (`npx eas-cli@latest credentials`)
   and, after the first upload, the Play app-signing key (Play Console → Test and release → App integrity).
   Without a key the Android map is blank grey. iOS uses Apple Maps and needs no key.
5. **Supabase for production.** Run all migrations, then set up custom SMTP (Authentication → Emails → SMTP):
   the built-in mailer only sends a couple of emails per hour, far too few for sign-in codes.
6. **Test on real phones first:** `npx eas-cli@latest build --profile preview --platform android` gives an
   installable APK; for iOS use `--profile production` and TestFlight.
7. **Release:** `npx eas-cli@latest build --profile production --platform all`, then
   `npx eas-cli@latest submit --profile production --platform all`. The very first Android upload has to be
   done by hand in Play Console; after that `submit` works.

**Sign-in for app reviewers.** Apple and Google reviewers can't receive the emailed code, so give them a fixed one:
1. Supabase → **Authentication → Users → Add user → Create new user**: an address like `review@yourdomain.com`,
   a 6-digit **password** (e.g. `482916`), and tick **Auto Confirm User**.
2. `npx eas-cli@latest env:set --environment production --visibility plaintext --name EXPO_PUBLIC_REVIEW_EMAIL --value review@yourdomain.com`
3. In App Store Connect (**App Review Information**) and Play Console (**App content → App access**), give the
   address and say: "Enter this email, tap Email me a code, then enter 482916 as the code."
   For that one address no email is sent and the code is checked as its password.

Both stores also ask for things that live outside this repo: a **privacy policy URL** (the app collects email,
location and photos), a **support contact**, the data-safety / privacy-label forms, and for Google Play a
**web page where people can request account deletion** (the in-app "Delete account" on the Profile tab covers Apple).
Reported reviews, photos and toilets land in the Supabase `reports` table: check it regularly and delete offending rows.

## How it fits together

- Toilets come live from **OpenStreetMap** (Overpass API) within 2 km of the user: `lib/osm.ts`.
- Accounts, reviews, photos, user-added toilets and nicknames go through `lib/backend/`, either Supabase or on-device storage.
- Toilet details, sign-in and "add a spot" are native bottom sheets (`presentation: 'formSheet'` in `app/_layout.tsx`).
- "I need to go NOW" logic: `lib/emergency.ts`. Opening-hours parsing: `lib/openingHours.ts`.

Toilet data © OpenStreetMap contributors (ODbL).
