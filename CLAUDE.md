# SA Towing Check

Static checker for South African towing legality (licence code, trailer brakes vs tare, speed limit), part of the PsyPhin site. Intended repo `psyphin234/sa-towing-check` on GitHub Pages, which will serve it at `https://psyphin.co.za/sa-towing-check/` (see psyphin.co.za's CLAUDE.md, "Other GitHub Pages repos").

Plain HTML/CSS/vanilla JS. **No build step, no framework.** All calculations run in the browser; user inputs are never stored or sent anywhere.

**Build brief:** `..\SPEC.md` (in `E:\Claude_projects\tow_gvm_calc`, deliberately outside this public repo). Read it before adding features.

## Structure

```
index.html          The checker: form (left/top) + results (right/below)
sources.html        Every rule with regulation, sources, verified status, last-checked date
js/rules.js         THE data file: every legal threshold, rule text, citation, verified flag
js/checks.js        Pure legal checks (no DOM): licence (reg 99), brakes (reg 151), speed (reg 292/293),
                    overloading + driving axle (reg 239), and rigMasses(), the shared mass model
js/ratings.js       Pure manufacturer checks (not law): payload, GCM, towing capacity, tow ball,
                    trailer GVM, axles, and trailerLimit() ("heaviest trailer" tile)
js/ui.js            Shared DOM helpers: el(), citation(), badges (text via textContent only)
js/app.js           Wires the checker form to checks.js and renders results
js/sources.js       Builds sources.html from rules.js
css/style.css       All styles; colours are CSS variables at the top (match psyphin.co.za)
tests/index.html    Browser test page for rules.js + checks.js
tests/run.ps1       Runs the tests in headless Edge: powershell -ExecutionPolicy Bypass -File tests\run.ps1
```

## Rules (non-negotiable, from the brief)

- **Every threshold lives in `rules.js`** (in a rule's `params`), next to its citation. `checks.js`, `app.js` and HTML must not hard-code legal numbers.
- Every legal result cites its rule(s) via `ruleIds`; the UI renders each as regulation + source link + verified badge.
- `verified: false` rules show "Unverified: confirm with DLTC". As of 2026-09-29 **all** rules are unverified: every source is secondary.
- Legal checks (blue "Law" panel) are kept separate from manufacturer ratings (purple "Not law" panel).
- The disclaimer stays on every results view.

## Verifying a rule

1. Find the rule in the official gazetted National Road Traffic Regulations (as amended).
2. In `rules.js`: set `sourceUrl`/`sourceLabel` to the official text, update `regulation` (add the GN number), set `official: true`, `verified: true`, `lastChecked: "YYYY-MM-DD"`. Move the old secondary link to `moreSources` if it's still useful.
3. Fix any `params` or `summary` the gazette contradicts, then run the tests.

## Mass model (rigMasses in checks.js)

- Best source first: weighbridge readings (taken **with the trailer hitched**) > entered trailer actual mass > trailer plated GVM; the vehicle falls back to tare + load list + tow ball mass.
- The tow ball mass is carried by the vehicle (counts against payload/GVM and the rear axle) but is part of the trailer's mass, so the combination counts it **once**: combined = (vehicle − tow ball) + trailer.
- Legal limits (reg 151, licence) apply to the trailer's **plated GVM**; manufacturer limits to its **actual mass**. The heaviest-trailer tile says so.
- "Close to the limit" (amber) is `settings.nearLimitFraction` in rules.js. Load list presets (`loadPresets`) are rough starting masses, labelled as guesses in the UI.

## Build status

Done (brief build steps 1–3): `rules.js` with every rule in the brief, legal checks 4.1–4.4 (licence, brakes, speed, reg 239 overloading and driving axle), manufacturer panel (payload, GCM, towing capacity, tow ball, trailer GVM, axle loads with lever estimate), heaviest-trailer tile, load list builder, weighbridge inputs, sources page, worked-example loader (`index.html#example`), print styles.

Next (brief step 4 onward): "What can I tow?" mode; motor car vs goods vehicle comparison; rig diagram; print summary; GoatCounter tag (page views only, like the rest of psyphin.co.za) and a `projects.js` card on psyphin.co.za at launch.

## Preview and test

- Open `index.html` directly, or `python -m http.server` and visit http://localhost:8000. Scripts are classic (not ES modules) so opening from disk works.
- Headless Edge won't render narrower than about 492 px; to check the 390 px layout, screenshot a page that iframes `index.html` at 390 px wide.
- Mobile check: must fit 390 px wide with no horizontal scroll.

## Conventions

- Brand is written **PsyPhin**. Keep paths relative.
- Commit identity: `74655215+psyphin234@users.noreply.github.com` (set globally on this PC). Never commit a personal email.
- The repo is public: no personal names or private notes in committed files.
