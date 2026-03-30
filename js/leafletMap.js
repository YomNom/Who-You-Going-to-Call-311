class LeafletMap {
  constructor(config, mappedData, allData) {
    this.config = config;
    this.mappedData = mappedData;
    this.allData = allData;

    this.colorBy = 'priority';
    this.basemapIdx = 0;
    this._currentMapped = mappedData;
    this._viewMode = 'points'; // 'points' | 'heatmap'

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

    // --- Heatmap layer (not added to map yet) ---
    vis.heatLayer = L.heatLayer([], {
      radius: 20,
      blur: 15,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.0: 'rgba(49,104,142,0)',
        0.3: '#31688e',
        0.5: '#35b779',
        0.8: '#8fd744',
        1.0: '#fde725'
      }
    });

    // --- Brush state ---
    vis.brushActive = false;
    vis._brushRect = null;
    vis._brushStart = null;
    vis.onBrushSelection = null; // callback set externally

    // --- Color scales ---
    vis.priorityColors = {
      'STANDARD':  '#4a90d9',
      'PRIORITY':  '#f5c542',
      'HAZARDOUS': '#e85d04',
      'EMERGENCY': '#d62828',
    };

    vis.neighborhoodScale = d3.scaleOrdinal(d3.schemeTableau10);
    vis.agencyScale = d3.scaleOrdinal(d3.schemeSet2);

    vis.responseTimeBreaks = [7, 30, 90, 180, 365];
    vis.responseTimeColors = ['#2b9e3e', '#a8d94a', '#fee839', '#f57d20', '#d62828', '#7b0d1e'];
    vis.responseTimeScale = d3.scaleThreshold()
      .domain(vis.responseTimeBreaks)
      .range(vis.responseTimeColors);

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
        return vis.priorityColors[(d.PRIORITY || '').toUpperCase()] || '#aaa';

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
    vis._markers = [];

    data.forEach(d => {
      if (!d.hasCoords) return;

      const circle = L.circleMarker([d.LATITUDE, d.LONGITUDE], {
        radius: 4,
        fillColor: vis.getColor(d),
        color: '#fff',
        weight: 0.5,
        fillOpacity: 0.82,
      });

      circle._data = d;

      circle.on('mouseover', e => {
        if (vis._brushing) return;
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
      vis._markers.push(circle);
    });
  }

  _styleMarkersByBounds(bounds) {
    const vis = this;
    if (!vis._markers) return;

    vis._markers.forEach(marker => {
      const d = marker._data;
      const inside = !bounds || bounds.contains(marker.getLatLng());
      marker.setStyle({
        fillColor: inside ? vis.getColor(d) : '#ccc',
        fillOpacity: inside ? 0.82 : 0.3,
        color: inside ? '#fff' : '#ddd',
      });
    });
  }

  setColorBy(value) {
    this.colorBy = value;
    if (this._viewMode === 'points') {
      this.renderPoints(this._currentMapped);
      this.addLegend();
    }
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
    if (vis._viewMode === 'heatmap') {
      vis.renderHeatmap(vis._currentMapped);
    } else {
      vis.renderPoints(vis._currentMapped);
    }
  }

  renderHeatmap(data) {
    const heatData = data
      .filter(d => d.hasCoords)
      .map(d => [d.LATITUDE, d.LONGITUDE, 1]);
    this.heatLayer.setLatLngs(heatData);
  }

  setViewMode(mode) {
    const vis = this;
    vis._viewMode = mode;

    if (mode === 'heatmap') {
      vis.map.removeLayer(vis.markersLayer);
      vis.heatLayer.addTo(vis.map);
      vis.renderHeatmap(vis._currentMapped);
      if (vis._legend) vis._legend.remove();
      vis.addHeatmapLegend();
    } else {
      vis.map.removeLayer(vis.heatLayer);
      vis.markersLayer.addTo(vis.map);
      vis.renderPoints(vis._currentMapped);
      if (vis._heatLegend) vis._heatLegend.remove();
      vis.addLegend();
    }
  }

  addHeatmapLegend() {
    const vis = this;
    if (vis._heatLegend) vis._heatLegend.remove();

    vis._heatLegend = L.control({ position: 'bottomright' });
    vis._heatLegend.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend');
      div.innerHTML = '<strong>Call Density</strong><br>';
      div.innerHTML +=
        '<div class="gradient-bar" style="background:linear-gradient(to right,#31688e,#35b779,#8fd744,#fde725);"></div>';
      div.innerHTML +=
        '<div style="display:flex;justify-content:space-between;font-size:10px;margin-top:2px;">' +
        '<span>Low</span><span>High</span></div>';
      return div;
    };
    vis._heatLegend.addTo(vis.map);
  }

  // --- Brush interaction (supports draw, drag, resize) ---

  _brushRectStyle() {
    return {
      color: '#c77203',
      weight: 2,
      fillColor: '#c77203',
      fillOpacity: 0.15,
      interactive: false,
    };
  }

  // Determine what part of the brush the mouse is over
  _brushHitTest(e) {
    const vis = this;
    if (!vis._brushRect) return 'draw';

    const bounds = vis._brushRect.getBounds();
    const nw = vis.map.latLngToContainerPoint(bounds.getNorthWest());
    const se = vis.map.latLngToContainerPoint(bounds.getSouthEast());
    const pt = L.point(e.offsetX, e.offsetY);
    const edge = 8; // px threshold for edge detection

    const insideX = pt.x >= nw.x - edge && pt.x <= se.x + edge;
    const insideY = pt.y >= nw.y - edge && pt.y <= se.y + edge;
    if (!insideX || !insideY) return 'draw';

    const nearLeft   = Math.abs(pt.x - nw.x) < edge;
    const nearRight  = Math.abs(pt.x - se.x) < edge;
    const nearTop    = Math.abs(pt.y - nw.y) < edge;
    const nearBottom = Math.abs(pt.y - se.y) < edge;

    if (nearTop && nearLeft)     return 'nw-resize';
    if (nearTop && nearRight)    return 'ne-resize';
    if (nearBottom && nearLeft)  return 'sw-resize';
    if (nearBottom && nearRight) return 'se-resize';
    if (nearLeft)   return 'w-resize';
    if (nearRight)  return 'e-resize';
    if (nearTop)    return 'n-resize';
    if (nearBottom) return 's-resize';

    return 'move';
  }

  _setMarkersInteractive(enabled) {
    const val = enabled ? '' : 'none';
    this.markersLayer.eachLayer(layer => {
      layer.getElement && layer.getElement() && (layer.getElement().style.pointerEvents = val);
    });
  }

  _applyBrushFilter() {
    const vis = this;
    if (!vis._brushRect) return;
    const bounds = vis._brushRect.getBounds();
    if (vis._viewMode === 'points') {
      vis._styleMarkersByBounds(bounds);
    }
    const selected = vis._currentMapped.filter(d =>
      d.hasCoords && bounds.contains(L.latLng(d.LATITUDE, d.LONGITUDE))
    );
    if (vis.onBrushSelection) vis.onBrushSelection(selected);
  }

  enableBrush() {
    const vis = this;
    vis.brushActive = true;
    vis.map.dragging.disable();
    vis.map.getContainer().style.cursor = 'crosshair';

    const container = vis.map.getContainer();

    vis._onBrushDown = function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      vis._setMarkersInteractive(false);
      vis.tooltip.style('opacity', 0);

      const mode = vis._brushHitTest(e);
      vis._brushMode = mode;
      vis._brushing = true;
      vis._dragStartPt = L.point(e.offsetX, e.offsetY);

      if (mode === 'draw') {
        if (vis._brushRect) { vis._brushRect.remove(); vis._brushRect = null; }
        vis._brushStart = vis.map.mouseEventToLatLng(e);
      } else if (mode === 'move') {
        vis._dragStartBounds = vis._brushRect.getBounds();
      } else {
        // resize: anchor the opposite corner
        const b = vis._brushRect.getBounds();
        const anchors = {
          'nw-resize': b.getSouthEast(), 'ne-resize': b.getSouthWest(),
          'sw-resize': b.getNorthEast(), 'se-resize': b.getNorthWest(),
          'n-resize': b.getSouthWest(),  's-resize': b.getNorthWest(),
          'w-resize': b.getSouthEast(),  'e-resize': b.getSouthWest(),
        };
        vis._resizeAnchor = anchors[mode];
        vis._resizeOrigBounds = b;
      }
    };

    vis._onBrushMove = function (e) {
      if (!vis._brushing) {
        // Update cursor based on hover zone
        const mode = vis._brushHitTest(e);
        if (mode === 'move') container.style.cursor = 'grab';
        else if (mode === 'draw') container.style.cursor = 'crosshair';
        else container.style.cursor = mode;
        return;
      }

      const mode = vis._brushMode;

      if (mode === 'draw') {
        const current = vis.map.mouseEventToLatLng(e);
        const bounds = L.latLngBounds(vis._brushStart, current);
        if (vis._brushRect) vis._brushRect.setBounds(bounds);
        else vis._brushRect = L.rectangle(bounds, vis._brushRectStyle()).addTo(vis.map);

      } else if (mode === 'move') {
        const curPt = L.point(e.offsetX, e.offsetY);
        const dx = curPt.x - vis._dragStartPt.x;
        const dy = curPt.y - vis._dragStartPt.y;
        const origNW = vis.map.latLngToContainerPoint(vis._dragStartBounds.getNorthWest());
        const origSE = vis.map.latLngToContainerPoint(vis._dragStartBounds.getSouthEast());
        const newNW = vis.map.containerPointToLatLng(L.point(origNW.x + dx, origNW.y + dy));
        const newSE = vis.map.containerPointToLatLng(L.point(origSE.x + dx, origSE.y + dy));
        vis._brushRect.setBounds(L.latLngBounds(newNW, newSE));

      } else {
        // Resize
        const current = vis.map.mouseEventToLatLng(e);
        const anchor = vis._resizeAnchor;
        const orig = vis._resizeOrigBounds;
        let sw, ne;

        if (mode === 'n-resize' || mode === 's-resize') {
          // Only change latitude, keep original longitude
          const latBounds = [anchor.lat, current.lat].sort((a, b) => a - b);
          sw = L.latLng(latBounds[0], orig.getWest());
          ne = L.latLng(latBounds[1], orig.getEast());
        } else if (mode === 'w-resize' || mode === 'e-resize') {
          // Only change longitude, keep original latitude
          const lngBounds = [anchor.lng, current.lng].sort((a, b) => a - b);
          sw = L.latLng(orig.getSouth(), lngBounds[0]);
          ne = L.latLng(orig.getNorth(), lngBounds[1]);
        } else {
          // Corner resize: free in both axes
          const bounds = L.latLngBounds(anchor, current);
          sw = bounds.getSouthWest();
          ne = bounds.getNorthEast();
        }

        vis._brushRect.setBounds(L.latLngBounds(sw, ne));
      }

      vis._applyBrushFilter();
    };

    vis._onBrushUp = function (e) {
      if (!vis._brushing) return;
      vis._brushing = false;
      vis._setMarkersInteractive(true);

      if (!vis._brushRect) return;

      const bounds = vis._brushRect.getBounds();
      const nw = vis.map.latLngToContainerPoint(bounds.getNorthWest());
      const se = vis.map.latLngToContainerPoint(bounds.getSouthEast());
      if (nw.distanceTo(se) < 5) {
        vis.clearBrushSelection();
        return;
      }

      vis._applyBrushFilter();
    };

    container.addEventListener('mousedown', vis._onBrushDown);
    container.addEventListener('mousemove', vis._onBrushMove);
    container.addEventListener('mouseup', vis._onBrushUp);
  }

  disableBrush() {
    const vis = this;
    vis.brushActive = false;
    vis.map.dragging.enable();
    vis.map.getContainer().style.cursor = '';

    const container = vis.map.getContainer();
    if (vis._onBrushDown) container.removeEventListener('mousedown', vis._onBrushDown);
    if (vis._onBrushMove) container.removeEventListener('mousemove', vis._onBrushMove);
    if (vis._onBrushUp) container.removeEventListener('mouseup', vis._onBrushUp);

    vis.clearBrushSelection();
  }

  clearBrushSelection() {
    const vis = this;
    if (vis._brushRect) {
      vis._brushRect.remove();
      vis._brushRect = null;
    }
    vis._brushStart = null;
    vis._brushing = false;
    if (vis._viewMode === 'points') {
      vis._styleMarkersByBounds(null);
    }
    if (vis.onBrushSelection) {
      vis.onBrushSelection(null);
    }
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
          const label = k.charAt(0) + k.slice(1).toLowerCase();
          div.innerHTML += `<i style="background:${v}"></i>${label}<br>`;
        });

      } else if (vis.colorBy === 'response_time') {
        div.innerHTML = '<strong>Response Time</strong><br>';
        const breaks = vis.responseTimeBreaks;
        const colors = vis.responseTimeColors;
        div.innerHTML += `<i style="background:${colors[0]}"></i>&lt; ${breaks[0]}d<br>`;
        for (let i = 1; i < breaks.length; i++) {
          div.innerHTML += `<i style="background:${colors[i]}"></i>${breaks[i - 1]} - ${breaks[i]}d<br>`;
        }
        div.innerHTML += `<i style="background:${colors[colors.length - 1]}"></i>&gt; ${breaks[breaks.length - 1]}d<br>`;

      } else {
        div.innerHTML = `<strong>${vis.colorBy}</strong><br><em>(categorical)</em>`;
      }

      return div;
    };

    vis._legend.addTo(vis.map);
  }
}