// js/yearlyChart.js
(async function () {
  const data = await d3.csv("data/clean-FDA-ai-ml-enabled-devices.csv");

  const approvalsByYear = d3.rollup(
    data,
    v => v.length,
    d => +d.approval_year
  );

  const approvals = Array.from(approvalsByYear, ([year, count]) => ({ year, count }))
    .sort((a, b) => d3.ascending(a.year, b.year));

  const margin = { top: 30, right: 30, bottom: 60, left: 70 };
  const width = 960 - margin.left - margin.right;
  const height = 420 - margin.top - margin.bottom;

  const container = d3.select("#yearly-chart");
  const svg = container.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain(d3.extent(approvals, d => d.year))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(approvals, d => d.count)]).nice()
    .range([height, 0]);

  const area = d3.area()
    .x(d => x(d.year))
    .y0(height)
    .y1(d => y(d.count));

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.count));

  g.append("path")
    .datum(approvals)
    .attr("fill", "#dbeafe")
    .attr("d", area);

  g.append("path")
    .datum(approvals)
    .attr("fill", "none")
    .attr("stroke", "#2563eb")
    .attr("stroke-width", 2)
    .attr("d", line);

  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  g.append("g").call(d3.axisLeft(y));

  // Tooltip
  const tooltip = container.append("div").attr("class", "tooltip");
  const focus = g.append("g").style("display", "none");

  focus.append("circle")
    .attr("r", 4)
    .attr("fill", "#2563eb");

  focus.append("line")
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", "#9ca3af")
    .attr("stroke-dasharray", "3,3");

  const overlay = g.append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "none")
    .style("pointer-events", "all");

  const bisectYear = d3.bisector(d => d.year).center;

  overlay
    .on("mouseover", () => {
      focus.style("display", null);
      tooltip.style("opacity", 1);
    })
    .on("mouseout", () => {
      focus.style("display", "none");
      tooltip.style("opacity", 0);
    })
    .on("mousemove", function (event) {
      const [mx] = d3.pointer(event, this);
      const yearHover = x.invert(mx);
      const i = bisectYear(approvals, yearHover);
      const d0 = approvals[i];

      const cx = x(d0.year);
      const cy = y(d0.count);

      focus.attr("transform", `translate(${cx},${cy})`);
      tooltip
        .html(`<strong>${d0.year}</strong><br/>Approvals: ${d0.count}`)
        .style("left", (d3.pointer(event)[0] + 40) + "px")
        .style("top", (d3.pointer(event)[1] + 40) + "px");
    });
})();
