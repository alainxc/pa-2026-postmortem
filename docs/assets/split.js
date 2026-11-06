/* Legislators vs the top of the ticket. Data: meta, summary, seats */
(function () {
  const F = Site.fmt;
  let xmode = "gov", seats, summary, rows;

  Site.load(["meta", "summary", "seats"]).then(([meta, sum, all]) => {
    Site.chrome(meta);
    summary = sum;
    seats = all.filter((s) => s.contested && s.est_gov_2026_margin != null && s.pres_2024_margin != null);
    rows = seats.map((s) => ({ seat: s.seat, seatnum: (s.chamber === "senate" ? 0 : 1000) + s.district, label: F.seat(s.seat), chamber: s.chamber, winner: s.winner, margin: s.margin,
      est: s.est_gov_2026_margin, gap: +(s.margin - s.est_gov_2026_margin).toFixed(2), pres: s.pres_2024_margin, holder: s.holder, note: s.note, cands: s.candidates }));
    fill();
    draw();
    document.querySelectorAll("#x-toggle button").forEach((b) => b.addEventListener("click", () => {
      xmode = b.dataset.k;
      document.querySelectorAll("#x-toggle button").forEach((x) => x.classList.toggle("on", x === b));
      drawScatter();
    }));
    window.addEventListener("themechange", draw);
    Site.sortable(document.getElementById("seats"), rows, (r) =>
      `<tr><td>${r.label}${r.note ? " *" : ""}</td><td><span class="pill ${r.winner}">${r.winner}</span></td><td class="num" style="color:${Site.partyColor(r.margin)}">${F.margin(r.margin)}</td><td class="num" style="color:${Site.partyColor(r.est)}">${F.margin(r.est)}</td><td class="num">${F.marginSigned(r.gap)}</td><td class="num hide-sm" style="color:${Site.partyColor(r.pres)}">${F.margin(r.pres)}</td><td class="hide-sm"><span class="pill ${r.holder}">${r.holder}</span></td></tr>`, "gap", false);
  });

  function set(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; }

  function fill() {
    const st = summary.split_ticket, S = st.senate, H = st.house;
    set("govm", Math.abs(summary.governor.statewide.margin).toFixed(1));
    set("senmed", Math.abs(S.median_gap_vs_est_gov).toFixed(1));
    set("housemed", Math.abs(H.median_gap_vs_est_gov).toFixed(1));
    set("sen-behind", Math.round(S.share_behind_gov * S.n)); set("sen-n", S.n + " (SD-46, with no Democrat on the ballot, excluded)");
    set("house-behind-pct", Math.round(H.share_behind_gov * 100)); set("house-n", H.n);
    set("gov-d-leg-r-n", S.gov_d_leg_r.length + H.gov_d_leg_r.length);
    set("gov-d-leg-r-sen", S.gov_d_leg_r.map(F.seat).join(" and "));
    const h72 = rows.find((r) => r.seat === "H72");
    if (h72) { set("h72", Math.abs(h72.margin).toFixed(1)); set("h72pres", Math.abs(h72.pres).toFixed(1)); }
    set("trump-d-n", S.trump_d.length + H.trump_d.length); set("trump-d-sen", S.trump_d.length); set("trump-d-house", H.trump_d.length);
    set("harris-r-n", S.harris_r.length + H.harris_r.length === 0 ? "no" : S.harris_r.length + H.harris_r.length);
    set("pres-gap-sen", S.median_gap_vs_pres_2024.toFixed(1)); set("pres-gap-house", H.median_gap_vs_pres_2024.toFixed(1));
  }

  function draw() { drawScatter(); drawDots(); }

  function drawScatter() {
    const gov = xmode === "gov";
    const xk = gov ? "est" : "pres";
    const outliers = ["S20", "S6", "H119", "H106", "H72"].map((k) => rows.find((r) => r.seat === k)).filter(Boolean);
    document.getElementById("scatter-cap").textContent = gov
      ? "Each dot is a contested seat (both parties on the ballot). Vertical: the legislative candidate's two-party margin, unofficial. Horizontal: the estimated 2026 governor margin in the district (2024 presidential margin plus county swing; an estimate). Dots below the dashed line are districts where the Democratic legislative candidate ran behind Shapiro. SD-46 is shown with the independent treated as the Democratic side, as the forecast did."
      : "Each dot is a contested seat. Vertical: the legislative candidate's two-party margin, unofficial. Horizontal: the exact 2024 presidential margin in the district, from certified precinct returns. Dots above the dashed line are districts where the Democratic legislative candidate ran ahead of Harris: nearly all of them.";
    Site.scatter("#scatter", rows, {
      x: (r) => r[xk], y: (r) => r.margin, W: 600, H: 460,
      xDomain: [-70, 90], yDomain: [-70, 90],
      xLabel: gov ? "Estimated 2026 governor margin in district (D minus R, points)" : "2024 presidential margin in district (D minus R, points)",
      yLabel: "2026 legislative margin (D minus R, points)",
      xFmt: (v) => (v > 0 ? "+" + v : v), yFmt: (v) => (v > 0 ? "+" + v : v),
      color: (r) => (r.winner === "D" ? Site.color.dem() : Site.color.rep()),
      r: (r) => (r.chamber === "senate" ? 6.5 : 4),
      fit: false, nLabels: 0, alwaysLabel: outliers, label: (r) => r.label,
      tipHtml: (r) => `<b>${r.label}</b> ${r.cands.map((c) => c.name + " (" + c.party[0] + ")").join(" vs ")}<br>Legislative: ${F.margin(r.margin)}<br>Est. governor: ${F.margin(r.est)} (estimate)<br>2024 president: ${F.margin(r.pres)}<br>Gap vs governor: ${F.marginSigned(r.gap)}`,
      annotate: (svg, g, x, y) => {
        const lo = Math.max(x.domain()[0], y.domain()[0]), hi = Math.min(x.domain()[1], y.domain()[1]);
        g.append("line").attr("class", "fit").attr("x1", x(lo)).attr("y1", y(lo)).attr("x2", x(hi)).attr("y2", y(hi));
        const n = rows.filter((r) => (gov ? r.margin < r.est : r.margin > r.pres)).length;
        const txt = gov ? `${n} of ${rows.length} dots sit below the line: legislators ran behind Shapiro` : `${n} of ${rows.length} dots sit above the line: legislators ran ahead of Harris`;
        svg.append("text").attr("class", "annot").attr("x", x(-68)).attr("y", y(gov ? 78 : -60)).text(txt);
        svg.append("line").attr("class", "annot-line").attr("x1", x(-20)).attr("y1", y(gov ? 74 : -56)).attr("x2", x(gov ? 35 : 5)).attr("y2", y(gov ? 24 : -20));
      },
    });
  }

  function drawDots() {
    const sen = rows.filter((r) => r.chamber === "senate").sort((a, b) => a.gap - b.gap);
    Site.dotplot("#dots", sen, {
      value: (r) => r.margin, value2: (r) => r.est, label: (r) => r.label + (r.note ? "*" : ""), W: 600, rowH: 22, left: 70,
      xDomain: [-50, 80], xFmt: (v) => (v > 0 ? "+" + v : v), xLabel: "Two-party margin, D minus R (points). Filled: legislative result. Open: estimated governor margin.",
      color: (r) => (r.winner === "D" ? Site.color.dem() : Site.color.rep()),
      tipHtml: (r) => `<b>${r.label}</b> ${r.cands.map((c) => c.name + " (" + c.party[0] + ")").join(" vs ")}<br>Legislative: ${F.margin(r.margin)}<br>Est. governor: ${F.margin(r.est)} (estimate)<br>Gap: ${F.marginSigned(r.gap)} pts${r.note ? "<br>" + r.note : ""}`,
      annotate: (svg, x, y, d) => {
        const med = d3.median(sen, (r) => r.gap);
        svg.append("text").attr("class", "annot").attr("x", x(10)).attr("y", y(sen.length - 1) + 4).text(`Median gap: ${Math.abs(med).toFixed(1)} points behind the top of the ticket`);
      },
    });
  }
})();
