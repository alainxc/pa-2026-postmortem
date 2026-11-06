#!/usr/bin/env python3
"""Build the site's JSON data files in docs/data/ from:
  - data/raw/*.json            county-by-method returns pulled from electionreturns.pa.gov
                                (scripts/fetch_api.py, scripts/fetch_api2.py)
  - the election-night tracker  ~/Desktop/pa-election-night (read-only): forecast priors,
                                tracker estimates and timelines, district baselines and crosswalks
  - data/derived/county_gazetteer_pa.json  Census 2024 county gazetteer subset
  - docs/data/acs_county.json  (optional, from scripts/build_acs.py)

Nothing here smooths or imputes a vote count. Every vote number is copied from a state
response. Derived quantities (margins, swings, estimates) say how they were derived in
the output's "definitions" block.
"""
import csv
import json
import os
import statistics
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
RAW = os.path.join(ROOT, "data", "raw")
DERIVED = os.path.join(ROOT, "data", "derived")
OUT = os.path.join(ROOT, "docs", "data")
TRACKER = os.path.expanduser("~/Desktop/pa-election-night")
TD = os.path.join(TRACKER, "docs", "data")
FI = os.path.join(TRACKER, "forecast-inputs", "processed")
os.makedirs(OUT, exist_ok=True)


def load(path):
    with open(path) as f:
        return json.load(f)


def z(v):
    return v or 0


def margin(d, r):
    d, r = z(d), z(r)
    return round(100.0 * (d - r) / (d + r), 2) if d + r else None


def norm_county(c):
    return c.upper().replace("MC KEAN", "McKEAN").replace("MCKEAN", "McKEAN")


# ----------------------------------------------------------------------------
# Inputs
# ----------------------------------------------------------------------------
raw = {k: load(os.path.join(RAW, k + ".json")) for k in [
    "gov_2026", "ushouse_2026", "senate_2026", "house_2026", "senate_2024", "house_2024",
    "senate_2022", "house_2022", "ushouse_2024", "ushouse_2022", "ussenate_2024", "ussenate_2022",
    "gov_2022", "pres_2024"]}
election_list = load(os.path.join(RAW, "election_list.json"))
tracker_senate = load(os.path.join(TD, "returns.json"))
tracker_house = load(os.path.join(TD, "returns_house.json"))
priors = load(os.path.join(TD, "priors_2026.json"))
est_s = load(os.path.join(TD, "estimates.json"))
est_h = load(os.path.join(TD, "estimates_house.json"))
timeline_s = load(os.path.join(TD, "timeline.json"))
timeline_h = load(os.path.join(TD, "timeline_house.json"))
gaz = load(os.path.join(DERIVED, "county_gazetteer_pa.json"))
acs_path = os.path.join(OUT, "acs_county.json")
acs = load(acs_path) if os.path.exists(acs_path) else {}

baseline = {}
for r in csv.DictReader(open(os.path.join(FI, "district_presidential_baseline.csv"))):
    baseline[(r["chamber"], int(r["district"]))] = r
regions = {}
for r in csv.DictReader(open(os.path.join(FI, "district_regions.csv"))):
    regions[(r["chamber"], int(r["district"]))] = r["region"]
holders = {}
for r in csv.DictReader(open(os.path.join(FI, "current_holders.csv"))):
    holders[(r["chamber"], int(r["district"]))] = r["holder_party"]
leg_hist = defaultdict(dict)
for r in csv.DictReader(open(os.path.join(FI, "legislative_results.csv"))):
    leg_hist[(r["chamber"], int(r["district"]))][int(r["year"])] = r

