/* Swing map: county choropleth and ranked bars. Data: meta, summary, counties, pa_counties.geojson */
(function () {
  const F = Site.fmt;
  const modes = {
    s24: { label: "Swing, 2024 president to 2026 governor", value: (c) => c.swing_vs_pres_2024, fmt: (v) => F.marginSigned(v, 1) + " pts", seq: true },
    s22: { label: "Swing, 2022 governor to 2026 governor", value: (c) => c.swing_vs_gov_2022, fmt: (v) => F.marginSigned(v, 1) + " pts", seq: false, cap: 15 },
    m26: { label: "2026 governor two-party margin", value: (c) => c.gov_2026.margin, fmt: (v) => F.margin(v, 1), seq: false, cap: 60 },
  };
  let mode = "s24", data, geo, summary;

  Promise.all([Site.load(["meta", "summary", "counties"]), fetch("data/pa_counties.geojson").then((r) => r.json())]).then(([[meta, sum, counties], gj]) => {
    Site.chrome(meta);
    summary = sum; data = counties; geo = gj;
    fill();
    draw();
    document.querySelectorAll("#map-toggle button").forEach((b) => b.addEventListener("click", () => {
      mode = b.dataset.k;
      document.querySelectorAll("#map-toggle button").forEach((x) => x.classList.toggle("on", x === b));
      draw();
    }));
    window.addEventListener("themechange", draw);
  });

  function fill() {
    const cs = summary.county_swing;
    const byVal = data.slice().sort((a, b) => a.swing_vs_pres_2024 - b.swing_vs_pres_2024);
    document.getElementById("mean24").textContent = cs.vs_pres_2024.mean.toFixed(1);
    document.getElementById("minc").textContent = `${F.county(byVal[0].county)} (+${byVal[0].swing_vs_pres_2024.toFixed(1)})`;
    document.getElementById("maxc").textContent = `${F.county(byVal[byVal.length - 1].county)} (+${byVal[byVal.length - 1].swing_vs_pres_2024.toFixed(1)})`;
    // east/west of 77 W, vote-weighted swing vs 2022
    const w = (sel, k) => d3.sum(sel, (c) => c[k] * c.gov_2026.t) / d3.sum(sel, (c) => c.gov_2026.t);
    document.getElementById("g-east22").textContent = w(data.filter((c) => c.lon > -77), "swing_vs_gov_2022").toFixed(1);
    document.getElementById("g-west22").textContent = w(data.filter((c) => c.lon <= -77), "swing_vs_gov_2022").toFixed(1);
    const g = (name) => summary.county_groups.find((x) => x.group === name);
    document.getElementById("sw22").textContent = g("Southwest outside Allegheny").swing_vs_gov_2022.toFixed(1);
    document.getElementById("ne22").textContent = g("Northeast").swing_vs_gov_2022.toFixed(1);
    const tb = document.querySelector("#groups tbody");
    tb.innerHTML = summary.county_groups.slice().sort((a, b) => b.swing_vs_pres_2024 - a.swing_vs_pres_2024).map((x) =>
      `<tr><td>${x.group}</td><td class="num">${F.marginSigned(x.swing_vs_pres_2024)}</td><td class="num">${F.marginSigned(x.swing_vs_gov_2022)}</td><td class="num" style="color:${Site.partyColor(x.gov_2026_margin)}">${F.margin(x.gov_2026_margin)}</td><td class="num hide-sm" style="color:${Site.partyColor(x.pres_2024_margin)}">${F.margin(x.pres_2024_margin)}</td></tr>`).join("");
  }

  function draw() {
    drawMap();
    drawBars();
  }

  function drawMap() {
    const m = modes[mode];
    const byName = new Map(data.map((c) => [c.county, c]));
    const W = 900, H = 560;
    const svg = Site.svg("#map", W, H);
    const proj = d3.geoConicConformal().parallels([40.2, 41.6]).rotate([77.75, 0]).fitExtent([[10, 10], [W - 10, H - 40]], geo);
    const path = d3.geoPath(proj);
    const vals = data.map(m.value);
    let color;
    if (m.seq) {
      const dem = d3.color(Site.color.dem());
      const sc = d3.scaleLinear().domain(d3.extent(vals)).range([0.15, 1]);
      color = (v) => d3.interpolateRgb(Site.color.bg(), dem)(sc(v));
    } else {
      color = Site.marginScale(m.cap);
    }
    const tip = Site.tooltip("#map");
    svg.append("g").selectAll("path").data(geo.features).join("path")
      .attr("d", path)
      .attr("fill", (f) => { const c = byName.get(f.properties.name); return c ? color(m.value(c)) : Site.color.line(); })
      .attr("stroke", Site.color.bg()).attr("stroke-width", 0.8)
      .on("mousemove", (e, f) => {
        const c = byName.get(f.properties.name); if (!c) return;
        tip.show(e, `<b>${F.county(c.county)}</b><br>2024 president: ${F.margin(c.pres_2024.margin)}<br>2022 governor: ${F.margin(c.gov_2022.margin)}<br>2026 governor: ${F.margin(c.gov_2026.margin)}<br>Swing vs 2024: ${F.marginSigned(c.swing_vs_pres_2024)} pts<br>Swing vs 2022: ${F.marginSigned(c.swing_vs_gov_2022)} pts<br>Votes 2026: ${F.int(c.gov_2026.t)} (unofficial)`);
      }).on("mouseleave", tip.hide);
    // direct labels: biggest and smallest movers (by current mode), plus the big three
    const sorted = data.slice().sort((a, b) => m.value(a) - m.value(b));
    const lab = new Set([...sorted.slice(0, 3), ...sorted.slice(-4), byName.get("PHILADELPHIA"), byName.get("ALLEGHENY")]);
    svg.append("g").selectAll("text").data([...lab]).join("text").attr("class", "label")
      .attr("x", (c) => proj([c.lon, c.lat])[0]).attr("y", (c) => proj([c.lon, c.lat])[1] + 4).attr("text-anchor", "middle")
      .style("font-size", "11px").style("paint-order", "stroke").style("stroke", Site.color.bg()).style("stroke-width", "3px")
      .text((c) => `${F.county(c.county)} ${m.fmt(m.value(c))}`);
    // one annotation
    const nR = data.filter((c) => c.swing_vs_gov_2022 < 0).length;
    const ann = mode === "s24" ? `Every county moved toward Democrats; mean +${summary.county_swing.vs_pres_2024.mean.toFixed(1)} points`
      : mode === "s22" ? `Against 2022, ${nR} ${nR === 1 ? "county" : "counties"} moved toward Republicans; mean +${summary.county_swing.vs_gov_2022.mean.toFixed(1)}`
      : `Statewide two-party margin: ${F.margin(summary.governor.statewide.margin)} (unofficial)`;
    svg.append("text").attr("class", "annot").attr("x", 12).attr("y", H - 14).text(ann);
    // legend
    const lg = document.getElementById("map-legend");
    const stops = m.seq ? d3.range(5).map((i) => d3.quantile(vals, i / 4)) : d3.range(-m.cap, m.cap + 1, m.cap / 2);
    lg.innerHTML = `<span>${m.label}:</span>` + stops.map((v) => `<span><i class="sq" style="background:${color(v)}"></i>${m.fmt(v)}</span>`).join("");
    document.getElementById("map-headline").style.display = mode === "s24" ? "" : "none";
  }

  function drawBars() {
    const m = modes[mode === "m26" ? "s24" : mode];
    document.querySelectorAll(".bars-ref").forEach((e) => (e.textContent = mode === "s22" ? "vs 2022 governor" : "vs 2024 president"));
    const sorted = data.slice().sort((a, b) => m.value(b) - m.value(a));
    const opts = (ref) => ({
      value: m.value, label: (c) => F.county(c.county), W: 420, rowH: 24, left: 110,
      valueFmt: (v) => F.marginSigned(v, 1), xFmt: (v) => (v > 0 ? "+" : "") + v,
      color: (c) => (m.value(c) >= 0 ? Site.color.dem() : Site.color.rep()),
      tipHtml: (c) => `<b>${F.county(c.county)}</b><br>${ref}: ${F.margin(mode === "s22" ? c.gov_2022.margin : c.pres_2024.margin)}<br>2026 governor: ${F.margin(c.gov_2026.margin)}<br>Swing: ${F.marginSigned(m.value(c))} pts`,
    });
    const ref = mode === "s22" ? "2022 governor" : "2024 president";
    const dom = [Math.min(0, d3.min(data, m.value)), d3.max(data, m.value)];
    Site.bars("#bars-top", sorted.slice(0, 10), Object.assign(opts(ref), { xDomain: dom }));
    Site.bars("#bars-bottom", sorted.slice(-10).reverse(), Object.assign(opts(ref), { xDomain: dom }));
  }
})();
