/**
 * Initializes the pothole point map from pre-loaded data.
 * @param {Array} potholeData - filtered pothole records (already parsed)
 * @returns {{ leafletMap: LeafletMap, mappedData: Array }}
 */
function initPotholeMap(potholeData) {
  // Separate mapped vs unmapped
  const mappedData = potholeData.filter(d => d.hasCoords);
  const unmappedCount = potholeData.length - mappedData.length;

  // Show unmapped count
  const unmappedInfo = document.getElementById('unmapped-info');
  if (unmappedCount > 0) {
    unmappedInfo.textContent = `${unmappedCount} of ${potholeData.length} calls not mapped (missing coordinates)`;
  } else {
    unmappedInfo.textContent = `All ${potholeData.length} calls mapped`;
  }

  // Initialize the map
  const leafletMap = new LeafletMap(
    { parentElement: '#my-map' },
    mappedData,
    potholeData
  );

  // Color-by dropdown handler
  d3.select('#color-select').on('change', function () {
    leafletMap.setColorBy(this.value);
  });

  // Basemap toggle handler
  d3.select('#toggle-basemap').on('click', function () {
    leafletMap.toggleBasemap();
  });

  return { leafletMap, mappedData };
}