# ----------------------------------------------------------------------------
# County tables for statewide races
# ----------------------------------------------------------------------------
def county_table(snap):
    out = {}
    for r in snap["rows"]:
        c = norm_county(r["county"])
        out[c] = {
            "d": z(r["dem_votes"]), "r": z(r["rep_votes"]), "o": z(r["other_votes"]), "t": z(r["total_votes"]),
            "d_mail": z(r["dem_by_method"]["mail_in"]), "r_mail": z(r["rep_by_method"]["mail_in"]), "o_mail": z(r["other_by_method"]["mail_in"]),
            "d_ed": z(r["dem_by_method"]["election_day"]), "r_ed": z(r["rep_by_method"]["election_day"]), "o_ed": z(r["other_by_method"]["election_day"]),
            "d_prov": z(r["dem_by_method"]["provisional"]), "r_prov": z(r["rep_by_method"]["provisional"]), "o_prov": z(r["other_by_method"]["provisional"]),
        }
    return out


def add_margins(x):
    x["margin"] = margin(x["d"], x["r"])
    x["mail_margin"] = margin(x["d_mail"], x["r_mail"])
    x["ed_margin"] = margin(x["d_ed"], x["r_ed"])
    mail_all = x["d_mail"] + x["r_mail"] + x["o_mail"]
    x["mail_share"] = round(100.0 * mail_all / x["t"], 2) if x["t"] else None
    x["prov_share"] = round(100.0 * (x["d_prov"] + x["r_prov"] + x["o_prov"]) / x["t"], 3) if x["t"] else None
    x["d_mail_share_of_d"] = round(100.0 * x["d_mail"] / x["d"], 2) if x["d"] else None
    x["r_mail_share_of_r"] = round(100.0 * x["r_mail"] / x["r"], 2) if x["r"] else None
    return x


races = {
    "gov_2026": county_table(raw["gov_2026"]), "pres_2024": county_table(raw["pres_2024"]),
    "gov_2022": county_table(raw["gov_2022"]), "ussen_2024": county_table(raw["ussenate_2024"]),
    "ussen_2022": county_table(raw["ussenate_2022"]),
}
for tb in races.values():
    for x in tb.values():
        add_margins(x)


def statewide(tb):
    tot = defaultdict(int)
    for x in tb.values():
        for k in ("d", "r", "o", "t", "d_mail", "r_mail", "o_mail", "d_ed", "r_ed", "o_ed", "d_prov", "r_prov", "o_prov"):
            tot[k] += x[k]
    return add_margins(dict(tot))


# County groupings used on the turnout and swing pages (chosen for this site; listed on the methods page)
COUNTY_GROUPS = {
    "Philadelphia": ["PHILADELPHIA"],
    "Philadelphia collar": ["BUCKS", "MONTGOMERY", "DELAWARE", "CHESTER"],
    "Lehigh Valley": ["LEHIGH", "NORTHAMPTON"],
    "Northeast": ["LACKAWANNA", "LUZERNE", "MONROE", "CARBON", "SCHUYLKILL", "PIKE", "WAYNE", "WYOMING", "SUSQUEHANNA"],
    "Allegheny": ["ALLEGHENY"],
    "Southwest outside Allegheny": ["WASHINGTON", "WESTMORELAND", "BEAVER", "BUTLER", "FAYETTE", "GREENE", "LAWRENCE", "ARMSTRONG"],
    "Erie": ["ERIE"],
    "South central": ["DAUPHIN", "CUMBERLAND", "LANCASTER", "YORK", "BERKS", "LEBANON"],
}
county_group = {}
for g, cs in COUNTY_GROUPS.items():
    for c in cs:
        county_group[c] = g
for c in races["gov_2026"]:
    county_group.setdefault(c, "Rural T")

