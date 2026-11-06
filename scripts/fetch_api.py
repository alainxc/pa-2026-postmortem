#!/usr/bin/env python3
"""Pull county-by-method returns for comparison races from electionreturns.pa.gov
using the tracker's client (imported read-only from ../pa-election-night).
Writes data/raw/<label>.json. Never modifies the tracker repo."""
import sys, os, json, traceback
TRACKER = os.path.expanduser("~/Desktop/pa-election-night")
sys.path.insert(0, TRACKER)
import fetch_returns as fr

OUT = os.path.join(os.path.dirname(__file__), "..", "data", "raw")
os.makedirs(OUT, exist_ok=True)
c = fr.Client(pause=0.15)

jobs = [
    ("gov_2026",   117, "G", "GOV"),
    ("ushouse_2026", 117, "G", "USC"),
    ("senate_2024", 105, "G", "STS"),
    ("house_2024",  105, "G", "STH"),
    ("senate_2022", 94, "G", "STS"),
    ("house_2022",  94, "G", "STH"),
    ("ussenate_2024", 105, "G", "USS"),
    ("gov_2022", 94, "G", "GOV"),
    ("pres_2024", 105, "G", "USP"),
]
for label, eid, etype, office in jobs:
    path = os.path.join(OUT, label + ".json")
    if os.path.exists(path):
        print("skip", label); continue
    try:
        snap = fr.build_snapshot(c, eid, etype, None, office, county_reporting=False)
        with open(path, "w") as f: json.dump(snap, f)
        m = snap["meta"]
        print("ok", label, m["seat_count"], "contests", m["row_count"], "rows", m["election"]["name"], m["election"]["status"], flush=True)
    except Exception as e:
        print("FAIL", label, repr(e), flush=True)
        traceback.print_exc()
# election list for ballots counted / registered
try:
    el = fr.get_election_list(c)
    json.dump(el, open(os.path.join(OUT, "election_list.json"), "w"))
    for e in el:
        if e.get("Electionid") in (117, 105, 94) and e.get("ElectionType") == "G":
            print(e)
except Exception as e:
    print("FAIL election_list", e)
