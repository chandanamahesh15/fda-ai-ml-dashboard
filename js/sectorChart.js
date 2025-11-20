// js/sectorChart.js
(async function () {
  const data = await d3.csv("data/clean-ramp-sector-ai-index.csv");

  // Parse date + convert percentages to numbers
  const parseDate = d3.timeParse("%Y-%m-%d");  // adjust if your Date format differs
  data.forEach(d => {
    d.Date = parseDate(d.Date);
    for (const key in d) {
      if (key !== "Date") d[key] = +d[key];
    }
  });

  const sectors = data.columns.filter(c => c !== "Date");

  // One series per sector
  const series = sectors.map(sector => ({
    sector,
    values: data.map(d => ({ Date: d.Date, value: d[sector] }))
  }));

  const margin = { top: 40, right: 40, bottom: 60, left: 70 };
  const width  = 960 - margin.left - margin.right;
  const height = 420 - margin.top - margin.bottom;

  const container = d3.select("#sector-chart");
  const svg = container.append("svg")
    .attr("width",  width  + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleTime()
    .domain(d3.extent(data, d => d.Date))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([
      0,
      d3.max(series, s => d3.max(s.values, v => v.value))
    ]).nice()
    .range([height, 0]);

  const color = d3.scaleOrdinal()
    .domain(sectors)
    .range(d3.schemeTableau10.concat(d3.schemeSet3)); // lots of colors

  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%Y-%m")));

  g.append("g").call(d3.axisLeft(y));

  const line = d3.line()
    .x(d => x(d.Date))
    .y(d => y(d.value));

  // ----- Draw lines -----
  const sectorGroups = g.selectAll(".sector-line")
    .data(series)
    .enter()
    .append("g")
    .attr("class", "sector-line");

  const paths = sectorGroups.append("path")
    .attr("class", "sector-path")
    .attr("fill", "none")
    .attr("stroke", d => color(d.sector))
    .attr("stroke-width", 1.8)
    .attr("d", d => line(d.values))
    .attr("opacity", 0.9);

  // Map sector -> path
  const sectorPathMap = {};
  sectorGroups.each(function (d) {
    sectorPathMap[d.sector] = d3.select(this).select("path");
  });

  // ===== HTML legend (full, multi-row) =====
  const legendContainer = d3.select("#sector-legend");
  const legendItems = legendContainer.selectAll(".legend-item")
    .data(sectors)
    .enter()
    .append("div")
    .attr("class", "legend-item");

  legendItems.append("span")
    .attr("class", "legend-color")
    .style("background-color", d => color(d));

  legendItems.append("span")
    .attr("class", "legend-label")
    .text(d => d);

  // ===== Single-sector highlight logic =====
  let selectedSector = null;

  function updateHighlight() {
    if (!selectedSector) {
      // No selection: all lines visible
      paths
        .transition().duration(250)
        .attr("opacity", 0.9)
        .attr("stroke-width", 1.8);

      legendItems.classed("active-sector", false);
      return;
    }

    paths
      .transition().duration(250)
      .attr("opacity", d => d.sector === selectedSector ? 1.0 : 0.15)
      .attr("stroke-width", d => d.sector === selectedSector ? 2.8 : 1.2);

    legendItems.classed("active-sector", d => d === selectedSector);
  }

  legendItems.on("click", (event, sector) => {
    // If same sector clicked, clear selection
    selectedSector = (selectedSector === sector) ? null : sector;
    updateHighlight();
  });

  // ===== Tooltip with vertical rule =====
  const tooltip = container.append("div").attr("class", "tooltip");

  const focusLine = g.append("line")
    .attr("stroke", "#9ca3af")
    .attr("stroke-dasharray", "3,3")
    .style("display", "none");

  const overlay = g.append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "none")
    .style("pointer-events", "all");

  overlay
    .on("mouseover", () => {
      focusLine.style("display", null);
      tooltip.style("opacity", 1);
    })
    .on("mouseout", () => {
      focusLine.style("display", "none");
      tooltip.style("opacity", 0);
    })
    .on("mousemove", function (event) {
      const [mx] = d3.pointer(event, this);
      const dateHover = x.invert(mx);
      const dateFormatter = d3.timeFormat("%Y-%m-%d");

      // If a sector is selected, only show that one in tooltip;
      // otherwise show top few sectors at this date.
      const rows = [];

      if (selectedSector) {
        const s = series.find(d => d.sector === selectedSector);
        if (s) {
          const i = d3.bisector(d => d.Date).center(s.values, dateHover);
          const p = s.values[i];
          rows.push({ sector: s.sector, value: p.value });
        }
      } else {
        series.forEach(s => {
          const i = d3.bisector(d => d.Date).center(s.values, dateHover);
          const p = s.values[i];
          rows.push({ sector: s.sector, value: p.value });
        });
      }

      if (!rows.length) return;

      const xPos = x(dateHover);
      focusLine
        .attr("x1", xPos)
        .attr("x2", xPos)
        .attr("y1", 0)
        .attr("y2", height);

      rows.sort((a, b) => d3.descending(a.value, b.value));
      const top = rows.slice(0, selectedSector ? 1 : 6);

      tooltip
        .html(
          `<strong>${dateFormatter(dateHover)}</strong><br>` +
          top.map(r => `${r.sector}: ${r.value.toFixed(1)}%`).join("<br>")
        )
        .style("left", (d3.pointer(event)[0] + 40) + "px")
        .style("top", (d3.pointer(event)[1] + 40) + "px");
    });
})();
