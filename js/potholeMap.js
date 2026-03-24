/**
 * potholeMap.js – loads data and initialises LeafletMap.
 * Minor changes from original:
 *   - CSV path corrected to cincinnati_311_2022_cleaned.csv
 *   - Date fields updated to match actual CSV columns (DATE_CREATED, DATE_CLOSED)
 */
function initPotholeMap() {
  return d3.csv('data/cincinnati_311_2022_cleaned.csv')
    .then(data => {
      const potholeData = data.filter(d =>
        d.SR_TYPE === 'PTHOLE' || d.SR_TYPE === 'POTHPARK'
      );

      console.log('Total 311 records loaded:', data.length);
      console.log('Pothole records:', potholeData.length);

      potholeData.forEach(d => {
        d.LATITUDE  = +d.LATITUDE;
        d.LONGITUDE = +d.LONGITUDE;
        d.RESPONSE_TIME_DAYS = +d.RESPONSE_TIME_DAYS;
        d.hasCoords = !isNaN(d.LATITUDE) && !isNaN(d.LONGITUDE)
                      && d.LATITUDE !== 0 && d.LONGITUDE !== 0;
      });

      const mappedData    = potholeData.filter(d => d.hasCoords);
      const unmappedCount = potholeData.length - mappedData.length;

      const unmappedInfo = document.getElementById('unmapped-info');
      if (unmappedInfo) {
        unmappedInfo.textContent = unmappedCount > 0
          ? `${unmappedCount} of ${potholeData.length} calls not mapped (missing coords)`
          : `All ${potholeData.length} calls mapped`;
      }

      const leafletMap = new LeafletMap(
        { parentElement: '#my-map' },
        mappedData,
        potholeData
      );

      d3.select('#color-select').on('change', function () {
        leafletMap.setColorBy(this.value);
      });

      d3.select('#toggle-basemap').on('click', function () {
        leafletMap.toggleBasemap();
      });

      return { leafletMap, potholeData, mappedData };
    });
}
