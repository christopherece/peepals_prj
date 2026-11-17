# Store listing: Peepals

Copy-paste text and form answers for App Store Connect and Google Play Console.
Replace `REPLACE-WITH-CONTACT-EMAIL` (here and in `docs/`) and `REVIEW-EMAIL` / `REVIEW-CODE` first.

## URLs (after GitHub Pages is on: repo Settings → Pages → Deploy from branch → `main`, folder `/docs`)

| Field | Value |
|---|---|
| Privacy policy | https://christopherece.github.io/peepals_prj/privacy.html |
| Account deletion (Google Play) | https://christopherece.github.io/peepals_prj/delete-account.html |
| Support / marketing | https://christopherece.github.io/peepals_prj/ |
| Support email | support@topitsolutions.co.nz |

## Text

**Name:** Peepals
**Subtitle (Apple, 30 chars):** Find a toilet near you, fast
**Short description (Google, 80 chars):** Find the nearest free, open toilet fast. Reviews and tips from real people.
**Category:** Navigation (Apple) / Maps & Navigation (Google)
**Keywords (Apple, 100 chars):** toilet,restroom,bathroom,loo,wc,public toilet,accessible,changing table,near me,map

**Description:**

Need a toilet? Peepals shows every public toilet within 2 km on a map, and the big red "I need to go NOW" button takes you straight to the nearest free one that's open.

• See at a glance what's free, open now, wheelchair accessible, gender-neutral or has a changing table
• Walking directions in one tap
• Reviews from other Peepals: cleanliness, safety and wait, plus handy tips like door codes
• Photos so you know what to expect
• Add toilets that are missing from the map

Browsing is free and needs no account. Sign in with just your email (no password) to leave reviews, photos and new spots.

Toilet data © OpenStreetMap contributors.

## Sign-in for reviewers

Set up first: README → "Ship it" → "Sign-in for app reviewers".

Apple (App Review Information → Sign-in required: yes) and Google (App content → App access → "All or some functionality is restricted"):

> Browsing, filters, directions and the "I need to go NOW" button work without signing in.
> To test reviews, photos, adding a toilet, reporting content and account deletion, sign in:
> 1. Profile tab → "Join the Peepals community"
> 2. Email: REVIEW-EMAIL → tap "Email me a code"
> 3. Code: REVIEW-CODE (no email is sent for this test account)
> Account deletion: Profile tab → "Delete account". Reporting: the "Report" link on any review or photo by another user.
> Location: the app needs location to show nearby toilets. In the simulator, set a location such as Apple Park.

## Age rating

Answer **No / None** to everything except:
- **User-generated content: Yes.** Members post reviews and photos. Moderation: users can report content and reported items are hidden for them and removed by us; the app has content rules on sign-up.

Expected result: 12+ on Apple (because of user-generated content), Teen or Everyone on Google.

## Apple App Privacy ("nutrition label")

Tracking: **No**. Data linked to the user, used for **App Functionality** only:

| Data type | Collected | Linked to user | Tracking |
|---|---|---|---|
| Contact info → Email address | Yes | Yes | No |
| User content → Photos | Yes | Yes | No |
| User content → Other user content (reviews, tips, reports) | Yes | Yes | No |
| Location → Precise location (toilets members add) | Yes | Yes | No |

Not collected: everything else (no analytics, no crash data, no identifiers, no ads).

## Google Play Data safety

- Does the app collect or share user data? **Yes**
- Encrypted in transit? **Yes**
- Can users request deletion? **Yes** (in-app and the deletion URL above)

| Data type | Collected | Shared | Optional | Purpose |
|---|---|---|---|---|
| Personal info → Email address | Yes | No | Yes (only members) | Account management, App functionality |
| Photos and videos → Photos | Yes | No | Yes | App functionality |
| App activity → Other user-generated content | Yes | No | Yes | App functionality |
| Location → Approximate location | No* | Yes | No | App functionality |
| Location → Precise location | Yes | No | Yes | App functionality |

\* Your position is sent to OpenStreetMap servers to look up toilets and isn't stored by Peepals, so declare it as **shared** for app functionality, not collected. Precise location is collected only when a member adds a toilet.

Other declarations: Ads **No**. Target audience **18+** (avoids the Families policy). News app **No**. Government app **No**. Financial features **None**. Health **No**.

## Screenshots

In `store/screenshots/`:
- `android/` 1080×1920 (Google Play phone screenshots)
- `ios-6.9/` 1320×2868 (App Store, iPhone 6.9")
