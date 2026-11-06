/* Shared helpers for the post-election site. Vanilla JS + D3 v7. No build step. */
(function () {
  const S = (window.Site = {});
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  S.color = { dem: () => css("--dem"), rep: () => css("--rep"), tie: () => css("--tie"), purple: () => css("--purple"), muted: () => css("--muted"), fg: () => css("--fg"), line: () => css("--line"), bg: () => css("--bg") };
  S.partyColor = (m) => (m == null ? S.color.tie() : m > 0 ? S.color.dem() : m < 0 ? S.color.rep() : S.color.tie());

  // Diverging color for a margin in points: blue for D, red for R, pale near zero. Capped at |cap|.
  S.marginScale = function (cap) {
    cap = cap || 40;
    return function (m) {
      if (m == null || isNaN(m)) return S.color.line();
      const t = Math.max(-1, Math.min(1, m / cap));
      const base = t > 0 ? d3.color(S.color.dem()) : d3.color(S.color.rep());
      return d3.interpolateRgb(S.color.bg(), base)(0.15 + 0.85 * Math.abs(t));
    };
  };

  S.fmt = {
    margin: (m, digits) => (m == null ? "n/a" : (m > 0 ? "D +" : m < 0 ? "R +" : "Even ") + Math.abs(m).toFixed(digits == null ? 1 : digits)),
    marginSigned: (m, digits) => (m == null ? "n/a" : (m > 0 ? "+" : "") + m.toFixed(digits == null ? 1 : digits)),
    pct: (x, digits) => (x == null ? "n/a" : x.toFixed(digits == null ? 1 : digits) + "%"),
    int: (n) => (n == null ? "n/a" : d3.format(",")(n)),
    seat: (k) => (k[0] === "S" ? "SD-" : "HD-") + k.slice(1),
    county: (c) => c.charAt(0) + c.slice(1).toLowerCase().replace(/mckean/i, "McKean"),
    prob: (p) => (p == null ? "n/a" : Math.round(p * 100) + "%"),
    time: (iso) => new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit", month: "short", day: "numeric" }),
  };

  S.load = (names) => Promise.all(names.map((n) => fetch("data/" + n + ".json").then((r) => { if (!r.ok) throw new Error(n); return r.json(); })));

  // Responsive SVG: fixed viewBox width, height from aspect; caller draws in [0,W]x[0,H].
  S.svg = function (container, W, H) {
    const el = typeof container === "string" ? document.querySelector(container) : container;
    el.innerHTML = "";
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img");
    return svg;
  };

  // Simple hover tooltip attached to a figure's .chart container.
  S.tooltip = function (container) {
    const el = typeof container === "string" ? document.querySelector(container) : container;
    let tip = el.querySelector(".tip");
    if (!tip) { tip = document.createElement("div"); tip.className = "tip"; el.appendChild(tip); }
    return {
      show(evt, html) {
        tip.innerHTML = html; tip.style.opacity = 1;
        const r = el.getBoundingClientRect();
        let x = evt.clientX - r.left + 12, y = evt.clientY - r.top + 12;
        if (x + 250 > r.width) x = evt.clientX - r.left - 250;
        tip.style.left = x + "px"; tip.style.top = y + "px";
      },
      hide() { tip.style.opacity = 0; },
    };
  };

  // Ordinary least squares fit; returns {slope, intercept, r, r2, n}
  S.ols = function (xs, ys) {
    const n = xs.length, mx = d3.mean(xs), my = d3.mean(ys);
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
    const slope = sxy / sxx, intercept = my - slope * mx, r = sxy / Math.sqrt(sxx * syy);
    return { slope, intercept, r, r2: r * r, n };
  };

  // Weighted OLS
  S.wols = function (xs, ys, ws) {
    const W = d3.sum(ws), mx = d3.sum(xs.map((x, i) => x * ws[i])) / W, my = d3.sum(ys.map((y, i) => y * ws[i])) / W;
    let sxy = 0, sxx = 0, syy = 0;
    xs.forEach((x, i) => { sxy += ws[i] * (x - mx) * (ys[i] - my); sxx += ws[i] * (x - mx) ** 2; syy += ws[i] * (ys[i] - my) ** 2; });
    const slope = sxy / sxx, intercept = my - slope * mx, r = sxy / Math.sqrt(sxx * syy);
    return { slope, intercept, r, r2: r * r, n: xs.length };
  };

  // Scatter with fitted line and labeled outliers. opts: {x, y, r, label, color, xLabel, yLabel, W, H, fit, nLabels, weight, xFmt, yFmt, tipHtml, annotate}
  S.scatter = function (container, data, o) {
    const W = o.W || 560, H = o.H || 400, m = { t: 20, r: 20, b: 44, l: 52 };
    const svg = S.svg(container, W, H);
    const xs = data.map(o.x), ys = data.map(o.y);
    const x = d3.scaleLinear().domain(o.xDomain || d3.extent(xs)).nice().range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain(o.yDomain || d3.extent(ys)).nice().range([H - m.b, m.t]);
    const g = svg.append("g");
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(6).tickFormat(o.xFmt || null).tickSize(-(H - m.t - m.b))).call((a) => a.selectAll("line").attr("class", "gridline")).call((a) => a.select(".domain").remove());
    g.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(6).tickFormat(o.yFmt || null).tickSize(-(W - m.l - m.r))).call((a) => a.selectAll("line").attr("class", "gridline")).call((a) => a.select(".domain").remove());
    if (y.domain()[0] < 0 && y.domain()[1] > 0) g.append("line").attr("class", "zero").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(0)).attr("y2", y(0));
    svg.append("text").attr("class", "label muted").attr("x", (m.l + W - m.r) / 2).attr("y", H - 8).attr("text-anchor", "middle").text(o.xLabel || "");
    svg.append("text").attr("class", "label muted").attr("transform", `translate(14,${(m.t + H - m.b) / 2}) rotate(-90)`).attr("text-anchor", "middle").text(o.yLabel || "");
    let fit = null;
    if (o.fit !== false && data.length > 2) {
      fit = o.weight ? S.wols(xs, ys, data.map(o.weight)) : S.ols(xs, ys);
      const [x0, x1] = x.domain();
      g.append("line").attr("class", "fit").attr("x1", x(x0)).attr("x2", x(x1)).attr("y1", y(fit.intercept + fit.slope * x0)).attr("y2", y(fit.intercept + fit.slope * x1));
    }
    const tip = S.tooltip(container);
    const rr = o.r || (() => 5);
    g.selectAll("circle").data(data).join("circle")
      .attr("cx", (d) => x(o.x(d))).attr("cy", (d) => y(o.y(d))).attr("r", rr)
      .attr("fill", o.color || (() => S.color.purple())).attr("fill-opacity", 0.75).attr("stroke", S.color.bg()).attr("stroke-width", 0.8)
      .on("mousemove", (e, d) => tip.show(e, o.tipHtml ? o.tipHtml(d) : o.label(d))).on("mouseleave", tip.hide);
    // label outliers: largest residuals from fit (or largest |y| if no fit), plus any in o.alwaysLabel
    const scored = data.map((d) => ({ d, s: fit ? Math.abs(o.y(d) - (fit.intercept + fit.slope * o.x(d))) : Math.abs(o.y(d)) }));
    scored.sort((a, b) => b.s - a.s);
    const n = o.nLabels == null ? 6 : o.nLabels;
    const lab = new Set(scored.slice(0, n).map((s) => s.d));
    (o.alwaysLabel || []).forEach((d) => lab.add(d));
    g.selectAll("text.pt").data([...lab]).join("text").attr("class", "label pt").attr("x", (d) => x(o.x(d)) + 7).attr("y", (d) => y(o.y(d)) + 4).text(o.label);
    if (o.annotate) o.annotate(svg, g, x, y, fit, { W, H, m });
    return { svg, x, y, fit };
  };

  // Horizontal dot plot: rows sorted by value, dot per row, optional second series. opts: {value, value2, label, color, W, rowH, xLabel, xDomain, tipHtml, zero}
  S.dotplot = function (container, data, o) {
    const rowH = o.rowH || 20, m = { t: 24, r: 20, b: 30, l: o.left || 90 }, W = o.W || 560, H = m.t + m.b + rowH * data.length;
    const svg = S.svg(container, W, H);
    const vals = data.flatMap((d) => [o.value(d), o.value2 ? o.value2(d) : null]).filter((v) => v != null);
    const x = d3.scaleLinear().domain(o.xDomain || d3.extent(vals)).nice().range([m.l, W - m.r]);
    const y = (i) => m.t + rowH * i + rowH / 2;
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${m.t - 6})`).call(d3.axisTop(x).ticks(6).tickFormat(o.xFmt || null).tickSize(-(H - m.t - m.b + 6))).call((a) => a.selectAll("line").attr("class", "gridline")).call((a) => a.select(".domain").remove());
    if (x.domain()[0] < 0 && x.domain()[1] > 0) svg.append("line").attr("class", "zero").attr("y1", m.t - 6).attr("y2", H - m.b).attr("x1", x(0)).attr("x2", x(0));
    const tip = S.tooltip(container);
    const rows = svg.selectAll("g.row").data(data).join("g").attr("class", "row").attr("transform", (d, i) => `translate(0,${y(i)})`);
    rows.append("text").attr("class", "label").attr("x", m.l - 8).attr("y", 4).attr("text-anchor", "end").text(o.label);
    if (o.value2) rows.append("line").attr("x1", (d) => x(o.value2(d))).attr("x2", (d) => x(o.value(d))).attr("stroke", S.color.muted()).attr("stroke-width", 1.2).attr("opacity", 0.7);
    if (o.value2) rows.append("circle").attr("cx", (d) => x(o.value2(d))).attr("r", 4).attr("fill", S.color.bg()).attr("stroke", (d) => (o.color2 ? o.color2(d) : S.color.muted())).attr("stroke-width", 1.5);
    rows.append("circle").attr("cx", (d) => x(o.value(d))).attr("r", 5).attr("fill", o.color || ((d) => S.partyColor(o.value(d))));
    rows.append("rect").attr("x", m.l).attr("y", -rowH / 2).attr("width", W - m.l - m.r).attr("height", rowH).attr("fill", "transparent")
      .on("mousemove", (e, d) => tip.show(e, o.tipHtml ? o.tipHtml(d) : o.label(d))).on("mouseleave", tip.hide);
    if (o.xLabel) svg.append("text").attr("class", "label muted").attr("x", (m.l + W - m.r) / 2).attr("y", H - 6).attr("text-anchor", "middle").text(o.xLabel);
    if (o.annotate) o.annotate(svg, x, y, { W, H, m });
    return { svg, x, y };
  };

  // Horizontal bar chart (diverging around zero if negative values). opts: {value, label, color, W, rowH, xFmt, xLabel, tipHtml}
  S.bars = function (container, data, o) {
    const rowH = o.rowH || 22, m = { t: 24, r: 50, b: 10, l: o.left || 120 }, W = o.W || 560, H = m.t + m.b + rowH * data.length;
    const svg = S.svg(container, W, H);
    const vals = data.map(o.value);
    const x = d3.scaleLinear().domain(o.xDomain || [Math.min(0, d3.min(vals)), Math.max(0, d3.max(vals))]).nice().range([m.l, W - m.r]);
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${m.t - 6})`).call(d3.axisTop(x).ticks(5).tickFormat(o.xFmt || null).tickSize(-(H - m.t - m.b + 6))).call((a) => a.selectAll("line").attr("class", "gridline")).call((a) => a.select(".domain").remove());
    const rows = svg.selectAll("g.row").data(data).join("g").attr("class", "row").attr("transform", (d, i) => `translate(0,${m.t + rowH * i})`);
    rows.append("text").attr("class", "label").attr("x", m.l - 8).attr("y", rowH / 2 + 4).attr("text-anchor", "end").text(o.label);
    rows.append("rect").attr("x", (d) => Math.min(x(0), x(o.value(d)))).attr("y", 3).attr("height", rowH - 6).attr("width", (d) => Math.abs(x(o.value(d)) - x(0))).attr("fill", o.color || ((d) => S.partyColor(o.value(d))));
    rows.append("text").attr("class", "label").attr("x", (d) => (o.value(d) >= 0 ? x(o.value(d)) + 5 : x(o.value(d)) - 5)).attr("text-anchor", (d) => (o.value(d) >= 0 ? "start" : "end")).attr("y", rowH / 2 + 4).text((d) => (o.valueFmt ? o.valueFmt(o.value(d)) : o.value(d)));
    if (x.domain()[0] < 0) svg.append("line").attr("class", "zero").attr("y1", m.t - 6).attr("y2", H - m.b).attr("x1", x(0)).attr("x2", x(0));
    if (o.tipHtml) { const tip = S.tooltip(container); rows.on("mousemove", (e, d) => tip.show(e, o.tipHtml(d))).on("mouseleave", tip.hide); }
    return { svg, x };
  };

  // Sortable table helper: table element with data-k on th and a rows array; render(fn) returns html per row.
  S.sortable = function (table, rows, render, defaultKey, desc) {
    const tbody = table.querySelector("tbody");
    let key = defaultKey, dir = desc ? -1 : 1;
    function draw() {
      const sorted = rows.slice().sort((a, b) => {
        const va = a[key], vb = b[key];
        if (va == null && vb == null) return 0; if (va == null) return 1; if (vb == null) return -1;
        return (typeof va === "number" ? va - vb : String(va).localeCompare(String(vb))) * dir;
      });
      tbody.innerHTML = sorted.map(render).join("");
      table.querySelectorAll("th").forEach((th) => { th.classList.toggle("sorted", th.dataset.k === key); th.classList.toggle("asc", th.dataset.k === key && dir === 1); });
    }
    table.querySelectorAll("th[data-k]").forEach((th) => { th.classList.add("sortable"); th.addEventListener("click", () => { if (key === th.dataset.k) dir = -dir; else { key = th.dataset.k; dir = typeof rows[0][key] === "number" ? -1 : 1; } draw(); }); });
    draw();
  };

  // Standard page chrome: data vintage line and the unofficial banner.
  S.chrome = function (meta) {
    const el = document.getElementById("vintage");
    if (el) {
      const rep = meta.statewide_reporting;
      el.innerHTML = `<span>Data: <b>${meta.geography_level}</b> level, unofficial</span><span>Source updated ${meta.legislative_source_time_local.replace(/\.\d+$/, "")} ET</span><span>${rep.precincts_reporting.toLocaleString()} of ${rep.precincts_total.toLocaleString()} precincts reporting in-person ballots (${rep.pct_precincts_reporting}%)</span>`;
    }
    const b = document.getElementById("banner");
    if (b) b.innerHTML = `All 2026 figures are <b>unofficial</b> county tallies published by the Pennsylvania Department of State and will change until counties certify. Provisional ballots were largely not yet counted when this page's data was built. ${meta.geography_note} <a href="methods.html">How to read this.</a>`;
  };

  // Theme toggle (optional button #theme)
  const t = document.getElementById("theme");
  if (t) t.addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = cur === "dark" ? "light" : "dark";
    try { localStorage.setItem("theme", document.documentElement.dataset.theme); } catch (e) {}
    window.dispatchEvent(new Event("themechange"));
  });
  try { const saved = localStorage.getItem("theme"); if (saved) document.documentElement.dataset.theme = saved; } catch (e) {}
})();
