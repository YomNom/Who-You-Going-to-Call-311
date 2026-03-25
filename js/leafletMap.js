/**
 * LeafletMap – point-based map for individual 311 pothole records.
 * Replaces the old choropleth version; designed to match potholeMap.js usage:
 *   new LeafletMap({ parentElement: '#my-map' }, mappedData, potholeData)
 *
 * Color-by options (set via setColorBy):
 *   'priority'      – ordinal scale (warm browns matching priority barchart)
 *   'response_time' – sequential blue scale (quantitative)
 *   'neighborhood'  – categorical Tableau10
 *   'agency'        – categorical Set2
 *
 * Also exposes: toggleBasemap(), filterData(rawRecords)
 */
class LeafletMap {
  constructor(config, mappedData, allData) {
    this.config   = config;
    this.mappedData = mappedData;   // records with valid coords
    this.allData    = allData;      // all pothole records (for unmapped count etc.)
    this.colorBy    = 'priority';
    this.basemapIdx = 0;
    this._currentMapped = mappedData; // tracks current filtered set of mapped records
    this.initVis();
  }

  initVis() {
    const vis = this;

    // Strip leading '#' if present for Leaflet's element id
    const elId = vis.config.parentElement.replace(/^#/, '');

    vis.map = L.map(elId, { minZoom: 10, maxZoom: 18 });

    // Two basemaps – toggled with toggleBasemap()
    vis.basemaps = [
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Tiles &copy; Esri' }
      ),
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Tiles &copy; Esri World Imagery' }
      ),
    ];
    vis.basemaps[0].addTo(vis.map);

    vis.tooltip = d3.select('#tooltip');

    // Layer group holds all circle markers; cleared on re-render
    vis.markersLayer = L.layerGroup().addTo(vis.map);

    // Color scales
    // Priority: ordinal, warm brown ramp (matches barchartPriority palette)
    vis.priorityColors = {
      'Standard':  '#eee1cd',
      'Priority':  '#ca9f5f',
      'Hazardous': '#c77203',
      'Emergency': '#8b4300',
    };

    // Neighborhood & Agency: categorical (nominal data → categorical scheme)
    vis.neighborhoodScale = d3.scaleOrdinal(d3.schemeTableau10);
    vis.agencyScale       = d3.scaleOrdinal(d3.schemeSet2);

    // Response time: sequential blue (quantitative, low→high days)
    const maxDays = d3.max(vis.mappedData, d => d.RESPONSE_TIME_DAYS) || 30;
    vis.responseTimeScale = d3.scaleSequential(d3.interpolateBlues).domain([0, maxDays]);

    // Fit map to data bounds
    if (vis.mappedData.length > 0) {
      const lats = vis.mappedData.map(d => d.LATITUDE);
      const lngs = vis.mappedData.map(d => d.LONGITUDE);
      vis.map.fitBounds([
        [d3.min(lats), d3.min(lngs)],
        [d3.max(lats), d3.max(lngs)],
      ]);
    }

    vis.renderPoints(vis.mappedData);
    vis.addLegend();
  }

  /** Returns fill color for a single record given current colorBy setting */
  getColor(d) {
    const vis = this;
    switch (vis.colorBy) {
      case 'priority':
        return vis.priorityColors[(d.PRIORITY || '')] || '#aaa';
      case 'neighborhood':
        return vis.neighborhoodScale((d.NEIGHBORHOOD || '').trim().toUpperCase());
      case 'agency':
        return vis.agencyScale((d.DEPT_NAME || '').trim());
      case 'response_time':
        return vis.responseTimeScale(d.RESPONSE_TIME_DAYS || 0);
      default:
        return '#e85d04';
    }
  }

  renderPoints(data) {
    const vis = this;
    vis.markersLayer.clearLayers();

    data.forEach(d => {
      if (!d.hasCoords) return;

      const circle = L.circleMarker([d.LATITUDE, d.LONGITUDE], {
        radius:      4,
        fillColor:   vis.getColor(d),
        color:       '#fff',
        weight:      0.5,
        fillOpacity: 0.82,
      });

      circle.on('mouseover', e => {
        vis.tooltip
          .style('opacity', 1)
          .style('left', e.originalEvent.pageX + 10 + 'px')
          .style('top',  e.originalEvent.pageY - 20 + 'px')
          .html(
            `<span class="tooltip-label">Requested</span><br>${d.DATE_CREATED || 'N/A'}<br>` +
            `<span class="tooltip-label">Updated</span><br>${d.DATE_CLOSED || 'N/A'}<br>` +
            `<span class="tooltip-label">Agency</span><br>${d.DEPT_NAME || 'N/A'}<br>` +
            `<span class="tooltip-label">Type</span><br>${d.SR_TYPE || 'N/A'}<br>` +
            `<span class="tooltip-label">Priority</span><br>${d.PRIORITY || 'N/A'}<br>` +
            `<span class="tooltip-label">Neighborhood</span><br>${d.NEIGHBORHOOD || 'N/A'}`
          );
      });
      circle.on('mousemove', e => {
        vis.tooltip
          .style('left', e.originalEvent.pageX + 10 + 'px')
          .style('top',  e.originalEvent.pageY - 20 + 'px');
      });
      circle.on('mouseout', () => vis.tooltip.style('opacity', 0));

      vis.markersLayer.addLayer(circle);
    });
  }

  /** Called by color-by dropdown */
  setColorBy(value) {
    this.colorBy = value;
    this.renderPoints(this._currentMapped);
    this.addLegend();
  }

  /** Cycles between the two basemaps */
  toggleBasemap() {
    const vis = this;
    vis.basemaps[vis.basemapIdx].remove();
    vis.basemapIdx = (vis.basemapIdx + 1) % vis.basemaps.length;
    vis.basemaps[vis.basemapIdx].addTo(vis.map);
  }

  /** Linking: filter displayed points to the given raw records */
  filterData(rawRecords) {
    const vis = this;
    vis._currentMapped = rawRecords.filter(d => d.hasCoords);
    vis.renderPoints(vis._currentMapped);
  }

  /** Rebuild the map legend based on current colorBy */
  addLegend() {
    const vis = this;

    if (vis._legend) vis._legend.remove();

    vis._legend = L.control({ position: 'bottomright' });
    vis._legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend');

      if (vis.colorBy === 'priority') {
        div.innerHTML = '<strong>Priority</strong><br>';
        ['Standard', 'Priority', 'Hazardous', 'Emergency'].forEach(p => {
          div.innerHTML += `<i style="background:${vis.priorityColors[p]}"></i>${p}<br>`;
        });

      } else if (vis.colorBy === 'response_time') {
        div.innerHTML = '<strong>Response Time (days)</strong><br>';
        const maxDays = d3.max(vis.mappedData, d => d.RESPONSE_TIME_DAYS) || 30;
        [0, 0.25, 0.5, 0.75, 1].reverse().forEach(t => {
          const val = Math.round(t * maxDays);
          div.innerHTML += `<i style="background:${vis.responseTimeScale(val)}"></i>${val}d<br>`;
        });

      } else {
        div.innerHTML = `<strong>${vis.colorBy === 'neighborhood' ? 'Neighborhood' : 'Agency'}</strong><br>`;
        div.innerHTML += '<em style="font-size:10px">(categorical)</em>';
      }

      return div;
    };
    vis._legend.addTo(vis.map);
  }
}
