/* Demographics page: small-multiple scatterplots of a selectable outcome against county characteristics. */
(function () {
  const OUTCOMES = {
    swing24: { label: "Swing, 2026 governor vs 2024 president (pts)", y: (c) => c.swing_vs_pres_2024, fmt: (v) => Site.fmt.marginSigned(v, 0), note: "Swing is the 2026 governor two-party margin minus the 2024 presidential two-party margin in the same county, in points. Every county is positive." },
    swing22: { label: "Swing, 2026 governor vs 2022 governor (pts)", y: (c) => c.swing_vs_gov_2022, fmt: (v) => Site.fmt.marginSigned(v, 0), note: "Swing is the 2026 governor two-party margin minus the 2022 governor two-party margin in the same county, in points." },
    ret24: { label: "2026 governor votes as % of 2024 presidential votes", y: (c) => c.votes_vs_2024_pct, fmt: (v) => v + "%", note: "Retention is total votes cast for governor in 2026 divided by total votes cast for president in 2024 in the same county. The 2026 count is unofficial and still rising." },
    gov26: { label: "2026 governor two-party margin (pts)", y: (c) => c.gov_2026.margin, fmt: (v) => Site.fmt.marginSigned(v, 0), note: "Two-party margin: 100 × (D − R) / (D + R). Positive is Democratic." },
  };
  const XVARS = [
    { k: "ba", label: "Adults 25+ with a bachelor's degree or more", x: (c) => c.acs.ba_plus_share, fmt: (v) => v + "%" },
    { k: "inc", label: "Median household income (log scale)", x: (c) => Math.log10(c.acs.median_hh_income), fmt: (v) => "$" + Math.round(Math.pow(10, v) / 1000) + "k", ticks: [Math.log10(50000), Math.log10(60000), Math.log10(75000), Math.log10(100000), Math.log10(125000)] },
    { k: "age65", label: "Adults who are 65 or older", x: (c) => c.acs.age_65plus_share_of_adults, fmt: (v) => v + "%" },
    { k: "hisp", label: "Hispanic or Latino residents", x: (c) => c.acs.hispanic_share, fmt: (v) => v + "%" },
    { k: "fb", label: "Foreign-born residents", x: (c) => c.acs.foreign_born_share, fmt: (v) => v + "%" },
    { k: "white", label: "White, non-Hispanic residents", x: (c) => c.acs.white_nh_share, fmt: (v) => v + "%" },
    { k: "dens", label: "Residents per square mile (log scale)", x: (c) => Math.log10(c.pop_density_per_sqmi), fmt: (v) => d3.format(",")(Math.round(Math.pow(10, v))), ticks: [1, 2, 3, 4] },
    { k: "y1829", label: "Residents aged 18 to 29", x: (c) => c.acs.age_18_29_share, fmt: (v) => v + "%" },
  ];
  let counties, meta, outcome = "swing24";

  function corr(xs, ys, ws) {
    const W = ws ? d3.sum(ws) : xs.length, w = (i) => (ws ? ws[i] : 1);
    const mx = d3.sum(xs.map((x, i) => x * w(i))) / W, my = d3.sum(ys.map((y, i) => y * w(i))) / W;
    let sxy = 0, sxx = 0, syy = 0;
    xs.forEach((x, i) => { sxy += w(i) * (x - mx) * (ys[i] - my); sxx += w(i) * (x - mx) ** 2; syy += w(i) * (ys[i] - my) ** 2; });
    return sxy / Math.sqrt(sxx * syy);
  }
  const fr = (r) => (r >= 0 ? "+" : "−") + Math.abs(r).toFixed(2);

  function draw() {
    const O = OUTCOMES[outcome];
    const wrap = document.getElementById("panels");
    wrap.innerHTML = "";
    const data = counties.filter((c) => c.acs && O.y(c) != null);
    const rScale = d3.scaleSqrt().domain([0, d3.max(data, (c) => c.pres_2024.t)]).range([2.5, 16]);
    XVARS.forEach((X, idx) => {
      const fig = document.createElement("figure");
      const id = "p-" + X.k;
      const xs = data.map(X.x), ys = data.map(O.y), ws = data.map((c) => c.pres_2024.t);
      const r = corr(xs, ys), rw = corr(xs, ys, ws);
      fig.innerHTML = `<p class="headline">${X.label}</p><div class="chart" id="${id}"></div><figcaption>r = ${fr(r)}, r<sub>w</sub> = ${fr(rw)}, n = ${data.length} counties.</figcaption>`;
      wrap.appendChild(fig);
      const isMostTelling = (outcome === "swing24" && X.k === "ba") || (outcome === "swing22" && X.k === "hisp") || (outcome === "ret24" && X.k === "ba") || (outcome === "gov26" && X.k === "dens");
      Site.scatter("#" + id, data, {
        W: 440, H: 320,
        x: X.x, y: O.y, weight: (c) => c.pres_2024.t,
        r: (c) => rScale(c.pres_2024.t),
        color: () => Site.color.purple(),
        label: (c) => Site.fmt.county(c.county),
        xLabel: X.label, yLabel: O.label,
        xFmt: X.fmt, yFmt: O.fmt,
        nLabels: 4,
        tipHtml: (c) => `<b>${Site.fmt.county(c.county)}</b><br>${X.label}: ${X.fmt(X.x(c))}<br>${O.label}: ${O.fmt(O.y(c))}<br>2024 votes: ${Site.fmt.int(c.pres_2024.t)}`,
        annotate: isMostTelling ? (svg, g, x, y, fit, dims) => {
          const txt = {
            swing24: "Fit is nearly flat: the swing did not depend on education.",
            swing22: "Latino-heavy Lehigh Valley and Pocono counties moved most since 2022.",
            ret24: "More graduates, more of the 2024 vote came back.",
            gov26: "The density divide is unchanged.",
          }[outcome];
          svg.append("text").attr("class", "annot").attr("x", dims.m.l + 6).attr("y", dims.m.t + 14).text(txt);
        } : null,
      });
      if (X.ticks) {
        // relabel the x axis with human ticks for log axes
        const sv = d3.select("#" + id + " svg");
        const ax = sv.select(".axis");
        const xsc = d3.scaleLinear().domain(d3.extent(xs)).nice().range([52, 440 - 20]);
        ax.call(d3.axisBottom(xsc).tickValues(X.ticks.filter((t) => t >= xsc.domain()[0] && t <= xsc.domain()[1])).tickFormat(X.fmt).tickSize(-(320 - 20 - 44))).call((a) => a.selectAll("line").attr("class", "gridline")).call((a) => a.select(".domain").remove());
      }
    });
    document.getElementById("panel-note").textContent = O.note + " Points are counties; dot area is proportional to 2024 presidential votes. The dashed line is a least-squares fit weighted by those votes. Labels mark the counties furthest from the line.";
    // fill inline r values
    const put = (id, X, oKey) => { const el = document.getElementById(id); if (!el) return; const xs = counties.map(X), ys = counties.map(OUTCOMES[oKey].y); el.textContent = fr(corr(xs, ys)); };
    put("r-swing24-ba", (c) => c.acs.ba_plus_share, "swing24");
    put("r-swing24-dens", (c) => Math.log10(c.pop_density_per_sqmi), "swing24");
    put("r-swing22-hisp", (c) => c.acs.hispanic_share, "swing22");
    put("r-ret24-ba", (c) => c.acs.ba_plus_share, "ret24");
    put("r-gov26-ba", (c) => c.acs.ba_plus_share, "gov26");
  }

  Site.load(["meta", "summary", "counties"]).then(([m, s, c]) => {
    meta = m; counties = c.filter((x) => x.acs);
    Site.chrome(meta);
    document.querySelectorAll("#outcome button").forEach((b) => b.addEventListener("click", () => {
      document.querySelectorAll("#outcome button").forEach((x) => x.classList.remove("on"));
      b.classList.add("on"); outcome = b.dataset.k; draw();
    }));
    draw();
    window.addEventListener("themechange", draw);
  }).catch((e) => { document.getElementById("panels").innerHTML = `<p class="note">Could not load data (${e.message}).</p>`; });
})();