counties = []
for c in sorted(races["gov_2026"]):
    g = gaz[c]
    rec = {"county": c, "fips": g["fips"], "lat": g["lat"], "lon": g["lon"], "sqmi": g["sqmi"], "group": county_group[c]}
    for k, tb in races.items():
        rec[k] = tb[c]
    a, b, d = rec["gov_2026"]["margin"], rec["pres_2024"]["margin"], rec["gov_2022"]["margin"]
    rec["swing_vs_pres_2024"] = round(a - b, 2)
    rec["swing_vs_gov_2022"] = round(a - d, 2)
    rec["votes_vs_2024_pct"] = round(100.0 * rec["gov_2026"]["t"] / rec["pres_2024"]["t"], 2)
    rec["votes_vs_2022_pct"] = round(100.0 * rec["gov_2026"]["t"] / rec["gov_2022"]["t"], 2)
    rec["density_2024_votes_per_sqmi"] = round(rec["pres_2024"]["t"] / g["sqmi"], 2)
    if c in acs:
        rec["acs"] = acs[c]
        if acs[c].get("pop_total"):
            rec["pop_density_per_sqmi"] = round(acs[c]["pop_total"] / g["sqmi"], 1)
    counties.append(rec)

# ----------------------------------------------------------------------------
# Legislative seats
# ----------------------------------------------------------------------------
def seat_rows(snap):
    by = defaultdict(list)
    for r in snap["rows"]:
        by[r["seat"]].append(r)
    return by


def cand_list(s):
    return [{"name": c["candidate"], "party": c["party"], "votes": c["votes"],
             "mail": c["mail_in_votes"], "election_day": c["election_day_votes"], "provisional": c["provisional_votes"]}
            for c in s["candidates"]]


def seat_record(chamber, s, prior, est, tracker_seat, rows_by_seat, hist_snaps):
    n = s["seat"]
    key = ("S" if chamber == "senate" else "H") + str(n)
    dv, rv, ov = z(s["dem"]["votes"]), z(s["rep"]["votes"]), z(s["other"]["votes"])
    cands = cand_list(s)
    # Democratic-side candidate: the Democrat, or the forecast's "dem side" party when no Democrat ran (SD-46)
    dem_side_party = prior.get("dem_side", "DEM") if prior else "DEM"
    note = None
    if dem_side_party != "DEM":
        dside = sum(z(c["votes"]) for c in cands if c["party"] == dem_side_party)
        note = f"No Democrat on the ballot. Margin shown is {dem_side_party} candidate versus the Republican, matching the forecast's treatment."
    else:
        dside = dv
    leader = max(cands, key=lambda c: z(c["votes"])) if cands else None
    winner_party = None
    if leader:
        winner_party = {"DEM": "D", "REP": "R"}.get(leader["party"], leader["party"])
        if leader["party"] == "D/R":
            winner_party = holders.get((chamber, n), "D")
            note = "Cross-filed candidate listed by the state as D/R; counted with the incumbent's party."
        elif leader["party"] not in ("DEM", "REP"):
            winner_party = "I"
    m = margin(dside, rv) if (dside and rv) else None
    contested = bool(dside and rv)
    b = baseline.get((chamber, n), {})
    def b2p(prefix):
        try:
            return round(100 * (float(b[prefix + "_dem_share2p"]) - float(b[prefix + "_rep_share2p"])), 2)
        except (KeyError, ValueError):
            return None
    pres24 = b2p("pres2024")
    gov22 = b2p("gov2022")
    pieces = [(norm_county(r["county"]), z(r["total_votes"])) for r in rows_by_seat.get(n, [])]
    w = sum(v for _, v in pieces)
    est_gov = None
    if pres24 is not None and w:
        sw = sum((races["gov_2026"][c]["margin"] - races["pres_2024"][c]["margin"]) * v for c, v in pieces) / w
        est_gov = round(pres24 + sw, 2)
    hist = {}
    for yr, snap in hist_snaps.items():
        hs = snap.get(n)
        if hs:
            hd, hr = z(hs["dem"]["votes"]), z(hs["rep"]["votes"])
            hist[str(yr)] = {"margin": margin(hd, hr) if (hd and hr) else None, "d": hd, "r": hr, "total": z(hs["total_votes"]),
                             "d_mail": hs["dem"]["mail_in"], "r_mail": hs["rep"]["mail_in"], "d_ed": hs["dem"]["election_day"], "r_ed": hs["rep"]["election_day"]}
    rec = {
        "seat": key, "chamber": chamber, "district": n, "district_name": s["district"],
        "region": regions.get((chamber, n)), "counties": [c for c, _ in pieces],
        "candidates": cands,
        "d": dv, "r": rv, "other": ov, "total": z(s["total_votes"]),
        "d_mail": s["dem"]["mail_in"], "r_mail": s["rep"]["mail_in"], "d_ed": s["dem"]["election_day"], "r_ed": s["rep"]["election_day"],
        "d_prov": s["dem"]["provisional"], "r_prov": s["rep"]["provisional"],
        "dem_side_votes": dside, "margin": m, "contested": contested, "winner": winner_party,
        "holder": holders.get((chamber, n)), "flip": bool(winner_party and holders.get((chamber, n)) and winner_party != holders.get((chamber, n)) and winner_party in "DR"),
        "margin_votes": (dside - rv) if contested else None,
        "pres_2024_margin": pres24, "gov_2022_margin": gov22, "est_gov_2026_margin": est_gov,
        "note": note,
        "history": hist,
    }
    if prior:
        rec["forecast"] = {"mu": round(prior["mu"], 2), "sd": round(prior["sd"], 2), "p_dem": prior["forecast_p_dem"],
                           "rating": prior["forecast_rating"], "p05": round(prior["forecast_margin_p05"], 2), "p95": round(prior["forecast_margin_p95"], 2),
                           "uncontested": prior["uncontested"], "dem_side": dem_side_party, "ref_margin": prior.get("ref_margin")}
        if m is not None:
            rec["forecast"]["error"] = round(m - prior["mu"], 2)
            rec["forecast"]["in_90"] = prior["forecast_margin_p05"] <= m <= prior["forecast_margin_p95"]
    if est:
        rec["tracker"] = {"status": est["status"], "final_mu": round(est["target"]["mu"], 2), "final_p_dem": round(est["target"]["p_dem"], 4),
                          "frac_in": round(est["target"]["frac"], 3)}
    if tracker_seat:
        rec["tracker_snapshot"] = {"d": z(tracker_seat["dem"]["votes"]), "r": z(tracker_seat["rep"]["votes"]), "total": z(tracker_seat["total_votes"])}
    # county pieces (for the county pages / later precinct swap)
    rec["by_county"] = []
    for r in rows_by_seat.get(n, []):
        rec["by_county"].append({"county": norm_county(r["county"]), "d": z(r["dem_votes"]), "r": z(r["rep_votes"]), "other": z(r["other_votes"]), "total": z(r["total_votes"]),
                                 "d_mail": r["dem_by_method"]["mail_in"], "r_mail": r["rep_by_method"]["mail_in"], "d_ed": r["dem_by_method"]["election_day"], "r_ed": r["rep_by_method"]["election_day"],
                                 "precincts_reporting": r.get("precincts_reporting"), "precincts_total": r.get("precincts_total")})
    return rec


