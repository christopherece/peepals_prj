# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Read `AGENTS.md` first: it holds the Expo rules (fetch versioned docs before touching Expo APIs, `npx expo install` for deps, CNG / no hand-edited `ios/` `android/`). This project is on **Expo SDK 57** (docs: https://docs.expo.dev/versions/v57.0.0/). Routes live in `app/` at the repo root (there is no `src/`). The `@/*` path alias maps to the repo root (`@/lib/...`, `@/components/...`).

## What the app is

Peepals is a social toilet finder. Core loop: open the app → see toilets within 2 km on a map/list → filter (free, open now, accessible, changing table, gender-neutral) → open one for walking directions → leave a review so the next person knows. The headline feature is the big red **"I need to go NOW"** button, which jumps straight to the best free, open toilet. The "social" part is Waze-style: **guests** can browse, filter and navigate without an account; **members** (email + 6-digit code, no passwords) can post reviews (cleanliness / safety / wait, 1–5 each, plus a tip like "Code is 4432"), upload photos and add toilets missing from OSM. Nicknames are editable ("Peepal 4F2A" by default). No feed, no friends.

Copy is friendly and a little playful ("Thanks, Peepal! 🧻"), and error/empty states always suggest what to do next.

## Commands

The project uses npm (`package-lock.json`), not bun.

```bash
npx expo start      # dev server on port 2233 (RCT_METRO_PORT in .env)
npx expo lint       # lint (eslint-config-expo)
npx tsc --noEmit    # typecheck
```

There is no test runner or test suite. Run lint and typecheck before declaring work done.

The map (`react-native-maps`) only works on iOS/Android; `components/ToiletMap.web.tsx` is a placeholder, so the web build is only for quick UI checks.

## Architecture

**Single data hub: `lib/ToiletsContext.tsx`.** `ToiletsProvider` (mounted in `app/_layout.tsx`) owns location permission, fetching, filtering, reviews, and auth (`profile` is the signed-in member or `null` for a guest; `signIn`/`signOut`). Screens read everything via `useToilets()`. Key derived values:
- `allNearby`: OSM toilets + user-added toilets, with distance, sorted nearest first. Emergency mode uses this and **ignores filters**.
- `visible`: `allNearby` with the user's `Filters` applied (used by map/list).

**Two toilet sources, merged client-side:**
- `lib/osm.ts` queries public Overpass mirrors in order (10 s timeout each; the main one often returns 504) within 2 km and maps OSM tags to `Toilet` (ids like `osm-node-123`; private/`access=no` toilets are dropped). A failure here is fatal for the load.
- User-added toilets come from the backend (ids prefixed `user-`). Their failure, and review-fetch failure, is non-fatal (logged, treated as empty).

**Pluggable backend: `lib/backend/`.** `Backend` (in `types.ts`) is the storage interface for accounts, reviews, user toilets and photos. `index.ts` picks the implementation at module load:
- `supabase.ts` if `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set (in `.env.local`, git-ignored). Sign-in is email only: `signInWithOtp` sends a 6-digit code, `verifyOtp` checks it. Anonymous sessions left over from older versions count as guests. The client in `lib/supabase.ts` persists sessions via `expo-sqlite` localStorage.
- `local.ts` otherwise ("offline mode"): AsyncStorage on the device, fixed `local-user` id. There are no real accounts: "signing in" saves an email + nickname device profile (nothing is sent), and photos are copied into the app's documents folder. Its `fetchUserToilets` ignores the radius and returns every toilet the user has added.

Any new persisted feature must be added to the `Backend` interface and implemented in **both** backends. `backend.shared` tells the UI which mode it's in (shown on the Profile tab).

**Supabase schema** is in `supabase/migrations/` (applied manually via the Supabase SQL editor, per README). Tables: `profiles` (auto-created by an `auth.users` trigger with a "Peepal XXXX" nickname), `reviews` (one per user per toilet; saving again replaces it), `user_toilets`, `toilet_photos` (files in the public `toilet-photos` storage bucket under `<user id>/`). All have RLS: public read; writes restricted to the owner **and** `public.is_member()` (signed in, not anonymous). Schema changes need a new migration file and matching row mapping in `lib/backend/supabase.ts`.

**Domain logic (pure functions, no React):**
- `lib/emergency.ts`: "I need to go NOW" pick: excludes paid / customers-only / known-closed; unknown hours count as 1.5x distance.
- `lib/openingHours.ts`: minimal OSM `opening_hours` parser. Returns `true`/`false`/`null`; `null` means unknown or too complex, and callers treat it differently from `false`.
- Tri-state `boolean | null` is used throughout `Toilet` (fee, wheelchair, etc.): `null` = unknown from OSM. Filters require an explicit `true`/`false`, not `null`.

**Auth gate:** contribution actions call `useRequireMember()(action)` (`lib/useRequireMember.ts`) first. For guests it pushes the `sign-in` sheet on top and returns `false`; the screen underneath keeps its form state, so the user just taps again after signing in. Context write methods throw for guests, so always gate in the UI.

**Routes:** `app/(tabs)/` holds the Map (`index`, full-bleed, no header), Nearby list and Profile tabs. `toilet/[id]`, `add-toilet` and `sign-in` are native bottom sheets (`presentation: 'formSheet'` with detents, set in `app/_layout.tsx`). Native headers don't render in form sheets, so each sheet draws its own title.
- `toilet/[id]` looks the toilet up in `allNearby`, so it only works for toilets in the current 2 km load (no fetch-by-id). The `emergency=1` param shows the red "Nearest free toilet" banner. Directions open Apple Maps on iOS, Google Maps elsewhere, in walking mode.
- `add-toilet` is opened by the map's + FAB and pins the toilet at the user's current location (no map picker). Unchecked switches are saved as `null` (unknown), not `false`.
- Reviews are one per user per toilet in both backends; posting again replaces the old one (UI says "Update your review"). The star average in `lib/format.ts` `ratingSummary` averages the three scores.

## UI conventions

- Tokens: colors in `constants/Colors.ts` (read with `useThemeColor`; every key exists in light and dark), type scale plus `Radius`/`Space` in `constants/Typography.ts`. Use `<Text type="title|headline|body|footnote|caption|..." muted>` from `components/Themed.tsx` instead of ad-hoc font sizes.
- Status system: `lib/status.ts` `toiletStatus()` decides one tone per toilet (closed → `danger`, customers-only → `warning`, open → `success`, unknown → `neutral`). Badges use the themed `<tone>`/`<tone>Soft` colors (`components/StatusBadge.tsx`); map pins use the fixed `PinColors`. `emergencyRed` is reserved for the "I need to go NOW" button and banner.
- Buttons use `components/PressableScale.tsx` (spring shrink + light haptic). Loading lists show `components/Skeleton.tsx` placeholders, not spinners. Reanimated shared values use `.get()`/`.set()` (the React Compiler lint rejects `.value =`).
- Sheets call `<SheetGrabber />` first: iOS draws the native grabber, Android needs ours.
- Human-readable labels for tri-state fields go through `lib/format.ts` (`feeLabel`, `openLabel`, `yesNoLabel`, ...) so "unknown" reads the same everywhere.
- Screen-local styles via `StyleSheet.create` at the bottom of the file.

Known pre-existing lint/type errors in untouched Expo template files: `components/ExternalLink.tsx` (typed-routes `href`) and `components/useClientOnlyValue.web.ts`.
