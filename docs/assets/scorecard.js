/* Forecast scorecard: Senate dot plot, calibration, odds through the night, seat table. */
(function () {
  const $ = (id) => document.getElementById(id);
  const F = Site.fmt;
  let D = null;

  function fill(meta, summary, seats, scorecard) {
    const sen = summary.senate, hou = summary.house;
    $("d-psen").textContent = F.prob(sen.forecast.p_dem_control);
    $("s-psen").textContent = F.prob(sen.forecast.p_dem_control);
    $("s-prsen").textContent = F.prob(sen.forecast.p_rep_control);
    $("s-ptie").textContent = F.prob(1 - sen.forecast.p_dem_control - sen.forecast.p_rep_control);
    $("s-sen-got").textContent = sen.new_chamber.D;
    $("s-sen-exp").textContent = sen.forecast.dem_seats_mean.toFixed(1);
    $("s-phou").textContent = F.prob(hou.forecast.p_dem_control);
    $("s-hou-got").textContent = hou.new_chamber.D;
    $("s-hou-exp").textContent = hou.forecast.dem_seats_mean.toFixed(1);
    $("f-date").textContent = meta.forecast_generated.slice(0, 10);

    const senC = seats.filter((s) => s.chamber === "senate" && s.contested && s.forecast && !s.forecast.uncontested);
    const bluer = senC.filter((s) => s.forecast.error > 0).length;
    const byErr = senC.slice().sort((a, b) => b.forecast.error - a.forecast.error);
    const top = byErr.slice(0, 5).map((s) => `${F.seat(s.seat)} (${F.marginSigned(s.forecast.error)})`).join(", ");
    const bottom = byErr.slice(-3).reverse().map((s) => `${F.seat(s.seat)} (${F.marginSigned(s.forecast.error)})`).join(", ");
    const s4 = senC.find((s) => s.seat === "S4");
    $("p-senate-misses").innerHTML = `${bluer} of ${senC.length} contested Senate seats finished to the left of the forecast mean. The largest misses toward Democrats were ${top}. SD-4 is the outlier: the Democrat won by ${s4.margin.toFixed(1)} points against a forecast of ${s4.forecast.mu.toFixed(1)}, a seat the model never doubted but badly under-rated in margin. The seats that ran redder than forecast were ${bottom}. Two cautions on those: SD-46 is a Republican against an independent with no Democrat on the ballot, so "Democratic side" is a modeling convention; and SD-36 is a magnitude miss on a seat the model already leaned Republican.`;

    const c = scorecard.calibration;
    const mid = c.filter((b) => b.lo >= 0.2 && b.hi <= 0.8);
    const midN = d3.sum(mid, (b) => b.n), midWon = d3.sum(mid, (b) => b.dem_won), midP = d3.sum(mid, (b) => b.mean_p * b.n) / midN;
    const lost = scorecard.favored_lost.map((f) => `${F.seat(f.seat)} (Democratic probability ${F.prob(f.p_dem)}, result ${F.margin(f.margin)})`).join("; ");
    $("p-calib").innerHTML = `Over ${scorecard.n_contested} contested seats the Brier score is ${scorecard.brier.toFixed(3)}, which is good, but most of that comes from the ${c[0].n + c[c.length - 1].n} seats that were never in doubt. In the three middle bins (20 to 80 percent) the model gave Democrats an average ${Math.round(100 * midP)} percent chance and they won ${midWon} of ${midN}, or ${Math.round(100 * midWon / midN)} percent. The favored side lost in ${scorecard.favored_lost.length} seats: ${lost}. HD-41 is a 41-vote Republican lead that may still change. A uniform two-to-five point miss produces exactly this picture, so this is evidence of an environment error, not of a broken seat model.`;

    const e = scorecard.errors;
    $("p-bias").innerHTML = `Across contested seats the actual Democratic margin exceeded the forecast mean by ${F.marginSigned(e.senate.mean)} points in the Senate (${e.senate.n} seats, excluding SD-46) and ${F.marginSigned(e.house.mean)} in the House (${e.house.n} seats). Median errors were ${F.marginSigned(e.senate.median)} and ${F.marginSigned(e.house.median)}; mean absolute errors ${e.senate.mae.toFixed(1)} and ${e.house.mae.toFixed(1)}. The direction is the same in both chambers and in almost every region, which is the signature of a statewide environment miss.`;
    const env = scorecard.environment;
    $("b-env").textContent = env.mean.toFixed(1);
    $("b-env-lo").textContent = env.p05.toFixed(1);
    $("b-env-hi").textContent = env.p95.toFixed(1);
    $("b-gov").textContent = summary.governor.statewide.margin.toFixed(1);

    const houC = seats.filter((s) => s.chamber === "house" && s.contested && s.forecast && !s.forecast.uncontested);
    $("r-house-signs").textContent = houC.filter((s) => (s.forecast.p_dem > 0.5) === (s.margin > 0)).length;
    $("r-house-n").textContent = houC.length;
    $("r-in90").textContent = e.all.in_90;
    $("r-n").textContent = e.all.n;
  }

  function drawSenateDots(seats) {
    const sen = seats.filter((s) => s.chamber === "senate" && s.contested && s.forecast && !s.forecast.uncontested).slice().sort((a, b) => b.forecast.mu - a.forecast.mu);
    const W = 560, rowH = 20, m = { t: 30, r: 16, b: 8, l: 64 }, H = m.t + m.b + rowH * sen.length;
    const svg = Site.svg("#senate-dots", W, H);
    const ext = d3.extent(sen.flatMap((s) => [s.forecast.p05, s.forecast.p95, s.margin]));
    const x = d3.scaleLinear().domain([Math.floor(ext[0] / 10) * 10, Math.ceil(ext[1] / 10) * 10]).range([m.l, W - m.r]);
    const y = (i) => m.t + rowH * i + rowH / 2;
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${m.t - 8})`).call(d3.axisTop(x).ticks(7).tickFormat((d) => F.margin(d, 0)).tickSize(-(H - m.t - m.b + 8))).call((a) => a.selectAll("line").attr("class", "gridline")).call((a) => a.select(".domain").remove());
    svg.append("line").attr("class", "zero").attr("x1", x(0)).attr("x2", x(0)).attr("y1", m.t - 8).attr("y2", H - m.b);
    const tip = Site.tooltip("#senate-dots");
    const rows = svg.selectAll("g.row").data(sen).join("g").attr("transform", (d, i) => `translate(0,${y(i)})`);
    rows.append("text").attr("class", "label").attr("x", m.l - 8).attr("y", 4).attr("text-anchor", "end").text((d) => F.seat(d.seat) + (d.seat === "S46" ? "*" : ""));
    rows.append("line").attr("x1", (d) => x(d.forecast.p05)).attr("x2", (d) => x(d.forecast.p95)).attr("stroke", Site.color.muted()).attr("stroke-width", 1.2).attr("opacity", 0.6);
    rows.append("circle").attr("cx", (d) => x(d.forecast.mu)).attr("r", 4).attr("fill", Site.color.bg()).attr("stroke", Site.color.muted()).attr("stroke-width", 1.5);
    rows.append("circle").attr("cx", (d) => x(d.margin)).attr("r", 5).attr("fill", (d) => (d.winner === "D" ? Site.color.dem() : Site.color.rep()));
    rows.append("rect").attr("x", m.l).attr("y", -rowH / 2).attr("width", W - m.l - m.r).attr("height", rowH).attr("fill", "transparent")
      .on("mousemove", (e, d) => tip.show(e, `<b>${d.district_name}</b><br>Forecast ${F.margin(d.forecast.mu)} (${F.margin(d.forecast.p05, 0)} to ${F.margin(d.forecast.p95, 0)}), P(Dem) ${F.prob(d.forecast.p_dem)}, ${d.forecast.rating}<br>Result ${F.margin(d.margin)}, error ${F.marginSigned(d.forecast.error)}${d.note ? "<br><i>" + d.note + "</i>" : ""}`))
      .on("mouseleave", tip.hide);
    const s4 = sen.find((d) => d.seat === "S4");
    if (s4) {
      const i = sen.indexOf(s4);
      svg.append("text").attr("class", "annot").attr("x", x(s4.forecast.mu) - 6).attr("y", y(i) + rowH + 10).attr("text-anchor", "end").text(`SD-4: won by ${s4.margin.toFixed(0)}, forecast ${s4.forecast.mu.toFixed(0)}, the biggest miss`);
      svg.append("path").attr("class", "annot-line").attr("d", `M${x(s4.forecast.mu) - 4},${y(i) + rowH + 6} L${x(s4.margin) - 6},${y(i) + 2}`);
    }
  }

  function drawCalib(scorecard) {
    const bins = scorecard.calibration;
    const W = 420, H = 360, m = { t: 16, r: 16, b: 44, l: 48 };
    const svg = Site.svg("#calib", W, H);
    const x = d3.scaleLinear().domain([0, 1]).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([0, 1]).range([H - m.b, m.t]);
    const pct = d3.format(".0%");
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(5).tickFormat(pct).tickSize(-(H - m.t - m.b))).call((a) => a.selectAll("line").attr("class", "gridline")).call((a) => a.select(".domain").remove());
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(pct).tickSize(-(W - m.l - m.r))).call((a) => a.selectAll("line").attr("class", "gridline")).call((a) => a.select(".domain").remove());
    svg.append("line").attr("x1", x(0)).attr("y1", y(0)).attr("x2", x(1)).attr("y2", y(1)).attr("stroke", Site.color.muted()).attr("stroke-dasharray", "4 4");
    svg.append("text").attr("class", "label muted").attr("x", (m.l + W - m.r) / 2).attr("y", H - 8).attr("text-anchor", "middle").text("Forecast probability of a Democratic win (bin average)");
    svg.append("text").attr("class", "label muted").attr("transform", `translate(12,${(m.t + H - m.b) / 2}) rotate(-90)`).attr("text-anchor", "middle").text("Share of seats Democrats won");
    const r = d3.scaleSqrt().domain([0, d3.max(bins, (b) => b.n)]).range([3, 18]);
    const tip = Site.tooltip("#calib");
    svg.selectAll("circle").data(bins).join("circle").attr("cx", (b) => x(b.mean_p)).attr("cy", (b) => y(b.dem_won / b.n)).attr("r", (b) => r(b.n))
      .attr("fill", (b) => (b.dem_won / b.n > b.mean_p + 0.02 ? Site.color.dem() : b.dem_won / b.n < b.mean_p - 0.02 ? Site.color.rep() : Site.color.purple())).attr("fill-opacity", 0.7).attr("stroke", Site.color.bg())
      .on("mousemove", (e, b) => tip.show(e, `<b>${Math.round(b.lo * 100)} to ${Math.round(b.hi * 100)}%</b><br>${b.n} seats, mean forecast ${pct(b.mean_p)}<br>Democrats won ${b.dem_won} (${pct(b.dem_won / b.n)})${b.seats ? "<br>" + b.seats.map(F.seat).join(", ") : ""}`)).on("mouseleave", tip.hide);
    svg.selectAll("text.n").data(bins.filter((b) => b.n <= 15)).join("text").attr("class", "label").attr("x", (b) => x(b.mean_p) + r(b.n) + 3).attr("y", (b) => y(b.dem_won / b.n) + 4).text((b) => `${b.dem_won} of ${b.n}`);
    const mid = bins.find((b) => b.lo === 0.6);
    if (mid) {
      svg.append("text").attr("class", "annot").attr("x", x(0.62)).attr("y", y(0.98)).attr("text-anchor", "middle").text("Above the line means Democrats did better than the odds said");
    }
  }

  const hm = (d) => new Date(d).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).toLowerCase();
  function drawOdds(tl) {
    const pts = tl.points.map((p) => ({ t: new Date(p.t), d: p.chamber.p_dem_majority, r: p.chamber.p_rep_majority, n: p.chamber.p_no_majority }));
    // show from 7:30 pm ET Nov 3 to 2 am ET Nov 4
    const t0 = new Date("2026-11-04T00:30:00Z"), t1 = new Date("2026-11-04T07:00:00Z");
    const data = pts.filter((p) => p.t >= t0 && p.t <= t1);
    const W = 560, H = 300, m = { t: 16, r: 16, b: 40, l: 44 };
    const svg = Site.svg("#odds", W, H);
    const x = d3.scaleTime().domain([t0, t1]).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([0, 1]).range([H - m.b, m.t]);
    const fmtET = (d) => d.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric" });
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(d3.timeHour.every(1)).tickFormat(fmtET).tickSize(-(H - m.t - m.b))).call((a) => a.selectAll("line").attr("class", "gridline")).call((a) => a.select(".domain").remove());
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".0%")).tickSize(-(W - m.l - m.r))).call((a) => a.selectAll("line").attr("class", "gridline")).call((a) => a.select(".domain").remove());
    svg.append("text").attr("class", "label muted").attr("x", (m.l + W - m.r) / 2).attr("y", H - 6).attr("text-anchor", "middle").text("Election night, Eastern time");
    const line = (k) => d3.line().x((p) => x(p.t)).y((p) => y(p[k])).curve(d3.curveStepAfter);
    svg.append("path").datum(data).attr("d", line("d")).attr("fill", "none").attr("stroke", Site.color.dem()).attr("stroke-width", 2.5);
    svg.append("path").datum(data).attr("d", line("r")).attr("fill", "none").attr("stroke", Site.color.rep()).attr("stroke-width", 2.5);
    svg.append("path").datum(data).attr("d", line("n")).attr("fill", "none").attr("stroke", Site.color.purple()).attr("stroke-width", 2.5);
    const last = data[data.length - 1];
    svg.append("text").attr("class", "label").attr("x", x(last.t) - 4).attr("y", y(last.d) - 6).attr("text-anchor", "end").attr("fill", Site.color.dem()).text("Democratic majority");
    svg.append("text").attr("class", "label").attr("x", x(last.t) - 4).attr("y", y(last.n) - 6).attr("text-anchor", "end").attr("fill", Site.color.purple()).text("No majority (25-25)");
    svg.append("text").attr("class", "label").attr("x", x(data[0].t) + 4).attr("y", y(data[0].r) - 6).attr("fill", Site.color.rep()).text("Republican majority");
    const cross = data.find((p) => p.d >= 0.9);
    if (cross) {
      svg.append("path").attr("class", "annot-line").attr("d", `M${x(cross.t)},${y(cross.d)} L${x(cross.t) - 30},${y(0.62)}`);
      svg.append("text").attr("class", "annot").attr("x", x(cross.t) - 32).attr("y", y(0.6)).attr("text-anchor", "end").text(`${hm(cross.t)} ET: odds pass 90% as the SD-6 count nears complete`);
    }
    const tip = Site.tooltip("#odds");
    svg.append("rect").attr("x", m.l).attr("y", m.t).attr("width", W - m.l - m.r).attr("height", H - m.t - m.b).attr("fill", "transparent").on("mousemove", (e) => {
      const [mx] = d3.pointer(e); const t = x.invert(mx);
      const p = data.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a));
      tip.show(e, `<b>${Site.fmt.time(p.t.toISOString())} ET</b><br>Dem majority ${F.prob(p.d)}<br>Rep majority ${F.prob(p.r)}<br>No majority ${F.prob(p.n)}`);
    }).on("mouseleave", tip.hide);
    // narrative
    const first50 = pts.find((p) => p.d >= 0.5), first90 = pts.find((p) => p.d >= 0.9);
    const start = pts.find((p) => p.t >= new Date("2026-11-04T01:00:00Z"));
    const dip = pts.filter((p) => p.t > first50.t && p.t < first90.t).reduce((a, b) => (b.d < a.d ? b : a));
    $("p-night").innerHTML = `At 8:06 pm, with no votes counted, the tracker showed the forecast's priors: ${F.prob(start.d)} for a Democratic majority, ${F.prob(start.r)} for Republican, ${F.prob(start.n)} for a tie. The Democratic line first crossed 50 percent at ${hm(first50.t)}, fell back to ${F.prob(dip.d)} at ${hm(dip.t)}, then climbed past 90 percent at ${hm(first90.t)} and settled near ${F.prob(pts[pts.length - 1].d)} once SD-6 was 99 percent counted. The reason for the dip has not been checked; the per-county order of reporting is in the tracker's commit history and is a good question for the precinct phase. The House odds never left 99.99 percent and are not shown.`;
  }

  function drawTable(seats) {
    const rows = seats.filter((s) => s.contested && s.forecast && !s.forecast.uncontested).map((s) => ({
      seat: s.seat, seatNum: (s.chamber === "senate" ? 0 : 1000) + s.district, winner: s.winner, forecast_mu: s.forecast.mu, margin: s.margin, error: s.forecast.error, p_dem: s.forecast.p_dem, rating: s.forecast.rating, in_90: s.forecast.in_90 ? 1 : 0, name: s.district_name,
    }));
    Site.sortable(document.getElementById("seats"), rows, (r) => `<tr><td title="${r.name}">${F.seat(r.seat)}</td><td><span class="pill ${r.winner}">${r.winner}</span></td><td class="num">${F.margin(r.forecast_mu)}</td><td class="num">${F.margin(r.margin)}</td><td class="num" style="color:${r.error > 0 ? "var(--dem)" : "var(--rep)"}">${F.marginSigned(r.error)}</td><td class="num">${F.prob(r.p_dem)}</td><td class="hide-sm">${r.rating}</td><td class="hide-sm">${r.in_90 ? "yes" : "<b>no</b>"}</td></tr>`, "error", true);
  }

  function draw() {
    if (!D) return;
    drawSenateDots(D.seats);
    drawCalib(D.scorecard);
    drawOdds(D.tl);
  }

  Site.load(["meta", "summary", "seats", "scorecard", "timeline_senate"]).then(([meta, summary, seats, scorecard, tl]) => {
    Site.chrome(meta);
    D = { meta, summary, seats, scorecard, tl };
    fill(meta, summary, seats, scorecard);
    draw();
    drawTable(seats);
  }).catch((e) => { console.error(e); document.querySelector("main").insertAdjacentHTML("beforeend", `<p class="note">Could not load data: ${e.message}</p>`); });
  window.addEventListener("themechange", draw);
})();
