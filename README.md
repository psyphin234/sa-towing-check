# SA Towing Check

Is your car or bakkie plus trailer legal on South African roads? This static web tool checks:

- **Licence code** (National Road Traffic Regulations, reg 99): B / EB / C1 / EC1
- **Trailer brakes vs tow vehicle tare** (reg 151)
- **Speed limit and 100 km/h sign** for goods vehicles towing (reg 292/293)
- **Overloading and the driving axle ratio** for goods vehicles (reg 239)
- **Manufacturer ratings** (not law): payload, GCM, towing capacity, tow ball mass, trailer GVM and axle loads, and the heaviest trailer your rig may tow

Every rule links to its source, and rules not yet checked against the official gazetted regulations are marked as unverified. See [sources.html](sources.html).

Everything runs in your browser; nothing you enter is sent anywhere.

**Guidance only, not legal advice.** Weigh your rig on a weighbridge and confirm with your DLTC or traffic authority.

## Development

No build step. Open `index.html`, or run `python -m http.server`. Legal thresholds and citations live in `js/rules.js`. Tests: open `tests/index.html`, or run `powershell -ExecutionPolicy Bypass -File tests\run.ps1`.
