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

  // Basemap select handler
  d3.select('#basemap-select').on('change', function () {
    leafletMap.setBasemap(this.value);
  });

  // Heatmap toggle handler
  d3.select('#toggle-heatmap').on('click', function () {
    const isHeatmap = leafletMap._viewMode === 'heatmap';
    leafletMap.setViewMode(isHeatmap ? 'points' : 'heatmap');
    d3.select(this).text(isHeatmap ? 'Show Heatmap' : 'Show Points');
    d3.select(this).classed('active', !isHeatmap);
    d3.select('#color-select').property('disabled', !isHeatmap);
  });

  // Brush toggle handler
  const brushBtn = document.getElementById('brush-toggle');
  if (brushBtn) {
    brushBtn.addEventListener('click', function () {
      if (leafletMap.brushActive) {
        leafletMap.disableBrush();
        brushBtn.classList.remove('active');
      } else {
        leafletMap.enableBrush();
        brushBtn.classList.add('active');
      }
    });
  }

  // Reset all handler
  const resetBtn = document.getElementById('reset-all');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      // Turn off brush if active
      if (leafletMap.brushActive) {
        leafletMap.disableBrush();
        brushBtn.classList.remove('active');
      } else if (leafletMap._brushRect) {
        leafletMap.clearBrushSelection();
      }
      // Reset all views to full data
      window.onDashboardFilter(null, null);
    });
  }

  return { leafletMap, mappedData };
}
