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
js/modes.js         Pure logic for the other two modes: whatCanITow() and compareBodyTypes()
js/diagram.js       Draws the rig diagram (SVG + table) from ratings.rigDiagram()
js/ui.js            Shared DOM helpers: el(), citation(), badges (text via textContent only)
js/app.js           Wires the form to all of the above, the mode switch and the load list; renders results
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

## Modes

One form, three modes (buttons above the form; the URL hash holds the mode: none/`#check`, `#tow`, `#compare`; `#example` loads the worked example in check mode).

- Elements carry `data-modes="check tow compare"` (any subset); `setMode()` in app.js hides the rest. Inputs keep their values across modes.
- `[hidden] { display: none !important }` in style.css is what makes hiding work on elements with their own `display` rule. Keep it.
- **Check my rig**: every legal and manufacturer check. **What can I tow?**: no trailer inputs; one card per brake type with the legal cap (plated GVM) and manufacturer cap (actual mass), plus speed thresholds for goods vehicles. **Car vs bakkie**: no vehicle-type input; runs the legal checks twice (motor car / goods vehicle) and tabulates the differences using each check's `data` field.

## Diagram, print and sources

- **Rig diagram** ("Your rig at a glance", check mode): a side-view SVG plus a table of the same figures. Axle loads only appear with weighbridge readings; otherwise the tow ball's lever effect is shown if wheelbase and overhang are entered. Text stays in text colours; status is a coloured bar/arrow and a word in the table.
- **Print summary** (`data-print` buttons, `window.print()`): print CSS hides the form and controls, switches to light colours, and shows `#print-sheet` (built in app.js): what was entered, and in check mode a write-in table for weighbridge readings with the limits pre-filled. Check changes with Edge: `msedge --headless=new --print-to-pdf=out.pdf "file:///…/index.html#example"`.
- **Sources page**: status summary per group, "Still to check" (`openQuestions` in rules.js; remove an entry once settled), then every rule with an anchor. Citation badges in the checker link to `sources.html#<rule-id>`.

## Build status

Done (brief build steps 1–5): `rules.js` with every rule in the brief, legal checks 4.1–4.4, manufacturer panel, heaviest-trailer tile, load list builder, weighbridge inputs, "What can I tow?" and motor car vs goods vehicle modes, rig diagram, print summary, sources page with open questions, worked-example loader.

Next (brief step 6): mobile polish, GoatCounter tag (page views only, like the rest of psyphin.co.za), GitHub Pages deploy and a `projects.js` card on psyphin.co.za. Before launch (brief §2.6): replace secondary citations with the gazetted text where possible.

## Preview and test

- Open `index.html` directly, or `python -m http.server` and visit http://localhost:8000. Scripts are classic (not ES modules) so opening from disk works.
- Headless Edge won't render narrower than about 492 px; to check the 390 px layout, screenshot a page that iframes `index.html` at 390 px wide.
- Mobile check: must fit 390 px wide with no horizontal scroll.

## Conventions

- Brand is written **PsyPhin**. Keep paths relative.
- Commit identity: `74655215+psyphin234@users.noreply.github.com` (set globally on this PC). Never commit a personal email.
- The repo is public: no personal names or private notes in committed files.
