class LeafletMap {
  constructor(config, mappedData, allData) {
    this.config = config;
    this.mappedData = mappedData;
    this.allData = allData;

    this.colorBy = 'priority';
    this.basemapIdx = 0;
    this._currentMapped = mappedData;

    this.initVis();
  }

  initVis() {
    const vis = this;

    const elId = vis.config.parentElement.replace(/^#/, '');
    vis.map = L.map(elId, { minZoom: 10, maxZoom: 18 });

    vis.basemaps = [
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Tiles © Esri' }
      ),
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Tiles © Esri Imagery' }
      )
    ];

    vis.basemaps[0].addTo(vis.map);

    vis.tooltip = d3.select('#tooltip');
    vis.markersLayer = L.layerGroup().addTo(vis.map);

    // --- Color scales ---
    vis.priorityColors = {
      'Standard':  '#eee1cd',
      'Priority':  '#ca9f5f',
      'Hazardous': '#c77203',
      'Emergency': '#8b4300',
    };

    vis.neighborhoodScale = d3.scaleOrdinal(d3.schemeTableau10);
    vis.agencyScale = d3.scaleOrdinal(d3.schemeSet2);

    const maxDays = d3.max(vis.mappedData, d => d.RESPONSE_TIME_DAYS) || 30;
    vis.responseTimeScale = d3.scaleSequential(d3.interpolateBlues)
      .domain([0, maxDays]);

    // Fit bounds
    if (vis.mappedData.length > 0) {
      const lats = vis.mappedData.map(d => d.LATITUDE);
      const lngs = vis.mappedData.map(d => d.LONGITUDE);
      vis.map.fitBounds([
        [d3.min(lats), d3.min(lngs)],
        [d3.max(lats), d3.max(lngs)]
      ]);
    }

    vis.renderPoints(vis.mappedData);
    vis.addLegend();
  }

  getColor(d) {
    const vis = this;

    switch (vis.colorBy) {
      case 'priority':
        return vis.priorityColors[d.PRIORITY] || '#aaa';

      case 'neighborhood':
        return vis.neighborhoodScale((d.NEIGHBORHOOD || '').trim());

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
        radius: 4,
        fillColor: vis.getColor(d),
        color: '#fff',
        weight: 0.5,
        fillOpacity: 0.82,
      });

      circle.on('mouseover', e => {
        vis.tooltip
          .style('opacity', 1)
          .style('left', e.originalEvent.pageX + 10 + 'px')
          .style('top', e.originalEvent.pageY - 20 + 'px')
          .html(`
            <strong>${d.SR_TYPE || 'N/A'}</strong><br>
            Requested: ${d.DATE_CREATED || 'N/A'}<br>
            Updated: ${d.DATE_CLOSED || 'N/A'}<br>
            Agency: ${d.DEPT_NAME || 'N/A'}<br>
            Priority: ${d.PRIORITY || 'N/A'}<br>
            Neighborhood: ${d.NEIGHBORHOOD || 'N/A'}
          `);
      });

      circle.on('mouseout', () => vis.tooltip.style('opacity', 0));

      vis.markersLayer.addLayer(circle);
    });
  }

  setColorBy(value) {
    this.colorBy = value;
    this.renderPoints(this._currentMapped);
    this.addLegend();
  }

  toggleBasemap() {
    const vis = this;
    vis.basemaps[vis.basemapIdx].remove();
    vis.basemapIdx = (vis.basemapIdx + 1) % vis.basemaps.length;
    vis.basemaps[vis.basemapIdx].addTo(vis.map);
  }

  filterData(rawRecords) {
    const vis = this;
    vis._currentMapped = rawRecords.filter(d => d.hasCoords);
    vis.renderPoints(vis._currentMapped);
  }

  addLegend() {
    const vis = this;

    if (vis._legend) vis._legend.remove();

    vis._legend = L.control({ position: 'bottomright' });

    vis._legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend');

      if (vis.colorBy === 'priority') {
        div.innerHTML = '<strong>Priority</strong><br>';
        Object.entries(vis.priorityColors).forEach(([k, v]) => {
          div.innerHTML += `<i style="background:${v}"></i>${k}<br>`;
        });

      } else if (vis.colorBy === 'response_time') {
        div.innerHTML = '<strong>Response Time</strong><br>';
        [0, 10, 20, 30].forEach(v => {
          div.innerHTML += `<i style="background:${vis.responseTimeScale(v)}"></i>${v}d<br>`;
        });

      } else {
        div.innerHTML = `<strong>${vis.colorBy}</strong><br><em>(categorical)</em>`;
      }

      return div;
    };

    vis._legend.addTo(vis.map);
  }
}