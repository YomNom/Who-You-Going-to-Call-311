let leafletMap,
  choroplethMap,
  lollipopChart,
  barchartChart,
  donutChart,
  timelineChart,
  wordCloudChart;
let _displayedData = [];
let _fullBulkyData = []; // for word cloud

function updateKPIs(records) { 
  const total = records.length;
  const withResponse = records.filter(
    (d) => !isNaN(d.RESPONSE_TIME_DAYS) && d.RESPONSE_TIME_DAYS >= 0,
  );
  const avgResponse =
    withResponse.length > 0
      ? d3.mean(withResponse, (d) => d.RESPONSE_TIME_DAYS).toFixed(1)
      : "—";
  const neighborhoods = new Set(
    records.map((d) => (d.NEIGHBORHOOD ?? "").trim()).filter((n) => n),
  ).size;

  document.getElementById("kpi-total").textContent = total.toLocaleString();
  document.getElementById("kpi-avg-response").textContent = avgResponse;
  document.getElementById("kpi-neighborhoods").textContent = neighborhoods;
}

// Global filter handler
window.onDashboardFilter = function (field, value) {
  const filtered =
    field === null
      ? _displayedData
      : _displayedData.filter(
          (d) => (d[field] ?? "").trim().toUpperCase() === value.toUpperCase(),
        );

  updateKPIs(filtered);
  if (leafletMap) leafletMap.filterData(filtered);
  if (choroplethMap) choroplethMap.filterData(filtered);
  if (lollipopChart) lollipopChart.filterData(filtered);
  if (barchartChart) barchartChart.filterData(filtered);
  if (donutChart) donutChart.filterData(filtered);
  if (timelineChart) timelineChart.filterData(filtered);
};

// Load all data
Promise.all([
  d3.csv("data/cincinnati_311_2022_cleaned.csv"),
  d3.json("data/cincinnati.geojson"),
])
  .then(([data, geojson]) => {

    // ------------- Checkboxes ------------ //
    // Make sure all data options are selected by default.
    const checkboxes = Array.from(document.querySelectorAll('input[name="data-select"]'));
    checkboxes.forEach(cb => cb.checked = true);

    // Re-render when any data checkbox changes
    checkboxes.forEach(cb => cb.addEventListener('change', () => renderGraphs(data, geojson)));

    const selectAllButton = document.querySelector('#select-all-data');
    const clearSelectionButton = document.querySelector('#clear-data-selection');

    if (selectAllButton) {
      selectAllButton.addEventListener('click', () => {
        checkboxes.forEach(cb => cb.checked = true);
        renderGraphs(data, geojson);
      });
    }

    if (clearSelectionButton) {
      clearSelectionButton.addEventListener('click', () => {
        checkboxes.forEach(cb => cb.checked = false);
        renderGraphs(data, geojson);
      });
    }
    /* ----------------------------------- */
    renderGraphs(data, geojson);
  })
  .catch((err) => console.error("Dashboard failed to load:", err));

