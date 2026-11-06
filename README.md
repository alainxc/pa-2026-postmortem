# Pennsylvania 2026: what happened

A text-led post-election analysis of Pennsylvania's November 3, 2026 general election, focused on
the state legislature (25 Senate seats, 203 House seats) with the governor's race and the 17
congressional races as context. Static HTML, CSS, vanilla JS and D3 v7; no build step. Published
from `docs/` by GitHub Pages.

Everything on the site is **unofficial** until counties certify. Every page says which geography
it shows: **county** data now, **precinct** data once the Department of State publishes the
certified precinct file.

## Layout

```
docs/                 the site (GitHub Pages serves this folder)
  index.html          home: what happened in one screen
  scorecard.html      forecast vs actual, calibration, the night hour by hour
  map.html            swing by county, 2024 president to 2026 governor
  split.html          legislative margin vs the top of the ticket
  mail.html           mail vs election-day vote by party
  turnout.html        2026 vs 2024 and 2022 by county and county group
  demographics.html   swing and turnout vs ACS education, income, age, race, nativity, density
  methods.html        sources, definitions, data vintage, known issues
  assets/             style.css, site.js (shared chart helpers), one script per page
  data/               JSON the pages read (built by scripts/build_data.py)
scripts/
  fetch_api.py        pulls governor, US House, 2022/2024 legislative and statewide races by county
  fetch_api2.py       pulls fresh 2026 legislative snapshots and the 2022/2024 US House races
  fetch_acs.sh        downloads ACS 2020-2024 5-year tables and keeps Pennsylvania rows
  build_acs.py        county, tract and block-group demographic shares
  build_data.py       builds docs/data/*.json from data/raw plus the tracker's files
data/
  raw/                state API responses, one file per race (county by method)
  raw/census/         Census county gazetteer
  census/             ACS Pennsylvania rows, LRC block equivalency files, 2020 block-to-VTD assignment
  geo/                county boundary source (cartographic boundary file zip)
  derived/            scratch outputs from the findings memo
FINDINGS.md           the memo the site was built from
```

## Sources

- Pennsylvania Department of State unofficial returns, https://www.electionreturns.pa.gov/ (county by vote method, pulled through the undocumented JSON API documented in the election-night tracker's `fetch_returns.py`).
- Department of State certified precinct returns (2020, 2022, 2024) and the Legislative Reapportionment Commission's 2022 block equivalency files, via the election-night tracker's `forecast-inputs/`.
- Pre-election forecast (`priors_2026.json`, frozen Oct 29) and the tracker's estimates and timelines, from the tracker at `~/Desktop/pa-election-night` (read-only).
- US Census Bureau: 2024 county gazetteer, 2024 cartographic boundary file (counties, 1:500k), ACS 2020-2024 5-year table-based summary file (B01003, B19013, B15003, B03002, B01001, B05002), 2020 block assignment file for voting districts (Pennsylvania).

## Running it

```bash
python3 -m venv .venv && .venv/bin/pip install requests pandas numpy pyshp
.venv/bin/python scripts/fetch_api.py      # comparison races (skips files already present)
.venv/bin/python scripts/fetch_api2.py     # fresh 2026 legislative snapshots
scripts/fetch_acs.sh                       # ACS tables (about 500 MB download, keeps PA rows only)
.venv/bin/python scripts/build_acs.py
.venv/bin/python scripts/build_data.py
python3 -m http.server 8765 --directory docs   # then open http://localhost:8765
```

`fetch_api.py` and `fetch_api2.py` import the tracker's client from `~/Desktop/pa-election-night`
and never write there.

## Refreshing the unofficial count

Counties keep adding mail and provisional ballots until certification. To refresh:

1. Delete `data/raw/senate_2026.json`, `data/raw/house_2026.json`, `data/raw/gov_2026.json`, `data/raw/ushouse_2026.json` (the 2022 and 2024 files are official and do not change).
2. Run `fetch_api.py`, then `fetch_api2.py`, then `build_data.py`.
3. Commit `data/raw` and `docs/data`; the Pages workflow deploys on push.

The site's byline shows the source timestamp from `docs/data/meta.json`.

## When certified precinct results are published

The Department of State posts a precinct-level file for each general election on its
[election data page](https://www.pa.gov/agencies/dos/resources/voting-and-elections-resources/voting-and-election-statistics/election-data.html)
(2024's was `erstat_2024_g_<n>_<date>.txt`, comma-delimited, one row per candidate per precinct, carrying
the precinct's congressional, state Senate and state House district). When the 2026 file appears:

1. Save it under `data/raw/precincts/` and note the download date in `data/raw/precincts/NOTES.md`.
2. Build a precinct table with the same fields as the county table: votes by party and by method
   per precinct for governor, Senate, House and US House, keyed by `(county_code, precinct_code)`.
   The 2024 file's layout is described in the tracker's `forecast-inputs/raw-returns/pados/erstat_2024_g_readme.txt`.
3. Join 2026 precincts to 2024 precincts on `(county_code, precinct_code)` for the swing; report the
   share of votes in unmatched precincts (boundaries change between cycles).
4. Demographics: map precincts to 2020 Census blocks through the Department of State's precinct
   codes and the 2020 block assignment file (`data/census/BlockAssign_ST42_PA_VTD.txt`, VTD codes),
   then aggregate block-group ACS shares (`data/census/acs_blockgroup_pa.csv`) to precincts weighted
   by block population. Foreign-born share is only published at tract level (`acs_tract_pa.csv`).
   Where a precinct does not match a VTD, fall back to its tract and say so.
5. Governor by legislative district becomes exact: sum governor votes over precincts tagged with
   each district. Replace `est_gov_2026_margin` in `build_data.py` with the exact figure and update
   `meta.definitions`.
6. Set `geography_level` to `precinct` in `build_data.py` and rebuild. Every page reads that flag
   for its visible geography note.
7. Once the state marks the election official (`ElectionStatus` "O" in the election list), set
   `unofficial` to false and remove the banner text.

## Rules the site follows

Public data only. Every source linked. No number fabricated or smoothed. Everything labeled
unofficial until certification. Analysis written as hypotheses with evidence; guesses marked as
guesses. No names.