seats = []
S26 = raw["senate_2026"]; H26 = raw["house_2026"]
hist_s = {2022: {s["seat"]: s for s in raw["senate_2022"]["seats"]}}
hist_h = {2024: {s["seat"]: s for s in raw["house_2024"]["seats"]}, 2022: {s["seat"]: s for s in raw["house_2022"]["seats"]}}
ts = {s["seat"]: s for s in tracker_senate["seats"]}; th = {s["seat"]: s for s in tracker_house["seats"]}
rs = seat_rows(S26); rh = seat_rows(H26)
for s in S26["seats"]:
    k = "S%d" % s["seat"]
    seats.append(seat_record("senate", s, priors["seats"].get(k), est_s["seats"].get(k), ts.get(s["seat"]), rs, hist_s))
for s in H26["seats"]:
    k = "H%d" % s["seat"]
    seats.append(seat_record("house", s, priors["seats"].get(k), est_h["seats"].get(k), th.get(s["seat"]), rh, hist_h))

# ----------------------------------------------------------------------------
# Chamber summaries
# ----------------------------------------------------------------------------
def chamber_summary(ch):
    ss = [s for s in seats if s["chamber"] == ch]
    won = defaultdict(int)
    for s in ss:
        won[s["winner"]] += 1
    pre = defaultdict(int)
    for s in ss:
        pre[s["holder"]] += 1
    flips = [{"seat": s["seat"], "from": s["holder"], "to": s["winner"], "margin": s["margin"], "margin_votes": s["margin_votes"]} for s in ss if s["flip"]]
    close = sorted([s for s in ss if s["contested"]], key=lambda s: abs(s["margin_votes"]))[:5]
    pc = priors["chambers"][ch]
    out = {
        "seats_up": len(ss), "won": dict(won), "held_before": dict(pre), "flips": flips,
        "closest": [{"seat": s["seat"], "district_name": s["district_name"], "winner": s["winner"], "margin": s["margin"], "margin_votes": s["margin_votes"]} for s in close],
        "uncontested": sum(1 for s in ss if not s["contested"]),
        "forecast": {"p_dem_control": pc["forecast_p_dem_control"], "p_rep_control": pc["forecast_p_rep_control"],
                     "dem_seats_mean": pc["forecast_dem_seats_mean"], "holdover_dem": pc["holdover_dem"], "holdover_rep": pc["holdover_rep"],
                     "total_seats": pc["total_seats"], "majority": pc["majority"]},
    }
    if ch == "senate":
        out["new_chamber"] = {"D": won["D"] + pc["holdover_dem"], "R": won["R"] + pc["holdover_rep"]}
        out["old_chamber"] = {"D": pre["D"] + pc["holdover_dem"], "R": pre["R"] + pc["holdover_rep"]}
    else:
        out["new_chamber"] = {"D": won["D"], "R": won["R"]}
        out["old_chamber"] = {"D": pre["D"], "R": pre["R"]}
    return out


