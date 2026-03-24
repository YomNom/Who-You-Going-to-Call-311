/**
 * main.js – Dashboard orchestrator
 * Variable `barchartChart` used instead of `barchartPriority` to avoid class name clash.
 */

let leafletMap, lollipopChart, barchartChart, donutChart, neighborhoodDonut, timelineChart;
let _fullPotholeData = [];

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

initPotholeMap()
  .then(({ leafletMap: lMap, potholeData }) => {

    leafletMap = lMap;
    _fullPotholeData = potholeData;

    // Lollipop method received
    const methodCounts = d3.rollup(potholeData, v => v.length, d => d.METHOD_RECEIVED);
    const methodData = Array.from(methodCounts, ([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count);
    lollipopChart = new LollipopChart({ parentElement: 'lollipop-chart' }, methodData);

    // Priority bar chart
    const priorityOrder = ['Standard', 'Priority', 'Hazardous', 'Emergency'];
    const priorityLabelLookup = new Map(priorityOrder.map(p => [p.toUpperCase(), p]));
    const priorityCounts = d3.rollup(potholeData, v => v.length, d => {
      const raw = (d.PRIORITY ?? '').trim();
      return priorityLabelLookup.get(raw.toUpperCase()) || raw;
    });
    const priorityData = priorityOrder.map(priority => ({
      priority,
      count: priorityCounts.get(priority) ?? 0,
    }));
    const colorScale = d3.scaleOrdinal()
      .range(['#eee1cd', '#ca9f5f', '#c77203', '#8b4300'])
      .domain(priorityOrder);
    barchartChart = new barchartPriority(
      { parentElement: 'barchart-priority', colorScale },
      priorityData
    );

    // Donut by department 
    const deptCounts = d3.rollup(potholeData, v => v.length, d => (d.DEPT_NAME ?? '').trim());
    const deptData = Array.from(deptCounts, ([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count);
    donutChart = new DonutChart({
      parentElement: 'donut-chart',
      filterField: 'DEPT_NAME',
      subtitle: 'Calls by Department',
    }, deptData);

    // Donut by neighborhood (top 10)
    // Share the same d3.schemeTableau10 scale as the map's neighborhood coloring
    // so arc colors match point colors exactly when map is set to "neighborhood"
    const neighCounts = d3.rollup(potholeData, v => v.length, d => (d.NEIGHBORHOOD ?? '').trim());
    const neighData = Array.from(neighCounts, ([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    neighborhoodDonut = new DonutChart({
      parentElement: 'neighborhood-chart',
      filterField: 'NEIGHBORHOOD',
      subtitle: 'Calls by Neighborhood',
      colorScale: leafletMap.neighborhoodScale,
    }, neighData);

    // Timeline line chart
    timelineChart = new TimelineChart(
      { parentElement: 'timeline-chart' },
      potholeData,
      function (filteredRecords) {
        if (leafletMap)        leafletMap.filterData(filteredRecords);
        if (lollipopChart)     lollipopChart.filterData(filteredRecords);
        if (barchartChart)     barchartChart.filterData(filteredRecords);
        if (donutChart)        donutChart.filterData(filteredRecords);
        if (neighborhoodDonut) neighborhoodDonut.filterData(filteredRecords);
      }
    );
  })
  .catch(err => console.error('Dashboard failed to load:', err));