function renderGraphs(rawData, geojson) {
  clearWindow();
  const selectedTypes = getSelectedTypes();
  _displayedData = getData(rawData, selectedTypes);
  updateKPIs(_displayedData);

  // --- Bulky item data (separate from potholes, same CSV) ---
    const bulkyData = rawData.filter((d) => {
      const hasItem = [
        "BULKY_ITEM_1",
        "BULKY_ITEM_2",
        "BULKY_ITEM_3",
        "BULKY_ITEM_4",
        "BULKY_ITEM_5",
      ].some((f) => (d[f] || "").trim());
      return (
        hasItem || +d.NUM_TIRES > 0 || +d.NUM_FREONS > 0 || +d.NUM_SOFABEDS > 0
      );
    });
    bulkyData.forEach((d) => {
      d.LATITUDE = +d.LATITUDE;
      d.LONGITUDE = +d.LONGITUDE;
      d.NUM_TIRES = +d.NUM_TIRES || 0;
      d.NUM_FREONS = +d.NUM_FREONS || 0;
      d.NUM_SOFABEDS = +d.NUM_SOFABEDS || 0;
      d.hasCoords =
        !isNaN(d.LATITUDE) &&
        !isNaN(d.LONGITUDE) &&
        d.LATITUDE !== 0 &&
        d.LONGITUDE !== 0;
    });
    _fullBulkyData = bulkyData;

    // --- Leaflet point map ---
    const { leafletMap: lMap } = initPotholeMap(_displayedData);
    leafletMap = lMap;

    // Wire up map brush to update all other charts
    leafletMap.onBrushSelection = function (selectedRecords) {
      const records = selectedRecords || _displayedData;
      updateKPIs(records);
      if (choroplethMap) choroplethMap.filterData(records);
      if (lollipopChart) lollipopChart.filterData(records);
      if (barchartChart) barchartChart.filterData(records);
      if (donutChart) donutChart.filterData(records);
      if (timelineChart) timelineChart.filterData(records);
    };

    // --- Choropleth map ---
    const counts = d3.rollup(
      _displayedData,
      (v) => v.length,
      (d) => (d.NEIGHBORHOOD ?? "").trim().toUpperCase(),
    );

    choroplethMap = new ChoroplethMap(
      { parentElement: "choropleth-map" },
      geojson,
      counts,
    );

    // --- Lollipop chart ---
    const methodCounts = d3.rollup(
      _displayedData,
      (v) => v.length,
      (d) => d.METHOD_RECEIVED,
    );
    const methodData = Array.from(methodCounts, ([method, count]) => ({
      method,
      count,
    })).sort((a, b) => b.count - a.count);

    lollipopChart = new LollipopChart(
      { parentElement: "lollipop-chart" },
      methodData,
    );

    // --- Priority bar chart ---
    const priorityOrder = ["Standard", "Priority", "Hazardous", "Emergency"];
    const priorityLookup = new Map(
      priorityOrder.map((p) => [p.toUpperCase(), p]),
    );

    const priorityCounts = d3.rollup(
      _displayedData,
      (v) => v.length,
      (d) => {
        const raw = (d.PRIORITY ?? "").trim();
        return priorityLookup.get(raw.toUpperCase()) || raw;
      },
    );

    const priorityData = priorityOrder.map((priority) => ({
      priority,
      count: priorityCounts.get(priority) ?? 0,
    }));

    const colorScale = d3
      .scaleOrdinal()
      .domain(priorityOrder)
      .range(["#ca9f5f", "#c77203", "#e85d04", "#8b4300"]);

    barchartChart = new barchartPriority(
      { parentElement: "barchart-priority", colorScale },
      priorityData,
    );

    // --- Department donut ---
    const deptCounts = d3.rollup(
      _displayedData,
      (v) => v.length,
      (d) => (d.DEPT_NAME ?? "").trim(),
    );
    const deptData = Array.from(deptCounts, ([department, count]) => ({
      department,
      count,
    })).sort((a, b) => b.count - a.count);

    donutChart = new DonutChart(
      {
        parentElement: "donut-chart",
        filterField: "DEPT_NAME",
        subtitle: "Calls by Department",
      },
      deptData,
    );

    // --- Word cloud (bulky item trash profile) ---
    wordCloudChart = new WordCloud(
      { parentElement: "word-cloud-chart" },
      _fullBulkyData,
      _displayedData.length,
    );

    // --- Timeline chart ---
    timelineChart = new TimelineChart(
      { parentElement: "timeline-chart" },
      _displayedData,
      function (filteredRecords) {
        updateKPIs(filteredRecords);
        if (leafletMap) leafletMap.filterData(filteredRecords);
        if (choroplethMap) choroplethMap.filterData(filteredRecords);
        if (lollipopChart) lollipopChart.filterData(filteredRecords);
        if (barchartChart) barchartChart.filterData(filteredRecords);
        if (donutChart) donutChart.filterData(filteredRecords);
      },
    );
}

  // dataCategory is an array of SR_TYPE
function getData(originalData, dataCategory) {
  const dataType = new Set(dataCategory);
  const data = originalData.filter(d => dataType.has(d.SR_TYPE));

  data.forEach(d => {
    d.LATITUDE  = +d.LATITUDE;
    d.LONGITUDE = +d.LONGITUDE;
    d.RESPONSE_TIME_DAYS = +d.RESPONSE_TIME_DAYS;
    d.hasCoords = !isNaN(d.LATITUDE) && !isNaN(d.LONGITUDE)
                  && d.LATITUDE !== 0 && d.LONGITUDE !== 0;
  });
  return data;
}

// for handling special case where multiple SR_TYPE apply to an incident
function getSelectedTypes() {
  const selected = Array.from(document.querySelectorAll('input[name="data-select"]:checked'))
    .map(cb => cb.value);

  if (!selected.length) {
    return [];
  }

  // PTHOLE maps to two SR_TYPE values.
  if (selected.includes('PTHOLE')) selected.push('POTHPARK');

  return Array.from(new Set(selected));
}

function clearWindow() {
  if (leafletMap?.map) leafletMap.map.remove();
  if (choroplethMap?.map) choroplethMap.map.remove();

  d3.select('#lollipop-chart').selectAll('*').remove();
  d3.select('#barchart-priority').selectAll('*').remove();
  d3.select('#donut-chart').selectAll('*').remove();
  d3.select('#neighborhood-chart').selectAll('*').remove();
  d3.select('#timeline-chart').selectAll('*').remove();

  leafletMap = null;
  choroplethMap = null;
  lollipopChart = null;
  barchartChart = null;
  donutChart = null;
  neighborhoodDonut = null;
  timelineChart = null;
}