// Load all data and initialize all visualizations
Promise.all([
  d3.csv("data/cincinnati_311_2022_cleaned.csv"),
  d3.json("data/cincinnati.geojson"),
])
  .then(([data, geojson]) => {
    console.log("Total 311 records loaded:", data.length);

    // --- Filter pothole data ---
    const potholeTypes = new Set(["PTHOLE", "POTHPARK"]);
    const filtered = data.filter((d) => potholeTypes.has(d.SR_TYPE));
    console.log("Pothole requests:", filtered.length);

    // Parse numeric/date fields
    filtered.forEach((d) => {
      d.LATITUDE = +d.LATITUDE;
      d.LONGITUDE = +d.LONGITUDE;
      d.RESPONSE_TIME_DAYS = +d.RESPONSE_TIME_DAYS;
      d.hasCoords =
        !isNaN(d.LATITUDE) &&
        !isNaN(d.LONGITUDE) &&
        d.LATITUDE !== 0 &&
        d.LONGITUDE !== 0;
    });

    // --- Point map (potholeMap.js) ---
    const { leafletMap, mappedData } = initPotholeMap(filtered);

    const counts = d3.rollup(
      filtered,
      (v) => v.length,
      (d) => d.NEIGHBORHOOD.trim().toUpperCase(),
    );

    const choroplethMap = new ChoroplethMap(
      { parentElement: "choropleth-map" },
      geojson,
      counts,
    );

    // --- Lollipop chart (request methods) ---
    const methodCounts = d3.rollup(
      data,
      (v) => v.length,
      (d) => d.METHOD_RECEIVED,
    );
    const methodData = Array.from(methodCounts, ([method, count]) => ({
      method,
      count,
    })).sort((a, b) => b.count - a.count);

    const lollipopChart = new LollipopChart(
      { parentElement: "lollipop-chart" },
      methodData,
    );

    // --- Bar chart (priority breakdown) ---
    const priorityOrder = ["Standard", "Priority", "Hazardous", "Emergency"];
    const priorityLabelLookup = new Map(
      priorityOrder.map((p) => [p.toUpperCase(), p]),
    );

    const priorityCounts = d3.rollup(
      filtered,
      (v) => v.length,
      (d) => {
        const raw = (d.PRIORITY ?? "").trim();
        const normalized = priorityLabelLookup.get(raw.toUpperCase());
        return normalized || raw;
      },
    );

    const priorityData = priorityOrder.map((priority) => ({
      priority,
      count: priorityCounts.get(priority) ?? 0,
    }));

    const colorScale = d3
      .scaleOrdinal()
      .range(["#eee1cd", "#ca9f5f", "#c77203", "#8b4300"])
      .domain(priorityOrder);

    const barChart = new barchartPriority(
      {
        parentElement: "barchart-priority",
        colorScale: colorScale,
      },
      priorityData,
    );

    // --- Donut chart (department breakdown) ---
    const deptCounts = d3.rollup(
      filtered,
      (v) => v.length,
      (d) => d.DEPT_NAME.trim(),
    );
    const deptData = Array.from(deptCounts, ([department, count]) => ({
      department,
      count,
    })).sort((a, b) => b.count - a.count);

    const donutChart = new DonutChart(
      { parentElement: "donut-chart" },
      deptData,
    );
  })
  .catch((error) => console.error("Error loading data:", error));
