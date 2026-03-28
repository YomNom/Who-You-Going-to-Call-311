let leafletMap, choroplethMap, lollipopChart, barchartChart, donutChart, neighborhoodDonut, timelineChart;
let _fullPotholeData = [];
let _rawData = [];
let _geojson = null;

// Global filter handler
window.onDashboardFilter = function (field, value) {
  const filtered = (field === null)
    ? _fullPotholeData
    : _fullPotholeData.filter(d => (d[field] ?? '').trim().toUpperCase() === value.toUpperCase());

  if (leafletMap)        leafletMap.filterData(filtered);
  if (lollipopChart)     lollipopChart.filterData(filtered);
  if (barchartChart)     barchartChart.filterData(filtered);
  if (donutChart)        donutChart.filterData(filtered);
  if (neighborhoodDonut) neighborhoodDonut.filterData(filtered);
  if (timelineChart)     timelineChart.filterData(filtered);
};

// Load all data
Promise.all([
  d3.csv('data/cincinnati_311_2022_cleaned.csv'),
  d3.json('data/cincinnati.geojson')
])
.then(([data, geojson]) => {
  _rawData = data;
  _geojson = geojson;

  applySelectedDataType();

  const dataSelect = d3.select('#data-select');
  if (!dataSelect.empty()) {
    dataSelect.on('change', applySelectedDataType);
  }

})
.catch(err => console.error('Dashboard failed to load:', err));

function getSelectedTypes() {
  const selected = d3.select('#data-select').property('value');
  if (selected === 'PTHOLE') return ['PTHOLE', 'POTHPARK'];
  return selected ? [selected] : ['PTHOLE', 'POTHPARK'];
}

function applySelectedDataType() {
  const selectedTypes = getSelectedTypes();
  const selectedData = getData(_rawData, selectedTypes);
  renderDashboard(selectedData, _geojson);
}

function clearDashboardViews() {
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

function renderDashboard(selectedData, geojson) {
  clearDashboardViews();
  _fullPotholeData = selectedData;

  // --- Leaflet point map ---
  const { leafletMap: lMap } = initPotholeMap(_fullPotholeData);
  leafletMap = lMap;

  // --- Choropleth map ---
  const counts = d3.rollup(
    _fullPotholeData,
    v => v.length,
    d => (d.NEIGHBORHOOD ?? '').trim().toUpperCase()
  );

  choroplethMap = new ChoroplethMap(
    { parentElement: 'choropleth-map' },
    geojson,
    counts
  );

  // --- Lollipop chart ---
  const methodCounts = d3.rollup(_fullPotholeData, v => v.length, d => d.METHOD_RECEIVED);
  const methodData = Array.from(methodCounts, ([method, count]) => ({ method, count }))
    .sort((a, b) => b.count - a.count);

  lollipopChart = new LollipopChart(
    { parentElement: 'lollipop-chart' },
    methodData
  );

  // --- Priority bar chart ---
  const priorityOrder = ['Standard', 'Priority', 'Hazardous', 'Emergency'];
  const priorityLookup = new Map(priorityOrder.map(p => [p.toUpperCase(), p]));

  const priorityCounts = d3.rollup(_fullPotholeData, v => v.length, d => {
    const raw = (d.PRIORITY ?? '').trim();
    return priorityLookup.get(raw.toUpperCase()) || raw;
  });

  const priorityData = priorityOrder.map(priority => ({
    priority,
    count: priorityCounts.get(priority) ?? 0
  }));

  const colorScale = d3.scaleOrdinal()
    .domain(priorityOrder)
    .range(['#eee1cd', '#ca9f5f', '#c77203', '#8b4300']);

  barchartChart = new barchartPriority(
    { parentElement: 'barchart-priority', colorScale },
    priorityData
  );

  // --- Department donut ---
  const deptCounts = d3.rollup(_fullPotholeData, v => v.length, d => (d.DEPT_NAME ?? '').trim());
  const deptData = Array.from(deptCounts, ([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);

  donutChart = new DonutChart({
    parentElement: 'donut-chart',
    filterField: 'DEPT_NAME',
    subtitle: 'Calls by Department',
  }, deptData);

  // --- Neighborhood donut ---
  const neighCounts = d3.rollup(_fullPotholeData, v => v.length, d => (d.NEIGHBORHOOD ?? '').trim());
  const neighData = Array.from(neighCounts, ([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);

  neighborhoodDonut = new DonutChart({
    parentElement: 'neighborhood-chart',
    filterField: 'NEIGHBORHOOD',
    subtitle: 'Calls by Neighborhood',
    colorScale: leafletMap.neighborhoodScale,
  }, neighData);

  // --- Timeline chart ---
  timelineChart = new TimelineChart(
    { parentElement: 'timeline-chart' },
    _fullPotholeData,
    function (filteredRecords) {
      window.onDashboardFilter(null, null);
      if (leafletMap) leafletMap.filterData(filteredRecords);
    }
  );

}));
// .catch(err => console.error('Dashboard failed to load:', err));

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

function updateData(newData) {
  _fullPotholeData = newData;
  window.onDashboardFilter(null, null);
}