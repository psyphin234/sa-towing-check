# SA Towing Check

Static checker for South African towing legality (licence code, trailer brakes vs tare, speed limit, overloading, manufacturer ratings), part of the PsyPhin site. Repo `psyphin234/sa-towing-check` (public), GitHub Pages from `main` / root, live at **https://towing.psyphin.co.za/** (custom domain since 2026-10-05: the `CNAME` file here plus an Afrihost `towing` CNAME record; see the psyphin.co.za CLAUDE.md). The old `psyphin.co.za/sa-towing-check/` address 301-redirects here. Push to `main` to deploy; check with `gh api repos/psyphin234/sa-towing-check/pages/builds/latest`.

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
- Every legal result cites its rule(s) via `ruleIds`. The checker keeps this compact to avoid crowding: one "Read more:" line per card (`ruleLinks()` in ui.js) of plain rule titles with a short regulation number (`shortRef()`, e.g. "reg 99", "Act s1"), each linking to the rule's entry on sources.html in a new tab (so form inputs survive). The full regulation text, gazette/source links and Verified badges are on the sources page only; an unverified legal rule still shows its badge in the checker (spec §3). A test checks every legal rule and definition yields a short reference.
- Cards lead with the result and figures; a check's `notes` sit in a "More detail" toggle (`notesToggle()` in app.js). Results are rebuilt on every input, so `toggle()` remembers which toggles are open (keyed by check id, so legal and manufacturer check ids must stay distinct). A closed toggle can't print, so each also renders a `print-only` copy of its notes.
- `verified: false` rules show "Unverified: confirm with DLTC". Since 2026-09-29 every legal rule and definition is verified against official text except `def-vehicle-type-from-papers` (how double cabs are registered isn't in the regulations) and `vc8026-towball-limit` (the 25–100 kg tow ball limit: in a compulsory specification, and whether it binds the person towing is a grey area). Manufacturer and guidance rules show "Source checked" once their explanatory source has been read (`SOURCE_CHECKED`).
- Keep claims that aren't in the regulation (e.g. "most bakkies are registered as LDVs") out of a verified rule's `summary`; put them in `notes`, starting "Not from the regulation:".
- Legal checks (blue "SA law" tag) are kept separate from manufacturer limits (purple "Vehicle maker" / "Manufacturer" tag). Wording: say "SA law" and "manufacturer limit"; avoid "not legal" for manufacturer limits, because NOT LEGAL is the red status for breaking a rule.
- The disclaimer stays on every results view.

## Verifying a rule

Official texts used (2026-09-29), all fetched and read in full for the rules concerned:
- Regulations GN R225 of 2000, consolidated to 9 March 2012: KZN Department of Transport PDF (http only; WebFetch forces https and fails, so `curl` it and use `pdftotext`).
- Amendments since then: GN R846 of 2014 (changed regs 1, 99, 239, 293(2)(a)) and GN R1408 of 2016 (added reg 293(1)(b)(iv)), both on gov.za. The 2013 and 2016-fee amendments and GN 45901 of 2022 (forms only) don't touch these rules; amendment list from rte.mobilitas.co.za.
- The Act as published (RTMC PDF) for GVM, GCM and tare.

- **Compulsory specifications count too.** Reg 216(1) makes vehicles and trailers comply with the NRCS compulsory specifications (VC numbers, listed in Annex A to SABS 047), so a limit can be law without appearing in the regulations. Search them, not just the regulations: VC 8026 (caravans and light trailers, category O1/O2) is where the 25–100 kg tow ball limit is (cl. 3.5.2); VC 8065 makes SANS 1505 compulsory for ball couplings and towing brackets. Found 2026-09-30, after the site had wrongly said there was no tow ball limit.

To re-verify after a new amendment:
1. Read the amendment in the Government Gazette (gov.za / gpwonline) and note which regulations it changes.
2. In `rules.js`: update `summary`, `params`, `regulation` (add the GN number) and sources; set `lastChecked: "YYYY-MM-DD"`. Rules the text doesn't settle stay `verified: false` and get an `openQuestions` entry.
3. Run the tests.

## Mass model (rigMasses in checks.js)

- Best source first: weighbridge readings (taken **with the trailer hitched**) > entered trailer actual mass > trailer plated GVM; the vehicle falls back to tare + load list + tow ball mass.
- The tow ball mass is carried by the vehicle (counts against payload/GVM and the rear axle) but is part of the trailer's mass, so the combination counts it **once**: combined = (vehicle − tow ball) + trailer.
- Legal limits (reg 151, licence) apply to the trailer's **plated GVM**; manufacturer limits to its **actual mass**. The heaviest-trailer tile says so.
- Tow ball: `towballMax()` in ratings.js is the maximum used everywhere (tow ball card, diagram, print sheet): the **recommended** 100 kg for a trailer up to 3 500 kg even when the towbar is rated higher (bakkie towbars are often 300–350 kg), or the maker's figure if lower. The 25–100 kg is a grey area, not clearly law, so going outside it is amber with "Over/Under recommended" labels (`statusLabel` on a check overrides the status wording), never red "Not legal"; only going over the vehicle or towbar maker's own rating is red. The 7–10 % rule of thumb is capped at 100 kg.
- "Close to the limit" (amber) is `settings.nearLimitFraction` in rules.js. Load list presets (`loadPresets`) are rough starting masses, labelled as guesses in the UI.

## Modes

One form, four modes (buttons above the form; the URL hash holds the mode: none = **Check my rig (simple)**, the default; `#advanced` = **Check my rig (advanced)**, internally mode `check` (old `#check` links still work); `#tow`; `#compare`; `#example` loads the worked example in the advanced check).

- **Simple check** (`simpleCheck()` in modes.js): only the two licence discs (vehicle tare + GVM, trailer tare + GVM), licence code and trailer brakes (brakes aren't on the disc). The disc inputs are drawn as a disc and carry `data-mirror="<field name>"`: app.js copies them to and from the advanced form's fields, so one set of values serves every mode (no second source of truth). It shows payload figures, the legal heaviest trailer, the licence/brakes/speed cards, and a box of reasons to open the advanced check (type-dependent results, payload under `settings.simpleLowPayloadKg`, and towing capacity/GCM when towing). A vehicle type chosen in the advanced check is used here too. The disc drawing shows only the two fields people copy, with the rest named faintly for recognition; it must never look like a real disc (no crest, barcode or numbers).

- Elements carry `data-modes="check tow compare"` (any subset); `setMode()` in app.js hides the rest. Inputs keep their values across modes.
- `[hidden] { display: none !important }` in style.css is what makes hiding work on elements with their own `display` rule. Keep it.
- **Vehicle type is optional** ("Not sure", value `""`, is the default). With no type, `runLegalChecks` runs each type-dependent check both ways (`forEitherType`): identical results show as one card; same outcome in different words gets a neutral "Same whichever way it's registered" line with per-type details folded away (`variantsSame`); different outcomes show a variant per type, and the card takes the worse status. Licence caps and classes (heaviest-trailer tile, What can I tow?) use the stricter type, with a note.
- **Check my rig**: every legal and manufacturer check. **What can I tow?**: no trailer inputs; one card per brake type with the legal cap (plated GVM) and manufacturer cap (actual mass), plus speed thresholds for goods vehicles. **Car vs bakkie**: no vehicle-type input; runs the legal checks twice (motor car / goods vehicle) and tabulates the differences using each check's `data` field.

## Diagram, print and sources

- **Rig diagram** ("Your rig at a glance", check mode): a side-view SVG plus a table of the same figures. Axle loads only appear with weighbridge readings; otherwise the tow ball's lever effect is shown if wheelbase and overhang are entered. Text stays in text colours; status is a coloured bar/arrow and a word in the table.
- **Print summary** (`data-print` buttons, `window.print()`): print CSS hides the form and controls, switches to light colours, and shows `#print-sheet` (built in app.js): what was entered, and in check mode a write-in table for weighbridge readings with the limits pre-filled. Check changes with Edge: `msedge --headless=new --print-to-pdf=out.pdf "file:///…/index.html#example"`.
- **Sources page**: status summary per group, "Still to check" (`openQuestions` in rules.js; remove an entry once settled), then every rule with an anchor. Citation badges in the checker link to `sources.html#<rule-id>`.

## Site furniture

- Favicons are a copy of psyphin.co.za's set; change both together.
- **Header** (since 2026-10-08): the same `.brand-bar` as fuel.psyphin.co.za and the tyre calculator: black band with a blue glow; a top row with the "← More PsyPhin tools" pill and the Checker/Sources links; then `logo.jpg` (a copy of the fuel site's `docs/assets/logo.jpg`, linking to psyphin.co.za), a blue eyebrow, the title (h1 on the checker, `.brand-title` on sources) and a one-line `.subtitle`. Keep the three sites' headers in step. Under 420 px the pill drops "More". The old `.site-header` CSS and `brand-64.png` are no longer used. Background: the same faint circuit-trace `body::before` as psyphin.co.za. `og-image.jpg` (1200x630) is a crop of the rig diagram, used by both pages' Open Graph tags.
- GoatCounter (cookie-free page visits, shared dashboard https://psyphin.goatcounter.com/) is on index.html and sources.html, just before `</body>`. The dashboard is shared with psyphin.co.za, so a `window.goatcounter.path` snippet prefixes paths with the host (`towing.psyphin.co.za/`); visits before 2026-10-05 are under `/sa-towing-check/`. It never sees form inputs (they are never sent anywhere); the privacy line on the checker says visits are counted. Don't add it to tests/.
- The psyphin.co.za card (`projects.js` there, image `assets/img/projects/sa-towing-check.jpg`) is green "Actively maintained" since 2026-10-08 (the owner's call).

## Build status

Done (brief build steps 1–6), launched 2026-09-29: every rule in the brief, legal checks 4.1–4.4, manufacturer panel, heaviest-trailer tile, load list, weighbridge inputs, "What can I tow?" and motor car vs goods vehicle modes, rig diagram, print summary, sources page with open questions, icons/share previews/visit counter, card on psyphin.co.za.

Legal check (2026-09-29): every legal rule verified against the official text (see "Verifying a rule"). It changed: reg 293 also limits a goods vehicle over 3 500 kg GVM without a trailer; the 80 km/h sign is mandatory (GN R846 of 2014); light trailers heavier than the tare cite 151(1)(a)(iii); tare excludes fuel (Act s1); reg 238 tyre limits apply to motor cars; length limits are reg 221.

Still open: the questions in `openQuestions` (rules.js), and checking for amendments after GN 45901 of 2022.

## Preview and test

- Open `index.html` directly, or `python -m http.server` and visit http://localhost:8000. Scripts are classic (not ES modules) so opening from disk works.
- Headless Edge won't render narrower than about 492 px; to check the 390 px layout, screenshot a page that iframes `index.html` at 390 px wide.
- Mobile check: must fit 390 px wide with no horizontal scroll.

## Conventions

- Brand is written **PsyPhin**. Keep paths relative.
- Commit identity: `74655215+psyphin234@users.noreply.github.com` (set globally on this PC). Never commit a personal email.
- The repo is public: no personal names or private notes in committed files.
