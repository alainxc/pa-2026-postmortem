# Findings memo: Pennsylvania's November 3, 2026 general election

Draft for review before any pages are built. Every number below is unofficial. Counties certify in late November; the Department of State's results site still carries the banner "unofficial and for informational purposes only" and reports 8,931 of 9,065 precincts for in-person ballots (98.5 percent). Provisional ballots are essentially absent from the count so far (see data quality, below), so close margins will move.

Sources: Department of State unofficial returns at electionreturns.pa.gov pulled through the tracker's client (legislative seats: the tracker's final snapshot, source time Nov 4, 10:45 am ET; governor, US House and all 2022 and 2024 comparisons: pulled Nov 5, 7:14 pm ET). The forecast is `priors_2026.json` as frozen on Oct 29. County coordinates and land area are from the Census Bureau's 2024 county gazetteer. All margins are two-party Democratic margins in percentage points unless marked.

A Nov 5 re-pull of the legislative races added 30,555 ballots to the statewide count, changed totals in 59 House seats, and changed no leader. HD-143's Democratic lead went from 180 to 209 votes.

## 1. Seat outcomes and chamber control

**State Senate: Democrats won 16 of the 25 seats up and take the chamber 26 to 24.** With 10 Democratic and 15 Republican holdovers from 2024 (confirmed against the 2024 returns), the new Senate is 26 D, 24 R. Before the election it was 23 D, 27 R counting SD-36 as Democratic after the 2025 special election.

| Seat | Result | Margin | Votes |
|---|---|---|---|
| SD-6 (Bucks) | Albillar (D) beats Farry (R), flip | D +2.2 | 61,771 to 59,146 |
| SD-16 (Bucks, Lehigh) | Dem flip over Coleman (R) | D +2.5 | 63,302 to 60,201 |
| SD-24 (Montgomery, Berks, Bucks) | Thomas (D) beats Pennycuick (R), flip | D +10.7 | 62,995 to 50,843 |
| SD-40 (Monroe, Lackawanna, Wayne) | Dem flip over Brown (R) | D +2.9 | 50,072 to 47,283 |
| SD-36 (Lancaster) | Jones (R) beats Malone (D), Republican flip | R +9.2 | 65,126 to 54,184 |

Four Republican seats flipped to Democrats and one Democratic seat (won in a 2025 special) flipped back. All other seats held. Three seats were uncontested (SD-2, SD-8, SD-42, all D). SD-46 had no Democrat: Camera Bartolotta (R) beat independent Jodi Borello 49,999 to 39,001.

Confidence: high on the 16 to 9 split. No Senate margin is under 2 points, and the closest (SD-6, 2,625 votes) is well outside any plausible provisional or late-mail shift. Whether this is the first Democratic Senate majority since the early 1990s needs a check against a secondary source before it goes on a page.

**State House: Democrats lead in 113 of 203 seats, Republicans in 90, from 103 to 100 before the election.** The 113 counts Bob Merski (HD-2), a Democratic incumbent who appears as a cross-filed "D/R" candidate in the state's data. Eleven seats flipped R to D (HD-13, 18, 44, 88, 131, 137, 142, 143, 147, 160, 187) and one flipped D to R: HD-12, where Brandon Dukes, who won the Trump +18 seat in an August 2026 special, lost by 575 votes.

Three seats are inside 220 votes and should be treated as unsettled:

| Seat | Leader | Margin |
|---|---|---|
| HD-41 (Lancaster) | Miller (R) over Chambers (D) | 41 votes |
| HD-143 (Bucks) | Hayes (D) over Labs (R) | 209 votes |
| HD-147 (Montgomery) | Burke (D) over Scheuren (R) | 217 votes |

Confidence: high on 110 or more Democratic seats, moderate on the exact 113. Provisional ballots made up 0.98 percent of the 2024 vote and 0.004 percent of the count so far, so tens of thousands of ballots are still to be added statewide. Pennsylvania has no automatic recount for district races; candidates can petition.

**Governor: Shapiro (D) 3,008,156 (60.4 percent), Garrity (R) 1,907,150 (38.3 percent), Krawchuk (L) 64,454.** Two-party margin D +22.4. Shapiro carried the mail vote by 61 points and the election-day vote by 11.

**US House: Democrats 11, Republicans 6, from 7 to 10.** Four flips, all Republican incumbents losing: PA-1 (Harvie over Fitzpatrick, D +5.5), PA-7 (Brooks over Mackenzie, D +12.2), PA-8 (Cognetti over Bresnahan, D +8.7), PA-10 (Stelson over Perry, D +10.1). The statewide two-party House vote went from R +2.1 in 2024 to D +13.3.

