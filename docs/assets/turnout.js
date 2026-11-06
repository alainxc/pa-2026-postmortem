/* Turnout page */
Site.load(["meta", "summary", "counties", "seats"]).then(([meta, summary, counties, seats]) => {
  Site.chrome(meta);
  const F = Site.fmt;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const b26 = meta.ballots_counted["2026"], b24 = meta.ballots_counted["2024"], reg26 = meta.registered["2026"], reg24 = meta.registered["2024"];
  const v26 = d3.sum(counties, (c) => c.gov_2026.t), v24 = d3.sum(counties, (c) => c.pres_2024.t), v22 = d3.sum(counties, (c) => c.gov_2022.t);
  set("b26", F.int(b26)); set("t26", F.pct(100 * b26 / reg26)); set("reg26", F.int(reg26));
  set("b24", F.int(b24)); set("t24", F.pct(100 * b24 / reg24));
  set("v22", F.int(v22));
  set("ret24", F.pct(100 * v26 / v24)); set("ret22", F.pct(100 * v26 / v22));
  const fit24 = Site.ols(counties.map((c) => c.pres_2024.margin), counties.map((c) => c.votes_vs_2024_pct));
  const fit22 = Site.ols(counties.map((c) => c.pres_2024.margin), counties.map((c) => c.votes_vs_2022_pct));
  set("corr24", fit24.r.toFixed(2)); set("corr22", fit22.r.toFixed(2));
  const byC = Object.fromEntries(counties.map((c) => [c.county, c]));
  set("alleg22", F.pct(byC.ALLEGHENY.votes_vs_2022_pct));
  const G = Object.fromEntries(summary.county_groups.map((g) => [g.group, g]));
  set("collar24", F.pct(G["Philadelphia collar"].votes_vs_2024_pct)); set("collar_s24", F.pct(G["Philadelphia collar"].share_of_state_2024)); set("collar_s26", F.pct(G["Philadelphia collar"].share_of_state_2026));
  set("rural24", F.pct(G["Rural T"].votes_vs_2024_pct)); set("rural_s24", F.pct(G["Rural T"].share_of_state_2024)); set("rural_s26", F.pct(G["Rural T"].share_of_state_2026));
  set("sw24", F.pct(G["Southwest outside Allegheny"].votes_vs_2024_pct));
  set("phl24", F.pct(G["Philadelphia"].votes_vs_2024_pct)); set("phl_s24", F.pct(G["Philadelphia"].share_of_state_2024)); set("phl_s26", F.pct(G["Philadelphia"].share_of_state_2026));

  // Chart 1: retention scatter with toggle
  let view = "24";
  const LAB = { "24": ["FULTON", "FAYETTE", "GREENE", "CUMBERLAND", "DAUPHIN", "BUCKS", "ALLEGHENY", "PHILADELPHIA"], "22": ["MONROE", "LEHIGH", "DAUPHIN", "PHILADELPHIA", "GREENE", "FAYETTE", "SOMERSET", "JEFFERSON", "WESTMORELAND", "ALLEGHENY"] };
  function drawRet() {
    const is24 = view === "24";
    document.getElementById("ret-head").textContent = is24 ? "The redder the county, the more of its 2024 electorate stayed home" : "Against the last midterm, the east held its vote and the west lost it";
    document.getElementById("ret-cap").textContent = (is24
      ? "Each dot is a county, sized by 2024 presidential votes. Vertical axis: votes cast for governor in 2026 as a percentage of votes cast for president in 2024 in the same county."
      : "Each dot is a county, sized by 2024 presidential votes. Vertical axis: votes cast for governor in 2026 as a percentage of votes cast for governor in 2022 in the same county.")
      + " Horizontal axis: 2024 two-party presidential margin. Dashed line is the least-squares fit. Source: Department of State county returns; 2026 unofficial. County data now; precinct data after certification.";
    const yk = is24 ? "votes_vs_2024_pct" : "votes_vs_2022_pct";
    const rs = d3.scaleSqrt().domain([0, d3.max(counties, (c) => c.pres_2024.t)]).range([2.5, 18]);
    Site.scatter("#ret", counties, {
      x: (c) => c.pres_2024.margin, y: (c) => c[yk], r: (c) => rs(c.pres_2024.t),
      color: (c) => Site.partyColor(c.pres_2024.margin),
      xLabel: "2024 presidential margin (two-party)", yLabel: is24 ? "2026 votes as % of 2024" : "2026 votes as % of 2022",
      xFmt: (v) => F.marginSigned(v, 0), yFmt: (v) => v + "%", nLabels: 0,
      alwaysLabel: counties.filter((c) => LAB[view].includes(c.county)),
      label: (c) => F.county(c.county),
      tipHtml: (c) => `<b>${F.county(c.county)}</b><br>2026 governor votes: ${F.int(c.gov_2026.t)}<br>${is24 ? "2024 president" : "2022 governor"} votes: ${F.int(is24 ? c.pres_2024.t : c.gov_2022.t)}<br>Retention: ${F.pct(c[yk])}<br>2024 margin: ${F.margin(c.pres_2024.margin)}`,
      annotate: (svg, g, x, y, fit, o) => {
        const tx = x(-45), ty = y(fit.intercept + fit.slope * -45);
        svg.append("path").attr("class", "annot-line").attr("d", `M${tx + 10},${ty - 40} Q${tx + 10},${ty - 12} ${tx + 2},${ty - 4}`);
        svg.append("text").attr("class", "annot").attr("x", tx + 14).attr("y", ty - 46).text(`Correlation ${fit.r.toFixed(2)}: Trump counties lost the most voters`);
      },
    });
  }
  document.querySelectorAll("#ret-toggle button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("#ret-toggle button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); view = b.dataset.k; drawRet();
  }));

  // Chart 2: bars by county group, retention vs 2024
  function drawGroups() {
    const data = summary.county_groups.slice().sort((a, b) => b.votes_vs_2024_pct - a.votes_vs_2024_pct);
    const stAvg = 100 * v26 / v24;
    const res = Site.bars("#groups", data, {
      value: (g) => g.votes_vs_2024_pct, label: (g) => g.group, left: 190, W: 560, rowH: 26, xDomain: [0, 85],
      xFmt: (v) => v + "%", valueFmt: (v) => v.toFixed(1) + "%",
      color: (g) => Site.partyColor(g.pres_2024_margin),
      tipHtml: (g) => `<b>${g.group}</b><br>${g.counties.map(F.county).join(", ")}<br>2026: ${F.int(g.votes_2026)} votes<br>2024: ${F.int(g.votes_2024)}<br>Share of state: ${F.pct(g.share_of_state_2024)} in 2024, ${F.pct(g.share_of_state_2026)} in 2026`,
    });
    const x = res.x, svg = res.svg, H = +svg.attr("viewBox").split(" ")[3];
    svg.append("line").attr("x1", x(stAvg)).attr("x2", x(stAvg)).attr("y1", 18).attr("y2", H - 10).attr("stroke", Site.color.fg()).attr("stroke-dasharray", "3 3").attr("opacity", .7);
    svg.append("text").attr("class", "annot").attr("x", x(stAvg) + 5).attr("y", H - 2).text(`Statewide ${stAvg.toFixed(1)}%: bars colored by 2024 presidential winner`);
  }

  // Group table
  document.querySelector("#grouptable tbody").innerHTML = summary.county_groups.slice().sort((a, b) => b.votes_2026 - a.votes_2026).map((g) =>
    `<tr><td>${g.group}</td><td class="num">${F.int(g.votes_2026)}</td><td class="num">${F.pct(g.votes_vs_2024_pct)}</td><td class="num">${F.pct(g.votes_vs_2022_pct)}</td><td class="num">${F.pct(g.share_of_state_2024)}</td><td class="num">${F.pct(g.share_of_state_2026)}</td><td class="num hide-sm ${g.gov_2026_margin > 0 ? "dem" : "rep"}">${F.margin(g.gov_2026_margin)}</td></tr>`).join("");

  // House region table
  const agg = {};
  seats.filter((s) => s.chamber === "house").forEach((s) => {
    const a = (agg[s.region] = agg[s.region] || { n: 0, v26: 0, v24: 0, v22: 0 });
    a.n++; a.v26 += s.total || 0; a.v24 += (s.history["2024"] || {}).total || 0; a.v22 += (s.history["2022"] || {}).total || 0;
  });
  const NAMES = { central: "Central", collar: "Philadelphia collar", pittsburgh_metro: "Pittsburgh metro", philadelphia: "Philadelphia", northeast: "Northeast", northwest: "Northwest", lehigh_valley: "Lehigh Valley" };
  document.querySelector("#regiontable tbody").innerHTML = Object.entries(agg).sort((a, b) => b[1].v26 - a[1].v26).map(([k, a]) =>
    `<tr><td>${NAMES[k] || k}</td><td class="num">${a.n}</td><td class="num">${F.int(a.v26)}</td><td class="num">${F.pct(100 * a.v26 / a.v24)}</td><td class="num">${F.pct(100 * a.v26 / a.v22)}</td></tr>`).join("");

  function drawAll() { drawRet(); drawGroups(); }
  drawAll();
  window.addEventListener("themechange", drawAll);
}).catch((e) => { document.querySelector("main").insertAdjacentHTML("beforeend", `<p class="banner">Could not load data: ${e.message}</p>`); });
