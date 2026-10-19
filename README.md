# Meet for Coffee

Static public website for the Meet for Coffee web app and Google Meet add-on.

- Public site: https://start.coffee/
- Standalone app: https://app.start.coffee/

Includes the homepage, privacy policy, terms, and support pages. GitHub Pages deploys every push to `main`. Domain configuration is managed separately.

`assets/standalone-mobile.jpg` is a real 390 × 844 capture of the standalone app with sample agenda topics, taken October 19, 2026. Refresh it through the app UI when the interface changes.

Preview locally with `python3 -m http.server 8765`.

## Analytics

All four pages import `assets/analytics.mjs`, vendored unchanged from [coffee-instant v3.3.3](https://github.com/Build-It-Faster/coffee-instant/blob/v3.3.3/src/implementation/shared/lib/analytics.mjs). See the [upstream integration contract](https://github.com/Build-It-Faster/coffee-instant/blob/v3.3.3/docs/analytics-approach.md).

Only `start.coffee` loads the homepage property (`G-GKZJEPZV7S`). Localhost and preview hosts load no analytics. The module sends fixed page categories, a fixed title, and an empty referrer; query strings and fragments are discarded. Anchor changes do not create page views.

Run `node --test tests/analytics.test.mjs`. These tests capture queued commands without loading Google or sending events. Upstream also tests this exact module with Google’s real tag and intercepted collection endpoints.

When refreshing the vendor file, pin a release, update the import version on all four pages, rerun the tests, and verify upstream’s GA settings audit remains valid. Keep Enhanced Measurement, Google signals, and user-provided data collection disabled. Historical GA cleanup remains separate from this integration.