## 2. How the forecast did

**Pre-election forecast:** Senate, Democratic control 28.8 percent, Republican control 42.6 percent, no majority 28.6 percent, expected 24.6 Democratic seats in the 50. House, Democratic control 98.9 percent, expected 111.8 seats. Result: 26 and 113. The Senate outcome was the model's second-likeliest branch, so the model was wrong in direction but not shocked.

**Seat-level accuracy over 164 contested seats:** Brier score 0.021. The favored side lost in four seats: SD-40 (Dem probability 0.40), HD-13 (0.47), HD-41 (0.62, Republican leads by 41 votes), HD-147 (0.33). The 90 percent margin intervals contained the actual margin in 152 of 164 seats (92.7 percent), so the uncertainty was sized about right.

**The bias:** actual margins ran bluer than forecast by a mean of 4.8 points in the Senate (21 seats, excluding SD-46) and 2.1 points in the House (142 seats). Mean absolute error 6.2 and 6.3. The model's generic legislative environment was D +6.6; the seat results imply something closer to D +9 to +11. The governor polling average the model used (D +23.1) matched the result (D +22.4), so the miss was in how much of Shapiro's margin the model let pass through to legislative races, not in the top-line polls.

**Calibration by bin (contested seats):**

| Forecast Dem probability | Seats | Dems won |
|---|---|---|
| under 0.05 | 63 | 0 |
| 0.05 to 0.20 | 15 | 0 |
| 0.20 to 0.40 | 6 | 2 |
| 0.40 to 0.60 | 4 | 3 |
| 0.60 to 0.80 | 9 | 8 |
| 0.80 to 0.95 | 4 | 4 |
| 0.95 and up | 63 | 63 |

Democrats outran their probabilities in every competitive bin. That is what a uniform two-to-five point miss looks like; it is not evidence of a broken seat model.

**Biggest Senate misses (actual minus forecast margin):** SD-4 +19.4 (Haywood won by 76 points against a forecast margin of 57), SD-14 +10.9, SD-26 +10.2, SD-44 +9.4, SD-24 +8.4. Redder than forecast: SD-46 at minus 7.0, SD-36 at minus 6.9, SD-30 at minus 4.9. Two cautions. SD-46 is a Republican against an independent with no Democrat on the ballot; the model treated the independent as the Democratic side, which is a modeling choice worth saying out loud on the scorecard. SD-36 is Lancaster County, where the Democrat won a low-turnout 2025 special; the model's "Tilt R" rating was right and the miss is one of magnitude.

**The night:** the tracker's Senate odds for Democrats stood at 21 percent at 8:06 pm, crossed 50 percent at 9:12 pm, fell back to 43 percent around 10:15 pm (why is not yet checked; the per-county order of reporting is in the tracker's commit history), reached 90 percent at 12:21 am and 98 percent at 12:35 am when SD-6 settled. SD-6 changed leaders twice (10:26 and 10:48 pm) and SD-40 once (8:55 pm). The House odds never left 99.99 percent. Confidence: high; this is read directly from the timeline file.

## 3. Statewide swing versus 2024 and 2022

**Versus the 2024 presidential race, every one of the 67 counties moved toward Democrats, by a mean of 22.8 points** (two-party margin, governor 2026 minus president 2024). Range: Fulton +13.5 to Greene +30.7. Versus the 2022 governor's race, the mean swing is +6.0, range Cameron minus 1.6 to Pike +14.2.

**Legislative races swung less than the top of the ticket but still a lot.** In the 92 House seats contested by both parties in 2024 and 2026, the median swing was D +15.4. In the 20 Senate seats contested in both 2022 and 2026, the median swing from 2022 was D +12.5. The all-seat House popular vote went from R +6.1 (2024) to D +13.5 (2026), but that number is distorted by which seats were uncontested; in contested seats only it went from R +6.5 (107 seats) to D +2.4 (140 seats).

Confidence: high on direction and rough size; the 2026 margins will move slightly as outstanding mail and provisionals are added. If those ballots lean Democratic as mail did in 2024, the swing grows; that is an assumption, not a measurement.

## 4. The geographic pattern is not east versus west. It is "where Trump surged in 2024."

Against 2024, the swing shows no east-west gradient at all: the correlation between county swing and longitude is 0.04, and the vote-weighted swing is +23.6 both east and west of the Susquehanna. Against 2022 there is a clear east tilt (correlation 0.65; east of longitude 77 W swung +7.5, west +4.8).