# ----------------------------------------------------------------------------
# Forecast scorecard
# ----------------------------------------------------------------------------
contested = [s for s in seats if s["contested"] and "forecast" in s and not s["forecast"]["uncontested"]]
def dem_side_won(s):
    return s["margin"] > 0
bins = [(0, .05), (.05, .2), (.2, .4), (.4, .6), (.6, .8), (.8, .95), (.95, 1.01)]
calib = []
for lo, hi in bins:
    sel = [s for s in contested if lo <= s["forecast"]["p_dem"] < hi]
    if sel:
        calib.append({"lo": lo, "hi": min(hi, 1), "n": len(sel), "mean_p": round(sum(s["forecast"]["p_dem"] for s in sel) / len(sel), 4),
                      "dem_won": sum(1 for s in sel if dem_side_won(s)), "seats": [s["seat"] for s in sel] if len(sel) <= 12 else None})
brier = sum((s["forecast"]["p_dem"] - (1 if dem_side_won(s) else 0)) ** 2 for s in contested) / len(contested)
def errstats(sel):
    e = [s["forecast"]["error"] for s in sel]
    return {"n": len(e), "mean": round(statistics.mean(e), 2), "median": round(statistics.median(e), 2),
            "mae": round(statistics.mean(abs(x) for x in e), 2), "rmse": round((sum(x * x for x in e) / len(e)) ** .5, 2),
            "in_90": sum(1 for s in sel if s["forecast"]["in_90"])}
scorecard = {
    "n_contested": len(contested), "brier": round(brier, 4),
    "favored_lost": [{"seat": s["seat"], "p_dem": s["forecast"]["p_dem"], "margin": s["margin"]} for s in contested if (s["forecast"]["p_dem"] > .5) != dem_side_won(s)],
    "calibration": calib,
    "errors": {"all": errstats(contested), "senate": errstats([s for s in contested if s["chamber"] == "senate" and s["seat"] != "S46"]),
               "house": errstats([s for s in contested if s["chamber"] == "house"])},
    "environment": priors["environment"],
    "biggest_misses": sorted([{"seat": s["seat"], "margin": s["margin"], "forecast": s["forecast"]["mu"], "error": s["forecast"]["error"]} for s in contested], key=lambda x: -abs(x["error"]))[:20],
}

