


Promise.all([
  d3.csv('data/cincinnati_311_2022_cleaned.csv'),
  d3.json('data/cincinnati.geojson')
]).then(([data, geojson]) => {
  console.log('Total 311 records loaded:', data.length);

  const potholeTypes = new Set(['PTHOLE', 'POTHPARK']);
  const filtered = data.filter(d => potholeTypes.has(d.SR_TYPE));
  console.log('Pothole requests:', filtered.length);

  const counts = d3.rollup(
    filtered,
    v => v.length,
    d => d.NEIGHBORHOOD.trim().toUpperCase()
  );

  choroplethMap = new ChoroplethMap({ parentElement: 'my-map' }, geojson, counts);

  const methodCounts = d3.rollup(data, v => v.length, d => d.METHOD_RECEIVED);
  const methodData = Array.from(methodCounts, ([method, count]) => ({ method, count }))
    .sort((a, b) => b.count - a.count);
  lollipopChart = new LollipopChart({ parentElement: 'lollipop-chart' }, methodData);
}).catch(error => console.error(error));
