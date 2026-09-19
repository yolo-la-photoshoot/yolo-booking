# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

`yolo-booking` is a single-page booking site for an LA-based photography business ("LA同城约拍 · yolo"). There is no build system, package manager, or backend — the entire product is one static HTML file plus two photo assets:

- `index.html` — the whole site: markup, all CSS (inline `<style>`), and all JS (inline `<script>`), ~1000 lines total.
- `photo1.jpg`, `photo2.jpg` — hero/equipment section images, referenced via relative `url(...)` in the CSS.

## Development workflow

There is no `package.json`, build step, linter, or test suite. To work on this repo:

- Edit `index.html` directly.
- Preview by opening the file in a browser, or serving the directory statically, e.g. `python3 -m http.server` from the repo root, then visiting `index.html`.
- There is nothing to compile, bundle, or lint — verify changes by loading the page and exercising the flow manually (language splash → package selection → date/time → form → submit → success view).

## Architecture

Everything lives in `index.html`, organized into three inline blocks:

### 1. Markup
Two top-level views inside `.page`, toggled via the `.hidden` class:
- `#view-customer` — hero, equipment blurb, price list/packages, and the reservation form (contact fields + calendar/time picker).
- `#view-success` — booking confirmation, deposit notice, and photographer contact card (WeChat/WhatsApp).

A `#lang-splash` overlay is shown on first visit to pick a language before the page content renders.

### 2. i18n
All copy is duplicated in a `I18N = { zh: {...}, en: {...} }` dictionary keyed by string keys (e.g. `'hero.title'`). Markup elements opt in via `data-i18n` (textContent), `data-i18n-html` (innerHTML, for copy with inline tags), or `data-i18n-ph` (placeholder). The `i18n.apply()` function walks the DOM and fills these in whenever the language changes. The chosen language persists in `localStorage['yolo_lang']`; if unset, the splash screen is shown to pick one. When adding new user-facing copy, add the string under both `zh` and `en` and reference it via a `data-i18n*` attribute or `i18n.t(key)` rather than hardcoding text — `i18n.t` falls back to the `zh` value if a key is missing.

### 3. Booking state & rendering
A single global `state` object (`category`, `selectedPkg`, `personType`, `selectedDate`, `selectedTime`, `calMonth`, `calYear`) drives everything. There's no framework — each `render*()` function (`renderPackages`, `renderCalendar`, `renderTimeslots`) re-generates its section's `innerHTML` from `state` and re-binds its own event listeners on every call. `updateSummary()` recomputes the footer summary/submit-button enabled state from both `state` and the raw form field values. Any change to bookable data (packages, dates, times) should mutate `state` and call the relevant `render*`/`updateSummary` functions rather than patching the DOM directly.

Package/pricing data lives in the `PACKAGES` constant (`portrait` and `wedding` categories, each an array of package objects with bilingual `name`/`nameEn` and `features`/`featuresEn`). `findPackage(id)` looks a package up across both categories.

Time slots are a fixed `TIME_SLOTS` array; slot duration labels and availability depend on the selected package's `duration` (`'1hr' | '3hr' | '8hr' | '24hr'`), handled inline in `renderTimeslots()`.

### 4. Portfolio (page-turning viewer)
The hero section's static photo collage was replaced by an interactive "摄影作品集" (photography portfolio) book viewer, implemented as a second, self-contained `<script>` block wrapped in an IIFE and appended after the main script. It is a near-verbatim port of a standalone page-flip component (curled-page 3D transform, draggable magnifying loupe, zoom controls, an auto-playing "riffle" intro animation, and a `.pf-plate-list` index) adapted to reuse the site's existing color tokens and to cycle through the only two photo assets in the repo (`photo1.jpg`/`photo2.jpg`) as placeholders — swap the `PAGES` array's `file` entries for real photography once available.

It is deliberately isolated from the booking script to avoid identifier collisions between two classic (non-module) `<script>` blocks, which share one global scope — but it still needs to *read* state from the first script: `curLang()` references the booking script's top-level `const i18n` directly by name (not `window.i18n`, since top-level `const`/`let` never attach to `window`, only `var` and function declarations do). Static portfolio copy (kicker, hint, divider label) goes through the normal `data-i18n` system; the dynamically-generated bits (page captions, plate-list titles) are refreshed on language switch via `window.pfOnLangChange()`, called from the language button's click handler in the first script.

### External integrations (all client-side, no backend)
- **Booking submission** — `sendEmail()` POSTs the booking as JSON to Formspree (`FORMSPREE_ID = 'xdabeewd'`, hardcoded). If it fails, the success view still shows but reveals `#email-fallback-notice` telling the customer to contact the photographer directly.
- **Address recognition** — `geocodeAddress()` tries Nominatim (`nominatim.openstreetmap.org`) first, then falls back to Photon (`photon.komoot.io`), to show a "recognized" hint under the location field. Results are memoized in `geocodeCache`.
- **Background music** — `initMusic()` probes `BGM_SOURCES` in order (local `./bgm.mp3` first, then two Pixabay CDN URLs) and uses the first one that fires `canplay` within 4s; the FAB hides itself if none load. Note: `bgm.mp3` is not checked into this repo.
- **Contact handoff** — the success view links out to `https://wa.me/19297606777` and offers copy-to-clipboard for WeChat/WhatsApp IDs; there is no in-app messaging.

## Known issues in `index.html`

- **Corrupted CSS syntax (lines ~12–300, the `<style>` block):** most declarations that reference CSS custom properties use a typographic en dash (`–`, U+2013) instead of `--`, e.g. `var(–bg)` instead of `var(--bg)`, and many string literals use curly quotes (`‘’`/`“”`) instead of straight quotes, e.g. `content: ‘’;`. Both are invalid CSS and get silently dropped by the browser's parser, so large parts of the intended styling (body background/font, noise texture overlays, tape decorations, etc.) do not actually apply. Only the `:root` block itself (where the custom properties are *defined*, e.g. `--bg: #f1ede6;`) is unaffected. Any CSS edit in this file should double check for this pattern (`grep -P '–|‘|’'` or similar) rather than assuming existing declarations are valid.
- **Stray markdown code fence in the body:** the datetime/calendar block (around the reservation form) is wrapped in literal ```` ``` ```` lines that were pasted in verbatim from a markdown response. These render as visible backtick text in the page rather than being treated as a code block (HTML has no such construct).

These look like artifacts of AI-assisted / copy-pasted edits rather than intentional design and should probably be cleaned up, but are left as-is here since they weren't the subject of the current task.
