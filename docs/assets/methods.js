/* Methods page: render sources, definitions, data vintage and county groups from meta.json. */
(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const t = (s) => (s ? String(s).replace(/\.\d+$/, "") + " ET" : "n/a");
  Site.load(["meta"]).then(([meta]) => {
    Site.chrome(meta);
    document.getElementById("sources").innerHTML = meta.sources.map((s) => `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.name)}</a></li>`).join("");
    const defs = Object.entries(meta.definitions).map(([k, v]) => `<dt>${esc(k.replace(/_/g, " "))}</dt><dd>${esc(v)}</dd>`).join("");
    document.getElementById("definitions").innerHTML = defs;
    const below = Object.entries(meta.county_reporting).filter(([, v]) => v.precincts_reporting != null && v.precincts_reporting !== v.precincts_total)
      .map(([c, v]) => `${Site.fmt.county(c)} ${Site.fmt.int(v.precincts_reporting)} of ${Site.fmt.int(v.precincts_total)}`);
    const rep = meta.statewide_reporting;
    const rows = [
      ["Legislative returns (Senate and House)", "state site last updated " + t(meta.legislative_source_time_local)],
      ["Governor and US House returns", "state site last updated " + t(meta.governor_source_time_local)],
      ["Election-night tracker's final snapshot", t(meta.tracker_final_source_time_local) + " (used for the night-of timelines)"],
      ["Forecast", "frozen " + esc(meta.forecast_generated.replace("T", " ")) ],
      ["Precincts reporting (in-person ballots only)", `${Site.fmt.int(rep.precincts_reporting)} of ${Site.fmt.int(rep.precincts_total)} (${rep.pct_precincts_reporting}%)`],
      ["Counties below 100 percent in-person reporting", below.length ? below.join("; ") : "none"],
      ["Registered voters", `2026: ${Site.fmt.int(meta.registered["2026"])}; 2024: ${Site.fmt.int(meta.registered["2024"])}; 2022: ${Site.fmt.int(meta.registered["2022"])}`],
      ["Ballots counted (state's figure)", `2026: ${Site.fmt.int(meta.ballots_counted["2026"])} so far; 2024: ${Site.fmt.int(meta.ballots_counted["2024"])}`],
      ["Geography", `${esc(meta.geography_level)}. ${esc(meta.geography_note)}`],
      ["Data files built", esc(meta.built_at_utc.replace("T", " ").replace("+00:00", " UTC"))],
    ];
    document.getElementById("vintage-list").innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
    const groups = Object.entries(meta.county_groups).map(([g, cs]) => `<b>${esc(g)}</b>: ${cs.map(Site.fmt.county).join(", ")}`);
    groups.push("<b>Rural T</b>: every other county");
    document.getElementById("groups").innerHTML = "Groupings chosen for this site's turnout and swing summaries. " + groups.join(". ") + ".";
  }).catch((e) => { document.getElementById("sources").innerHTML = `<li>Could not load meta.json (${esc(e.message)})</li>`; });
})();
