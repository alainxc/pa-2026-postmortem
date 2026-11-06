/* Home page: stats row, Senate strip chart, numbers in prose. */
(function () {
  const $ = (id) => document.getElementById(id);
  const F = Site.fmt;
  let D = null;

  function fill(meta, summary, scorecard) {
    const sen = summary.senate, hou = summary.house, gov = summary.governor.statewide;
    $("st-senate").textContent = `${sen.new_chamber.D} to ${sen.new_chamber.R} D`;
    $("st-senate-old").textContent = `${sen.old_chamber.D} to ${sen.old_chamber.R}`;
    $("st-senate-won").textContent = sen.won.D;
    $("st-house").textContent = `${hou.new_chamber.D} to ${hou.new_chamber.R} D`;
    $("st-house-old").textContent = `${hou.old_chamber.D} to ${hou.old_chamber.R}`;
    $("st-house-close").textContent = hou.closest.filter((s) => Math.abs(s.margin_votes) < 220).length;
    $("st-gov").textContent = F.margin(gov.margin);
    $("st-gov-pct").textContent = F.pct(100 * gov.d / gov.t);
    const u = summary.ushouse;
    $("st-ush").textContent = `${u.won_2026.D} to ${u.won_2026.R} D`;
    $("st-ush-old").textContent = `${u.won_2024.D} to ${u.won_2024.R}`;

    $("p-gov").textContent = gov.margin.toFixed(1);
    const gap = Math.round(Math.abs((summary.split_ticket.senate.median_gap_vs_est_gov + summary.split_ticket.house.median_gap_vs_est_gov) / 2));
    $("p-gap").textContent = gap;
    $("p-psen").textContent = F.prob(sen.forecast.p_dem_control);
    $("p-sen-mean").textContent = sen.forecast.dem_seats_mean.toFixed(1);
    $("p-err-sen").textContent = scorecard.errors.senate.mean.toFixed(1);
    $("p-err-house").textContent = scorecard.errors.house.mean.toFixed(1);
    $("p-swing").textContent = summary.county_swing.vs_pres_2024.mean.toFixed(1);
    $("p-rmail24").textContent = F.pct(summary.pres_2024.statewide.r_mail_share_of_r);
    $("p-rmail26").textContent = F.pct(gov.r_mail_share_of_r);
    $("p-edm").textContent = gov.ed_margin.toFixed(1);
    const b26 = meta.ballots_counted["2026"], b24 = meta.ballots_counted["2024"];
    $("p-ballots").textContent = (b26 / 1e6).toFixed(2) + " million";
    $("p-to24").textContent = (100 * b26 / b24).toFixed(0);
  }

  function drawStrip(seats) {
    const sen = seats.filter((s) => s.chamber === "senate").slice().sort((a, b) => (b.margin == null ? 100 : b.margin) - (a.margin == null ? 100 : a.margin));
    // margin for plotting: cap uncontested at +/-60
    const val = (s) => (s.contested ? Math.max(-60, Math.min(60, s.margin)) : s.winner === "D" ? 60 : -60);
    const prev = (s) => { const h = s.history && s.history["2022"]; return h && h.margin != null ? Math.max(-60, Math.min(60, h.margin)) : null; };
    const W = 560, m = { t: 30, r: 16, b: 10, l: 80 }, rowH = 18, H = m.t + m.b + rowH * sen.length;
    const svg = Site.svg("#senate-strip", W, H);
    const x = d3.scaleLinear().domain([-60, 60]).range([m.l, W - m.r]);
    const y = (i) => m.t + rowH * i + rowH / 2;
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${m.t - 8})`).call(d3.axisTop(x).tickValues([-60, -40, -20, 0, 20, 40, 60]).tickFormat((d) => (Math.abs(d) === 60 ? (d > 0 ? "D unopposed" : "R unopposed") : F.margin(d, 0))).tickSize(-(H - m.t - m.b + 8))).call((a) => a.selectAll("line").attr("class", "gridline")).call((a) => a.select(".domain").remove());
    svg.append("line").attr("class", "zero").attr("x1", x(0)).attr("x2", x(0)).attr("y1", m.t - 8).attr("y2", H - m.b);
    const tip = Site.tooltip("#senate-strip");
    const rows = svg.selectAll("g.row").data(sen).join("g").attr("transform", (d, i) => `translate(0,${y(i)})`);
    rows.append("text").attr("class", "label").attr("x", m.l - 8).attr("y", 4).attr("text-anchor", "end").style("font-weight", (d) => (d.flip ? 700 : 400)).text((d) => F.seat(d.seat));
    rows.filter((d) => prev(d) != null && d.contested).append("line").attr("x1", (d) => x(prev(d))).attr("x2", (d) => x(val(d))).attr("stroke", Site.color.muted()).attr("stroke-width", 1).attr("opacity", 0.6);
    rows.filter((d) => prev(d) != null && d.contested).append("circle").attr("cx", (d) => x(prev(d))).attr("r", 3.5).attr("fill", Site.color.bg()).attr("stroke", Site.color.muted()).attr("stroke-width", 1.2);
    rows.append("circle").attr("cx", (d) => x(val(d))).attr("r", 5).attr("fill", (d) => (d.winner === "D" ? Site.color.dem() : d.winner === "R" ? Site.color.rep() : Site.color.tie()));
    rows.filter((d) => d.flip).append("text").attr("class", "label").attr("x", (d) => x(val(d)) + (val(d) > 0 ? 9 : -9)).attr("text-anchor", (d) => (val(d) > 0 ? "start" : "end")).attr("y", 4).style("font-weight", 600).text((d) => `flip ${d.holder} to ${d.winner}`);
    rows.append("rect").attr("x", m.l).attr("y", -rowH / 2).attr("width", W - m.l - m.r).attr("height", rowH).attr("fill", "transparent")
      .on("mousemove", (e, d) => {
        const c = d.candidates.map((k) => `${k.name} (${k.party}) ${F.int(k.votes)}`).join("<br>");
        tip.show(e, `<b>${d.district_name}</b><br>${c}<br>${d.contested ? F.margin(d.margin) : "uncontested"}${d.note ? "<br><i>" + d.note + "</i>" : ""}`);
      }).on("mouseleave", tip.hide);
    // one annotation: the flips
    const flips = sen.filter((d) => d.flip && d.winner === "D");
    if (flips.length) {
      const i0 = sen.indexOf(flips[0]), i1 = sen.indexOf(flips[flips.length - 1]);
      const ax = x(14), ay = (y(i0) + y(i1)) / 2;
      svg.append("text").attr("class", "annot").attr("x", x(14)).attr("y", y(i0) - 10).attr("text-anchor", "end").text("Four flips to Democrats, all by 2 to 11 points");
      svg.append("path").attr("class", "annot-line").attr("d", `M${x(16)},${y(i0) - 6} L${x(16)},${y(i1) + 6}`);
    }
  }

  function draw() {
    if (!D) return;
    drawStrip(D.seats);
  }

  Site.load(["meta", "summary", "seats", "scorecard"]).then(([meta, summary, seats, scorecard]) => {
    Site.chrome(meta);
    D = { meta, summary, seats, scorecard };
    fill(meta, summary, scorecard);
    draw();
  }).catch((e) => { console.error(e); document.querySelector("main").insertAdjacentHTML("beforeend", `<p class="note">Could not load data: ${e.message}</p>`); });
  window.addEventListener("themechange", draw);
})();
