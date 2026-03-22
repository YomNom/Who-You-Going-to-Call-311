/**
 * Loads Cincinnati 311 pothole data and initializes the LeafletMap.
 * Returns a Promise that resolves with { leafletMap, potholeData, mappedData }.
 */
function initPotholeMap() {
  return d3.csv('data/cincinnati_311_2022_cleaned.csv')
    .then(data => {
      // Filter for pothole service requests only
      const potholeData = data.filter(d =>
        d.SR_TYPE === 'PTHOLE' || d.SR_TYPE === 'POTHPARK'
      );

      console.log('Total 311 records loaded:', data.length);
      console.log('Pothole records:', potholeData.length);

      // Parse numeric and date fields
      potholeData.forEach(d => {
        d.LATITUDE = +d.LATITUDE;
        d.LONGITUDE = +d.LONGITUDE;
        d.RESPONSE_TIME_DAYS = +d.RESPONSE_TIME_DAYS;
        d.hasCoords = !isNaN(d.LATITUDE) && !isNaN(d.LONGITUDE)
                      && d.LATITUDE !== 0 && d.LONGITUDE !== 0;
      });

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

      return { leafletMap, potholeData, mappedData };
    });
}
