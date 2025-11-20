// js/specialtyChart.js
(async function () {
  const data = await d3.csv("data/clean-FDA-ai-ml-enabled-devices.csv");

  // Count devices per specialty, cleaning leading/trailing spaces
  const countsMap = d3.rollup(
    data,
    v => v.length,
    d => (d.medical_specialty || "Unknown").trim()
  );

  const specialtyData = Array.from(countsMap, ([specialty, count]) => ({ specialty, count }));

  const container = d3.select("#specialty-chart");
  const margin = { top: 20, right: 40, bottom: 60, left: 220 };
  const width = 960 - margin.left - margin.right;
  const height = 480 - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Scales
  const x = d3.scaleLinear()
    .domain([0, d3.max(specialtyData, d => d.count)]).nice()
    .range([0, width]);

  const y = d3.scaleBand()
    .range([0, height])
    .padding(0.2);

  const yAxis = g.append("g").attr("class", "y-axis");
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  const tooltip = container.append("div").attr("class", "tooltip");

  // Helper to get sorted copy
  function getSortedData(mode) {
    const sorted = specialtyData.slice();
    if (mode === "name") {
      sorted.sort((a, b) => {
        const nameA = a.specialty.trim().toLowerCase();
        const nameB = b.specialty.trim().toLowerCase();
        return d3.ascending(nameA, nameB);
      });
    } else { // "count" (desc)
      sorted.sort((a, b) => d3.descending(a.count, b.count));
    }
    return sorted;
  }

  let currentMode = "count";
  let sortedData = getSortedData(currentMode);

  y.domain(sortedData.map(d => d.specialty));
  yAxis.call(d3.axisLeft(y));

  let bars = g.selectAll(".bar")
    .data(sortedData, d => d.specialty)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("y", d => y(d.specialty))
    .attr("x", 0)
    .attr("height", y.bandwidth())
    .attr("width", d => x(d.count))
    .attr("fill", "#2563eb")
    .on("mouseover", function (event, d) {
      d3.select(this).attr("fill", "#1d4ed8");
      tooltip
        .style("opacity", 1)
        .html(`<strong>${d.specialty}</strong><br/>Devices: ${d.count}`);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", (d3.pointer(event)[0] + 40) + "px")
        .style("top", (d3.pointer(event)[1] + 40) + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("fill", "#2563eb");
      tooltip.style("opacity", 0);
    });

  function updateChart(mode) {
    currentMode = mode;
    sortedData = getSortedData(mode);

    y.domain(sortedData.map(d => d.specialty));

    bars = g.selectAll(".bar")
      .data(sortedData, d => d.specialty);

    bars.transition()
      .duration(600)
      .attr("y", d => y(d.specialty))
      .attr("height", y.bandwidth());

    yAxis.transition()
      .duration(600)
      .call(d3.axisLeft(y));
  }

  // Wire up buttons
  const buttons = document.querySelectorAll(".sort-button");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.sort; // "count" or "name"
      buttons.forEach(b => b.classList.toggle("active", b === btn));
      updateChart(mode);
    });
  });

  // Initial state: Count (desc)
  updateChart("count");
})();
