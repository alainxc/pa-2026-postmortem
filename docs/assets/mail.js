/* Mail vs in person page */
Site.load(["meta", "summary", "counties"]).then(([meta, summary, counties]) => {
  Site.chrome(meta);
  const F = Site.fmt;
  const g26 = summary.governor.statewide, p24 = summary.pres_2024.statewide, g22 = summary.gov_2022.statewide;
  const L = summary.legislative_statewide;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  set("r24", F.pct(p24.r_mail_share_of_r)); set("r26", F.pct(g26.r_mail_share_of_r)); set("r22", F.pct(g22.r_mail_share_of_r));
  set("r24b", F.pct(p24.r_mail_share_of_r)); set("r26b", F.pct(g26.r_mail_share_of_r)); set("r22b", F.pct(g22.r_mail_share_of_r));
  set("mshare26", F.pct(100 * (g26.d_mail + g26.r_mail) / (g26.d + g26.r)));
  set("mshare24", F.pct(100 * (p24.d_mail + p24.r_mail) / (p24.d + p24.r)));
  set("mshare22", F.pct(100 * (g22.d_mail + g22.r_mail) / (g22.d + g22.r)));
  set("mm26", g26.mail_margin.toFixed(1)); set("mm24", p24.mail_margin.toFixed(1)); set("mm22", g22.mail_margin.toFixed(1));
  set("em26", g26.ed_margin.toFixed(1)); set("em24", Math.abs(p24.ed_margin).toFixed(1)); set("em22", Math.abs(g22.ed_margin).toFixed(1));
  set("prov26", F.pct(g26.prov_share, 3)); set("prov24", F.pct(p24.prov_share, 2));
  set("provzero", counties.filter((c) => c.gov_2026.prov_share === 0).length);
  const phl = counties.find((c) => c.county === "PHILADELPHIA");
  set("phl26", F.pct(phl.gov_2026.mail_share)); set("phl22", F.pct(phl.gov_2022.mail_share)); set("phl24", F.pct(phl.pres_2024.mail_share));
  set("rmed24", F.pct(d3.median(counties, (c) => c.pres_2024.r_mail_share_of_r)));
  set("rmed26", F.pct(d3.median(counties, (c) => c.gov_2026.r_mail_share_of_r)));

  // Statewide table
  const rows = [
    ["Governor 2022", g22.d_mail_share_of_d, g22.r_mail_share_of_r, g22.mail_margin, g22.ed_margin, 100 * (g22.d_mail + g22.r_mail) / (g22.d + g22.r)],
    ["President 2024", p24.d_mail_share_of_d, p24.r_mail_share_of_r, p24.mail_margin, p24.ed_margin, 100 * (p24.d_mail + p24.r_mail) / (p24.d + p24.r)],
    ["Governor 2026 (unofficial)", g26.d_mail_share_of_d, g26.r_mail_share_of_r, g26.mail_margin, g26.ed_margin, 100 * (g26.d_mail + g26.r_mail) / (g26.d + g26.r)],
    ["State House, all seats 2024", L.house_2024.d_mail_share_of_d, L.house_2024.r_mail_share_of_r, L.house_2024.mail_margin, L.house_2024.ed_margin, L.house_2024.mail_share_2p],
    ["State House, all seats 2026 (unofficial)", L.house_2026.d_mail_share_of_d, L.house_2026.r_mail_share_of_r, L.house_2026.mail_margin, L.house_2026.ed_margin, L.house_2026.mail_share_2p],
  ];
  document.querySelector("#statewide tbody").innerHTML = rows.map((r) =>
    `<tr><td>${r[0]}</td><td class="num">${F.pct(r[5])}</td><td class="num ${r[3] > 0 ? "dem" : "rep"}">${F.margin(r[3])}</td><td class="num ${r[4] > 0 ? "dem" : "rep"}">${F.margin(r[4])}</td><td class="num">${F.pct(r[1])}</td><td class="num">${F.pct(r[2])}</td></tr>`).join("");

  // Chart 1: slope chart of each party's mail share of own vote
  function drawSlope() {
    const series = [
      { party: "D", label: "Democrats, statewide race", pts: [["2022 gov", g22.d_mail_share_of_d], ["2024 pres", p24.d_mail_share_of_d], ["2026 gov", g26.d_mail_share_of_d]], color: Site.color.dem(), dash: null },
      { party: "R", label: "Republicans, statewide race", pts: [["2022 gov", g22.r_mail_share_of_r], ["2024 pres", p24.r_mail_share_of_r], ["2026 gov", g26.r_mail_share_of_r]], color: Site.color.rep(), dash: null },
      { party: "D", label: "Democrats, State House", pts: [["2022 gov", L.house_2022.d_mail_share_of_d], ["2024 pres", L.house_2024.d_mail_share_of_d], ["2026 gov", L.house_2026.d_mail_share_of_d]], color: Site.color.dem(), dash: "4 3" },
      { party: "R", label: "Republicans, State House", pts: [["2022 gov", L.house_2022.r_mail_share_of_r], ["2024 pres", L.house_2024.r_mail_share_of_r], ["2026 gov", L.house_2026.r_mail_share_of_r]], color: Site.color.rep(), dash: "4 3" },
    ];
    const W = 560, H = 340, m = { t: 20, r: 180, b: 36, l: 44 };
    const svg = Site.svg("#slope", W, H);
    const x = d3.scalePoint().domain(["2022 gov", "2024 pres", "2026 gov"]).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([0, 45]).range([H - m.b, m.t]);
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat((d) => d + "%").tickSize(-(W - m.l - m.r))).call((a) => a.selectAll("line").attr("class", "gridline")).call((a) => a.select(".domain").remove());
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickSize(0)).call((a) => a.select(".domain").remove());
    const line = d3.line().x((d) => x(d[0])).y((d) => y(d[1]));
    const tip = Site.tooltip("#slope");
    series.forEach((s) => {
      svg.append("path").attr("d", line(s.pts)).attr("fill", "none").attr("stroke", s.color).attr("stroke-width", 2.2).attr("stroke-dasharray", s.dash);
      svg.selectAll(null).data(s.pts).join("circle").attr("cx", (d) => x(d[0])).attr("cy", (d) => y(d[1])).attr("r", 4.5).attr("fill", s.color).attr("stroke", Site.color.bg()).attr("stroke-width", 1)
        .on("mousemove", (e, d) => tip.show(e, `<b>${s.label}</b><br>${d[0]}: ${d[1].toFixed(1)}% of own vote by mail`)).on("mouseleave", tip.hide);
    });
    // end labels, pushed apart so they do not overlap
    const labs = series.map((s) => ({ s, y: y(s.pts[2][1]), text: `${s.label.replace("statewide race", "governor/president").replace("State House", "House")} ${s.pts[2][1].toFixed(1)}%` })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < labs.length; i++) if (labs[i].y - labs[i - 1].y < 14) labs[i].y = labs[i - 1].y + 14;
    labs.forEach((l) => svg.append("text").attr("class", "label").attr("x", x("2026 gov") + 9).attr("y", l.y + 4).style("fill", l.s.color).text(l.text));
    // annotation on the Republican statewide drop
    const ax = x("2026 gov"), ay = y(g26.r_mail_share_of_r);
    svg.append("path").attr("class", "annot-line").attr("d", `M${ax - 60},${ay + 46} Q${ax - 30},${ay + 40} ${ax - 6},${ay + 8}`);
    svg.append("text").attr("class", "annot").attr("x", ax - 62).attr("y", ay + 62).attr("text-anchor", "end").text("Republicans' mail use fell back to 2022 levels");
  }

  // Chart 2: county scatter, 2024 vs 2026, with toggle
  const views = {
    rmail: { head: "In every county, Republicans used mail less than in 2024", x: (c) => c.pres_2024.r_mail_share_of_r, y: (c) => c.gov_2026.r_mail_share_of_r, xl: "2024 president: share of Rep vote by mail", yl: "2026 governor: share of Rep vote by mail", fmt: (v) => v.toFixed(0) + "%", dom: [0, 40], color: () => Site.color.rep(), annot: "Below the line: less mail use than 2024" },
    mail: { head: "Mail voters were far more Democratic in every county than in 2024", x: (c) => c.pres_2024.mail_margin, y: (c) => c.gov_2026.mail_margin, xl: "2024 president: Dem margin among mail voters", yl: "2026 governor: Dem margin among mail voters", fmt: (v) => Site.fmt.marginSigned(v, 0), dom: [-45, 95], color: (c) => Site.partyColor(c.gov_2026.mail_margin), annot: "Above the line: bluer mail electorate than 2024" },
    ed: { head: "Election-day voters moved toward Democrats in every county", x: (c) => c.pres_2024.ed_margin, y: (c) => c.gov_2026.ed_margin, xl: "2024 president: Dem margin on election day", yl: "2026 governor: Dem margin on election day", fmt: (v) => Site.fmt.marginSigned(v, 0), dom: [-80, 80], color: (c) => Site.partyColor(c.gov_2026.ed_margin), annot: "Above the line: bluer election day than 2024" },
  };
  let view = "rmail";
  function drawScatter() {
    const v = views[view];
    document.getElementById("scatter-head").textContent = v.head;
    const rs = d3.scaleSqrt().domain([0, d3.max(counties, (c) => c.pres_2024.t)]).range([2.5, 18]);
    Site.scatter("#scatter", counties, {
      x: v.x, y: v.y, xDomain: v.dom, yDomain: v.dom, xLabel: v.xl, yLabel: v.yl, xFmt: v.fmt, yFmt: v.fmt,
      r: (c) => rs(c.pres_2024.t), color: v.color, fit: false, nLabels: 0,
      alwaysLabel: counties.slice().sort((a, b) => Math.abs(v.y(b) - v.x(b)) - Math.abs(v.y(a) - v.x(a))).slice(0, 6)
        .concat(counties.filter((c) => ["PHILADELPHIA", "ALLEGHENY"].includes(c.county))),
      label: (c) => Site.fmt.county(c.county),
      tipHtml: (c) => `<b>${Site.fmt.county(c.county)}</b><br>2024: ${v.fmt(v.x(c))}<br>2026: ${v.fmt(v.y(c))}<br>${Site.fmt.int(c.gov_2026.t)} votes for governor`,
      annotate: (svg, g, x, y, fit, o) => {
        const [a, b] = v.dom;
        g.insert("line", "circle").attr("x1", x(a)).attr("y1", y(a)).attr("x2", x(b)).attr("y2", y(b)).attr("stroke", Site.color.muted()).attr("stroke-width", 1).attr("stroke-dasharray", "3 3");
        svg.append("text").attr("class", "annot").attr("x", x(b) - 6).attr("y", y(b) + (view === "rmail" ? 26 : -8)).attr("text-anchor", "end").text(v.annot);
      },
    });
  }
  document.querySelectorAll("#scatter-toggle button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("#scatter-toggle button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); view = b.dataset.k; drawScatter();
  }));

  // label outliers for the scatter with largest distance from the diagonal: override scoring by passing fit=false uses |y|; patch by sorting manually
  function drawAll() { drawSlope(); drawScatter(); }
  drawAll();
  window.addEventListener("themechange", drawAll);
}).catch((e) => { document.querySelector("main").insertAdjacentHTML("beforeend", `<p class="banner">Could not load data: ${e.message}</p>`); });