The counties that moved most against 2024 are the old industrial Democratic counties in both corners of the state: Greene +30.7, Lackawanna +30.5, Schuylkill +28.5, Carbon +28.1, Luzerne +28.1, Washington +28.1, Beaver +27.1, Lehigh +26.9, Fayette +26.5, Lawrence +26.5, Northampton +26.5, Cambria +26.2. The smallest moves are in the rural north-central tier: Fulton +13.5, Potter +14.9, Tioga +15.9, Bradford +16.1, McKean +17.6. By region (vote-weighted, governor 2026 versus president 2024): northeast Pennsylvania +27.0, Lehigh Valley +26.7, southwest outside Allegheny +26.3, Philadelphia collar +23.7, Allegheny +23.6, Harrisburg-Lancaster-York-Berks +23.1, rural T +21.3, Philadelphia +20.0.

Hypothesis, marked as a hypothesis: the 2024 Trump surge among working-class voters in the anthracite and Mon Valley counties did not show up for a midterm with Shapiro at the top of the ticket, through some mix of those voters staying home and some of them voting for Shapiro. County data cannot separate the two; precinct data and the turnout page can narrow it. Note that the same southwest counties swung only +3.7 against 2022 while the northeast swung +9.1, so relative to the last midterm the northeast really did move more.

Confidence: high on the numbers, moderate on the interpretation.

## 5. Legislators ran far behind the top of the ticket, and almost always in the Republican direction

There is no governor result by legislative district until precincts are certified. For now the governor's district margin is estimated as the district's 2024 presidential margin plus the governor-versus-president swing of its counties, weighted by legislative votes cast in each county piece. This is an estimate and every page using it must say so.

**On that estimate, the Democratic legislative candidate ran behind Shapiro in all 22 contested Senate seats (median gap 13.6 points) and in 87 percent of the 140 contested House seats (median 13.0).** Twenty-five districts that Shapiro is estimated to have carried elected a Republican legislator, including SD-34 (Rothman) and SD-36 (Jones). Only one district went the other way: HD-72 in Cambria, where the Democrat won by 17.5 in a seat Trump carried by 32.

Against the hard 2024 presidential numbers, which are exact at the district level: 19 Trump-2024 districts elected Democrats (SD-6, 16, 24, 40 and 15 House seats) and zero Harris-2024 districts elected Republicans. Legislative margins ran a median 11 to 12 points bluer than the 2024 presidential vote in the same district.

Biggest Republican overperformance versus the estimated governor margin: SD-20 (Baker, R +23.0 in a district Shapiro is estimated to have lost by only 2.7), SD-6 (Farry lost by 2.2 where Shapiro is estimated at +20.5), SD-28 (Phillips-Hill), SD-50, SD-40; in the House HD-119 (Luzerne, R +17.8 against an estimated Shapiro +10.9), HD-106 (Dauphin), HD-120 (Luzerne), HD-55 (Westmoreland), HD-40.

Confidence: high on the direction and on the presidential comparison, moderate on the governor estimates (county-level swing applied to sub-county districts). This should be the headline story of the site: a 22-point governor landslide produced a 3-seat Senate gain and a 10-seat House gain because Republican legislators held 13 points of ticket-splitting.

## 6. Mail versus election day: the 2024 Republican mail vote went away

| Race | Mail share of two-party vote | Dem margin among mail voters | Dem margin on election day | Share of each party's own vote cast by mail (D / R) |
|---|---|---|---|---|
| Governor 2022 | 22.9 | +69.0 | minus 1.6 | 33.7 / 8.4 |
| President 2024 | 27.7 | +31.0 | minus 14.7 | 36.9 / 18.8 |
| Governor 2026 | 23.0 | +61.4 | +10.7 | 30.4 / 11.5 |
| State House, all seats 2024 | 27.6 | +21.0 | minus 16.8 | 35.5 / 20.5 |
| State House, all seats 2026 | 22.8 | +49.4 | +2.9 | 30.0 / 13.3 |

The mail share and the mail margin snapped back to their 2022 pattern. Republicans cast 18.8 percent of their presidential votes by mail in 2024 and 11.5 percent of their governor votes in 2026; the county median fell from 16.6 to 9.3 percent. Democrats also used mail a little less (36.9 to 30.4). For the first time in these three elections Democrats won the election-day vote statewide, by 10.7 points.

Confidence: moderate. Philadelphia's mail share is 21.4 percent of its vote against 25.6 percent in 2022 and 27.2 percent in 2024, which could mean the city's mail count is not finished; Allegheny (26.8 versus 27.9 in 2022) and Chester look similar but smaller. The state's own precinct counter covers in-person ballots only, so there is no direct measure of how much mail is outstanding. The "Republicans abandoned mail" finding should be re-checked after certification.