# ----------------------------------------------------------------------------
# US House
# ----------------------------------------------------------------------------
def ush(snap):
    return {s["seat"]: s for s in snap["seats"]}
u26, u24, u22 = ush(raw["ushouse_2026"]), ush(raw["ushouse_2024"]), ush(raw["ushouse_2022"])
ushouse = []
for n in sorted(u26):
    def rec(s):
        if not s:
            return None
        d, r = z(s["dem"]["votes"]), z(s["rep"]["votes"])
        return {"margin": margin(d, r) if (d and r) else None, "d": d, "r": r, "total": z(s["total_votes"]),
                "candidates": [{"name": c["candidate"], "party": c["party"], "votes": c["votes"]} for c in s["candidates"]],
                "winner": "D" if d > r else "R"}
    ushouse.append({"district": n, "y2026": rec(u26[n]), "y2024": rec(u24.get(n)), "y2022": rec(u22.get(n))})

# ----------------------------------------------------------------------------
# Timelines (chamber odds only, plus Senate seat paths; the House seat paths are 2.6 MB)
# ----------------------------------------------------------------------------
def slim_timeline(tl, keep_seats):
    pts = []
    for p in tl["points"]:
        q = {"t": p["t"], "chamber": {k: round(v, 4) if isinstance(v, float) else v for k, v in p["chamber"].items()}}
        if keep_seats:
            q["seats"] = {k: {"mu": v["mu"], "p": v["p"], "frac": v["frac"]} for k, v in p["seats"].items()}
        pts.append(q)
    return {"points": pts}

# ----------------------------------------------------------------------------
# Meta
# ----------------------------------------------------------------------------
el = {e["Electionid"]: e for e in election_list if e["ElectionType"] == "G"}
meta = {
    "built_at_utc": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(timespec="seconds"),
    "geography_level": "county",
    "geography_note": "County-level returns. Precinct-level results are published by the Department of State after certification and will replace county data where a page says so.",
    "unofficial": True,
    "election": S26["meta"]["election"],
    "statewide_reporting": S26["meta"]["statewide_reporting"],
    "legislative_source_time_local": S26["meta"]["source_last_updated_local"],
    "legislative_fetched_at_utc": S26["meta"]["fetched_at_utc"],
    "governor_source_time_local": raw["gov_2026"]["meta"]["source_last_updated_local"],
    "tracker_final_source_time_local": tracker_senate["meta"]["source_last_updated_local"],
    "county_reporting": {norm_county(k): v for k, v in H26["county_reporting"].items()},
    "registered": {str(y): el[i]["RegisteredVotes"] for y, i in ((2026, 117), (2024, 105), (2022, 94)) if i in el},
    "ballots_counted": {str(y): el[i]["BallotsCounted"] for y, i in ((2026, 117), (2024, 105)) if i in el},
    "forecast_generated": priors["generated_from"],
    "sources": [
        {"name": "Pennsylvania Department of State, unofficial election returns", "url": "https://www.electionreturns.pa.gov/"},
        {"name": "Pennsylvania Department of State, election data (precinct files)", "url": "https://www.pa.gov/agencies/dos/resources/voting-and-elections-resources/voting-and-election-statistics/election-data.html"},
        {"name": "Pennsylvania Legislative Reapportionment Commission, 2022 final plans", "url": "https://www.redistricting.state.pa.us/"},
        {"name": "US Census Bureau, 2024 Gazetteer files", "url": "https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html"},
        {"name": "US Census Bureau, cartographic boundary files 2024", "url": "https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html"},
        {"name": "US Census Bureau, ACS 2020-2024 5-year table-based summary file", "url": "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/"},
        {"name": "US Census Bureau, 2020 block assignment files (VTD)", "url": "https://www.census.gov/geographies/reference-files/time-series/geo/block-assignment-files.html"},
        {"name": "Election-night tracker (forecast priors, estimates, timelines)", "url": "https://alainxc.github.io/pa-election-night/"},
        {"name": "Pre-election forecast", "url": "https://alainxc.github.io/Pennsylvania-State-Legislature-Election-Model-/"},
    ],
    "definitions": {
        "margin": "Two-party Democratic margin in percentage points: 100 * (D - R) / (D + R). Positive favors the Democrat. Third-party votes are excluded from the denominator.",
        "swing": "Difference between two margins for the same geography, in points. Positive means movement toward Democrats.",
        "est_gov_2026_margin": "Estimate: the district's 2024 presidential margin (exact, from precinct returns on 2022 lines) plus the governor-minus-president county swing of each county the district touches, weighted by 2026 legislative votes cast in that county piece. An estimate until precinct results are certified.",
        "mail_share": "Mail-in and absentee ballots as a share of all votes in the race.",
        "votes_vs_2024_pct": "Votes cast in the 2026 governor's race as a percentage of votes cast in the 2024 presidential race in the same county.",
        "contested": "Both a Democratic-side and a Republican candidate received votes.",
        "unofficial": "Every 2026 figure is the county's unofficial tally as published by the Department of State. Provisional ballots were largely not yet included when these files were built.",
    },
    "county_groups": COUNTY_GROUPS,
}

