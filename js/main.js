// Initialize the pothole map
initPotholeMap()
  .then(({ leafletMap, potholeData, mappedData }) => {
    // Other team visualizations can be initialized here using the shared data
    // e.g. initBarChart(potholeData);
  })
  .catch(error => console.error('Error loading data:', error));