## 7. Turnout: 5.0 million ballots, 71 percent of 2024 and 93 percent of 2022, and it fell most where Trump did best

Ballots counted so far: 5,000,144, which is 55.6 percent of 8,993,303 registered voters. 2024: 7,085,692 (77.2 percent). The 2022 governor's race drew 5,366,179 votes by county sum.

Votes in the governor's race as a share of 2024 presidential votes, by region: Philadelphia collar 74.3 percent, Harrisburg-Lancaster-York-Berks 73.0, Lehigh Valley 71.8, Allegheny 71.6, northeast 70.5, Erie 68.7, Philadelphia 67.8, rural T 67.5, southwest outside Allegheny 67.2. Across counties, retention of the 2024 vote correlates 0.59 with the county's 2024 Harris margin: the more Democratic the county, the more of its 2024 electorate came back. The pattern is stronger against 2022 (correlation 0.75): Monroe 103 percent of its 2022 vote, Lehigh 100, Dauphin 100, Philadelphia 98, Northampton 98, versus 83 to 87 percent in Greene, Fayette, Somerset, Jefferson and Westmoreland. Allegheny is the outlier among Democratic counties at 90 percent of 2022.

The collar counties' share of the statewide vote rose from 22.4 to 23.5 percent; the rural T fell from 15.8 to 15.0 and the southwest outside Allegheny from 10.2 to 9.6. Philadelphia fell from 10.3 to 9.8.

Confidence: moderate. The 2026 figures will rise as mail and provisionals are added, and Philadelphia's may rise more than most (see section 6). The region definitions are county groupings chosen for this memo and are listed in the derived data.

## Data quality notes for the methods page

- The state counts precincts reporting for in-person ballots only. Four counties are below 100 percent: Montgomery 311 of 428, Allegheny 1,322 of 1,327, Philadelphia 1,692 of 1,703, Centre 86 of 87. Montgomery's vote totals look complete (74.9 percent of its 2024 vote), so its precinct flag may be a reporting artifact; worth a note, not a correction.
- Provisional ballots: 63 of 67 counties report zero. In 2024 they were 0.98 percent of all ballots, so roughly 40,000 to 50,000 ballots are probably still to come. Their partisan lean in 2026 is unknown. This is the main reason HD-41, HD-143 and HD-147 are unsettled.
- SD-46 had no Democrat; HD-2's Merski is listed as "D/R". Both need explicit handling on every chart.
- The forecast's SD-46 "Dem side" was the independent. The scorecard should say so.
- 2022 and 2024 comparison races pulled from the API are marked official by the state; the county sums match the certified statewide totals to within a few hundred votes (2022 governor 5,366,179 by county sum versus 5,365,929 certified).
- Precinct-level 2026 results will be published by the Department of State after certification; the 2024 precinct file in the tracker's `forecast-inputs/raw-returns/pados/` is the template. Until then, every page shows county data and says so.
- Census ACS 2020 to 2024 block-group tables and the LRC block-equivalency files are not yet downloaded; they are only needed for the demographics page and the precinct crosswalk.

## Stories I would lead with, in order

1. Ticket-splitting: a 22-point governor landslide, a 3-seat Senate gain and a 10-seat House gain. Republican legislators held about 13 points of the gap (section 5).
2. The Senate flips happened exactly where the forecast said the tossups were (SD-6, 16, 24, 40), and the one Democratic loss (SD-36) was the one the model leaned Republican. The model's miss was the environment, not the map (section 2).
3. The swing map is not east versus west; it is the 2024 Trump surge counties snapping back, in both the anthracite region and the Mon Valley (section 4).
4. Republicans stopped voting by mail (section 6), with the Philadelphia caveat.
5. Turnout fell most where Trump did best, and the collar counties grew as a share of the electorate (section 7).

## Questions before building

- Should seat margins on the site use the tracker's final snapshot (Nov 4, matching the tracker's archive) or a fresh daily pull until certification? I propose a fresh pull, with the tracker snapshot kept for the election-night pages.
- Is the "first Democratic Senate majority since the early 1990s" claim one you want on the home page? I have not verified it from a source.
- The governor-by-district estimate (section 5): acceptable with a visible "estimated from county swing" label, or hold that page until precincts?
- Region groupings for the turnout page: the forecast's seven `district_regions` (used for the House table) or the county groupings above (used for the governor numbers)? They disagree on where Erie, Lancaster and Berks sit.