summary = {
    "senate": chamber_summary("senate"), "house": chamber_summary("house"),
    "governor": {"statewide": statewide(races["gov_2026"]), "candidates": cand_list(raw["gov_2026"]["seats"][0])},
    "pres_2024": {"statewide": statewide(races["pres_2024"])}, "gov_2022": {"statewide": statewide(races["gov_2022"])},
    "ussen_2024": {"statewide": statewide(races["ussen_2024"])}, "ussen_2022": {"statewide": statewide(races["ussen_2022"])},
    "ushouse": {"won_2026": {p: sum(1 for u in ushouse if u["y2026"]["winner"] == p) for p in "DR"},
                "won_2024": {p: sum(1 for u in ushouse if u["y2024"] and u["y2024"]["winner"] == p) for p in "DR"},
                "flips": [u["district"] for u in ushouse if u["y2024"] and u["y2024"]["winner"] != u["y2026"]["winner"]]},
    "legislative_statewide": {},
}
def leg_state(snapseats):
    D = R = T = DM = RM = DE = RE = 0; n_c = 0; Dc = Rc = 0
    for s in snapseats:
        d, r = z(s["dem"]["votes"]), z(s["rep"]["votes"])
        D += d; R += r; T += z(s["total_votes"]); DM += z(s["dem"]["mail_in"]); RM += z(s["rep"]["mail_in"]); DE += z(s["dem"]["election_day"]); RE += z(s["rep"]["election_day"])
        if d and r:
            n_c += 1; Dc += d; Rc += r
    return {"d": D, "r": R, "total": T, "margin": margin(D, R), "mail_margin": margin(DM, RM), "ed_margin": margin(DE, RE),
            "mail_share_2p": round(100.0 * (DM + RM) / (D + R), 2), "d_mail_share_of_d": round(100.0 * DM / D, 2), "r_mail_share_of_r": round(100.0 * RM / R, 2),
            "contested_seats": n_c, "contested_margin": margin(Dc, Rc)}
for lab, snap in (("house_2026", H26), ("house_2024", raw["house_2024"]), ("house_2022", raw["house_2022"]), ("senate_2026", S26), ("senate_2024", raw["senate_2024"]), ("senate_2022", raw["senate_2022"])):
    summary["legislative_statewide"][lab] = leg_state(snap["seats"])

# swing stats
sw = [c["swing_vs_pres_2024"] for c in counties]
summary["county_swing"] = {"vs_pres_2024": {"mean": round(statistics.mean(sw), 2), "median": round(statistics.median(sw), 2), "min": min(sw), "max": max(sw), "all_positive": all(x > 0 for x in sw)},
                           "vs_gov_2022": {"mean": round(statistics.mean(c["swing_vs_gov_2022"] for c in counties), 2), "median": round(statistics.median(c["swing_vs_gov_2022"] for c in counties), 2),
                                           "min": min(c["swing_vs_gov_2022"] for c in counties), "max": max(c["swing_vs_gov_2022"] for c in counties)}}
