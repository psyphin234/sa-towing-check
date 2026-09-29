# SA Towing Check

Static checker for South African towing legality (licence code, trailer brakes vs tare, speed limit), part of the PsyPhin site. Intended repo `psyphin234/sa-towing-check` on GitHub Pages, which will serve it at `https://psyphin.co.za/sa-towing-check/` (see psyphin.co.za's CLAUDE.md, "Other GitHub Pages repos").

Plain HTML/CSS/vanilla JS. **No build step, no framework.** All calculations run in the browser; user inputs are never stored or sent anywhere.

**Build brief:** `..\SPEC.md` (in `E:\Claude_projects\tow_gvm_calc`, deliberately outside this public repo). Read it before adding features.

## Structure

```
index.html          The checker: form (left/top) + results (right/below)
sources.html        Every rule with regulation, sources, verified status, last-checked date
js/rules.js         THE data file: every legal threshold, rule text, citation, verified flag
js/checks.js        Pure check functions (no DOM): licence (reg 99), brakes (reg 151), speed (reg 292/293)
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

## Build status

Done (brief build steps 1–2): `rules.js` with every rule in the brief, legal checks 4.1–4.3 with results UI and citations, sources page, worked-example loader (`index.html#example`), print styles.

Next: payload / GCM / tow ball (manufacturer panel, brief §5) and reg 239 overloading checks; "What can I tow?" mode; motor car vs goods vehicle comparison; rig diagram; print summary; GoatCounter tag (page views only, like the rest of psyphin.co.za) and a `projects.js` card on psyphin.co.za at launch.

## Preview and test

- Open `index.html` directly, or `python -m http.server` and visit http://localhost:8000. Scripts are classic (not ES modules) so opening from disk works.
- Headless Edge won't render narrower than about 492 px; to check the 390 px layout, screenshot a page that iframes `index.html` at 390 px wide.
- Mobile check: must fit 390 px wide with no horizontal scroll.

## Conventions

- Brand is written **PsyPhin**. Keep paths relative.
- Commit identity: `74655215+psyphin234@users.noreply.github.com` (set globally on this PC). Never commit a personal email.
- The repo is public: no personal names or private notes in committed files.
