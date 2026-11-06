#!/usr/bin/env python3
"""Turn the Pennsylvania rows of the ACS 2020-2024 5-year table-based summary files
(data/census/acs5y2024_<table>_pa.dat, see scripts/fetch_acs.sh) into
  docs/data/acs_county.json            county-level shares used by the demographics page now
  data/census/acs_blockgroup_pa.csv    block-group-level shares for the precinct phase
  data/census/acs_tract_pa.csv         tract-level shares (foreign-born is not published below tract)

Tables: B01003 population, B19013 median household income, B15003 educational attainment (25+),
B03002 Hispanic origin by race, B01001 sex by age, B05002 place of birth.
Shares are computed from estimates only; margins of error are carried through in the CSVs
as *_moe where cheap. -555555555 in the source means "not applicable" and becomes null.
"""
import csv
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
CENSUS = os.path.join(HERE, "..", "data", "census")
OUT = os.path.join(HERE, "..", "docs", "data")
os.makedirs(OUT, exist_ok=True)

COUNTY_NAMES = {}  # fips -> state's county spelling
for line in open(os.path.join(CENSUS, "..", "raw", "census", "2024_Gaz_counties_national.txt"), encoding="latin-1"):
    f = line.rstrip("\n").split("\t")
    if f[0] == "PA":
        COUNTY_NAMES[f[1]] = f[3].replace(" County", "").upper().replace("MCKEAN", "McKEAN")


def read(table):
    path = os.path.join(CENSUS, f"acs5y2024_{table}_pa.dat")
    rows = {}
    with open(path) as fh:
        header = fh.readline().rstrip("\n").split("|")
        for line in fh:
            f = line.rstrip("\n").split("|")
            rec = {}
            for k, v in zip(header[1:], f[1:]):
                try:
                    v = int(v)
                except ValueError:
                    try:
                        v = float(v)
                    except ValueError:
                        v = None
                if v is not None and v <= -222222222:
                    v = None
                rec[k] = v
            rows[f[0]] = rec
    return rows


T = {t: read(t) for t in ("b01003", "b19013", "b15003", "b03002", "b01001", "b05002")}


def share(num, den):
    return round(100.0 * num / den, 2) if den else None


def derive(geo):
    g = {}
    p = T["b01003"].get(geo, {})
    g["pop_total"] = p.get("B01003_E001")
    inc = T["b19013"].get(geo, {})
    g["median_hh_income"] = inc.get("B19013_E001")
    g["median_hh_income_moe"] = inc.get("B19013_M001")
    e = T["b15003"].get(geo, {})
    if e.get("B15003_E001"):
        ba = sum(e.get(f"B15003_E0{k}", 0) or 0 for k in (22, 23, 24, 25))
        hs_or_less = sum(e.get(f"B15003_E0{k:02d}", 0) or 0 for k in range(2, 19))  # no schooling through HS diploma/GED
        g["pop_25plus"] = e["B15003_E001"]
        g["ba_plus_share"] = share(ba, e["B15003_E001"])
        g["hs_or_less_share"] = share(hs_or_less, e["B15003_E001"])
    r = T["b03002"].get(geo, {})
    if r.get("B03002_E001"):
        g["white_nh_share"] = share(r.get("B03002_E003", 0), r["B03002_E001"])
        g["black_nh_share"] = share(r.get("B03002_E004", 0), r["B03002_E001"])
        g["asian_nh_share"] = share(r.get("B03002_E006", 0), r["B03002_E001"])
        g["hispanic_share"] = share(r.get("B03002_E012", 0), r["B03002_E001"])
    a = T["b01001"].get(geo, {})
    if a.get("B01001_E001"):
        tot = a["B01001_E001"]
        def s(keys):
            return sum(a.get(f"B01001_E0{k:02d}", 0) or 0 for k in keys)
        over65 = s(range(20, 26)) + s(range(44, 50))
        age18_29 = s(range(7, 12)) + s(range(31, 36))
        under18 = s(range(3, 7)) + s(range(27, 31))
        g["age_65plus_share"] = share(over65, tot)
        g["age_18_29_share"] = share(age18_29, tot)
        g["age_under18_share"] = share(under18, tot)
        g["age_65plus_share_of_adults"] = share(over65, tot - under18)
    b = T["b05002"].get(geo, {})
    if b.get("B05002_E001"):
        g["foreign_born_share"] = share(b.get("B05002_E013", 0), b["B05002_E001"])
        g["naturalized_share"] = share(b.get("B05002_E014", 0), b["B05002_E001"])
    return g


county = {}
bg_rows, tract_rows = [], []
for geo in sorted(set().union(*[set(t) for t in T.values()])):
    g = derive(geo)
    g["geo_id"] = geo
    if geo.startswith("0500000US"):
        county[COUNTY_NAMES[geo[-5:]]] = g
    elif geo.startswith("1500000US"):
        bg_rows.append(g)
    elif geo.startswith("1400000US"):
        tract_rows.append(g)

with open(os.path.join(OUT, "acs_county.json"), "w") as f:
    json.dump(county, f, separators=(",", ":"))
print("counties", len(county))
for name, rows in (("acs_blockgroup_pa.csv", bg_rows), ("acs_tract_pa.csv", tract_rows)):
    if not rows:
        continue
    keys = sorted({k for r in rows for k in r}, key=lambda k: (k != "geo_id", k))
    with open(os.path.join(CENSUS, name), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=keys)
        w.writeheader()
        w.writerows(rows)
    print(name, len(rows))