groups = []
for g in list(COUNTY_GROUPS) + ["Rural T"]:
    cs = [c for c in counties if c["group"] == g]
    v26 = sum(c["gov_2026"]["t"] for c in cs); v24 = sum(c["pres_2024"]["t"] for c in cs); v22 = sum(c["gov_2022"]["t"] for c in cs)
    D26 = sum(c["gov_2026"]["d"] for c in cs); R26 = sum(c["gov_2026"]["r"] for c in cs)
    D24 = sum(c["pres_2024"]["d"] for c in cs); R24 = sum(c["pres_2024"]["r"] for c in cs)
    D22 = sum(c["gov_2022"]["d"] for c in cs); R22 = sum(c["gov_2022"]["r"] for c in cs)
    groups.append({"group": g, "counties": [c["county"] for c in cs], "votes_2026": v26, "votes_2024": v24, "votes_2022": v22,
                   "gov_2026_margin": margin(D26, R26), "pres_2024_margin": margin(D24, R24), "gov_2022_margin": margin(D22, R22),
                   "swing_vs_pres_2024": round(margin(D26, R26) - margin(D24, R24), 2), "swing_vs_gov_2022": round(margin(D26, R26) - margin(D22, R22), 2),
                   "votes_vs_2024_pct": round(100.0 * v26 / v24, 2), "votes_vs_2022_pct": round(100.0 * v26 / v22, 2),
                   "share_of_state_2026": round(100.0 * v26 / sum(c["gov_2026"]["t"] for c in counties), 2), "share_of_state_2024": round(100.0 * v24 / sum(c["pres_2024"]["t"] for c in counties), 2)})
summary["county_groups"] = groups

# split-ticket stats
def split_stats(ch):
    sel = [s for s in seats if s["chamber"] == ch and s["contested"] and s["est_gov_2026_margin"] is not None and s["seat"] != "S46"]
    gaps = [s["margin"] - s["est_gov_2026_margin"] for s in sel]
    pres_gaps = [s["margin"] - s["pres_2024_margin"] for s in sel]
    return {"n": len(sel), "median_gap_vs_est_gov": round(statistics.median(gaps), 2), "mean_gap_vs_est_gov": round(statistics.mean(gaps), 2),
            "share_behind_gov": round(sum(1 for g in gaps if g < 0) / len(gaps), 3),
            "median_gap_vs_pres_2024": round(statistics.median(pres_gaps), 2),
            "gov_d_leg_r": [s["seat"] for s in sel if s["est_gov_2026_margin"] > 0 and s["margin"] < 0],
            "gov_r_leg_d": [s["seat"] for s in sel if s["est_gov_2026_margin"] < 0 and s["margin"] > 0],
            "trump_d": [s["seat"] for s in sel if s["pres_2024_margin"] < 0 and s["margin"] > 0],
            "harris_r": [s["seat"] for s in sel if s["pres_2024_margin"] > 0 and s["margin"] < 0]}
summary["split_ticket"] = {"senate": split_stats("senate"), "house": split_stats("house")}

# ----------------------------------------------------------------------------
# Write
# ----------------------------------------------------------------------------
def dump(name, obj):
    with open(os.path.join(OUT, name), "w") as f:
        json.dump(obj, f, separators=(",", ":"))
    print(name, os.path.getsize(os.path.join(OUT, name)))

dump("meta.json", meta)
dump("summary.json", summary)
dump("seats.json", seats)
dump("counties.json", counties)
dump("scorecard.json", scorecard)
dump("ushouse.json", ushouse)
dump("timeline_senate.json", slim_timeline(timeline_s, True))
dump("timeline_house.json", slim_timeline(timeline_h, False))
