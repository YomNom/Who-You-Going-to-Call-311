Promise.all([
  d3.csv("data/cincinnati_311_2022_cleaned.csv"),
  d3.json("data/cincinnati.geojson"),
])
  .then(([data, geojson]) => {
    console.log("Total 311 records loaded:", data.length);

    const potholeTypes = new Set(["PTHOLE", "POTHPARK"]);
    const filtered = data.filter((d) => potholeTypes.has(d.SR_TYPE));
    console.log("Pothole requests:", filtered.length);

    const counts = d3.rollup(
      filtered,
      (v) => v.length,
      (d) => d.NEIGHBORHOOD.trim().toUpperCase(),
    );

    leafletMap = new LeafletMap(
      { parentElement: "my-map" },
      geojson,
      counts
    );

    const methodCounts = d3.rollup(
      data,
      (v) => v.length,
      (d) => d.METHOD_RECEIVED,
    );
    const methodData = Array.from(methodCounts, ([method, count]) => ({
      method,
      count,
    })).sort((a, b) => b.count - a.count);
    
    lollipopChart = new LollipopChart(
      { parentElement: "lollipop-chart" },
      methodData
    );

    const priorityOrder = ['Standard', 'Priority', 'Hazardous', 'Emergency'];
    const priorityLabelLookup = new Map(priorityOrder.map((p) => [p.toUpperCase(), p]));

    const priorityCounts = d3.rollup(
      filtered,
      (v) => v.length,
      (d) => {
        const raw = (d.PRIORITY ?? '').trim();
        const normalized = priorityLabelLookup.get(raw.toUpperCase());
        return normalized || raw;
      },
    );

    // Keep expected categories in fixed order, even when count is zero.
    const priorityData = priorityOrder.map((priority) => ({
      priority,
      count: priorityCounts.get(priority) ?? 0,
    }));

    const colorScale = d3.scaleOrdinal()
        .range(['#eee1cd', '#ca9f5f', '#c77203', '#8b4300'])
        .domain(priorityOrder);
    barchartPriority = new barchartPriority({ 
      parentElement: "barchart-priority" ,
      colorScale: colorScale
    }, priorityData);

    const deptCounts = d3.rollup(
      filtered,
      (v) => v.length,
      (d) => d.DEPT_NAME.trim(),
    );
    const deptData = Array.from(deptCounts, ([department, count]) => ({
      department,
      count,
    })).sort((a, b) => b.count - a.count);
    donutChart = new DonutChart({ parentElement: "donut-chart" }, deptData);
  })
  .catch((error) => console.error(error));