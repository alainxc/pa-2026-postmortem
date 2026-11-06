#!/usr/bin/env python3
"""Second pull: fresh 2026 legislative snapshots (same day as the governor pull) and 2024 US House."""
import sys, os, json, traceback
TRACKER = os.path.expanduser("~/Desktop/pa-election-night")
sys.path.insert(0, TRACKER)
import fetch_returns as fr
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "raw")
c = fr.Client(pause=0.15)
for label, eid, etype, office, cr in [("senate_2026", 117, "G", "STS", True), ("house_2026", 117, "G", "STH", True), ("ushouse_2024", 105, "G", "USC", False), ("ushouse_2022", 94, "G", "USC", False), ("ussenate_2022", 94, "G", "USS", False)]:
    path = os.path.join(OUT, label + ".json")
    if os.path.exists(path): print("skip", label); continue
    try:
        snap = fr.build_snapshot(c, eid, etype, None, office, county_reporting=cr)
        json.dump(snap, open(path, "w"))
        m = snap["meta"]; print("ok", label, m["seat_count"], m["row_count"], m["fetched_at_utc"], m["source_last_updated_local"], m["statewide_reporting"]["reporting_note"], flush=True)
    except Exception as e:
        print("FAIL", label, repr(e)); traceback.print_exc()
