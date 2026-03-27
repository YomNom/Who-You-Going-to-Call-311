class LeafletMap {

  constructor(_config, _data, _allData) {
    this.config = {
      parentElement: _config.parentElement,
    };
    this.data = _data;       // mapped data (with coords)
    this.allData = _allData; // all pothole data including unmapped
    this.colorBy = 'priority';
    this.currentBasemap = 0;
    this.initVis();
  }

  initVis() {
    const vis = this;

    // --- Basemap tile layers ---
    vis.basemaps = [
      {
        name: 'Streets',
        layer: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        })
      },
      {
        name: 'Aerial',
        layer: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri'
        })
      },
      {
        name: 'Topo',
        layer: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenTopoMap'
        })
      },
      {
        name: 'CartoDB Light',
        layer: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; CartoDB'
        })
      }
    ];

    // Initialize map centered on Cincinnati
    vis.theMap = L.map('my-map', {
      center: [39.1031, -84.5120],
      zoom: 12,
      minZoom: 10,
      maxZoom: 18,
      layers: [vis.basemaps[0].layer]
    });

    // --- Color scales ---
    vis.setupColorScales();

    // --- D3 SVG overlay ---
    L.svg({ clickable: true }).addTo(vis.theMap);
    vis.overlay = d3.select(vis.theMap.getPanes().overlayPane);
    vis.svg = vis.overlay.select('svg').attr('pointer-events', 'auto');

    // Draw dots
    vis.renderDots();

    // Update on zoom/pan
    vis.theMap.on('zoomend', () => vis.updateVis());

    // Build legend
    vis.updateLegend();
  }

  setupColorScales() {
    let vis = this;

    vis.priorityColor = d3.scaleOrdinal()
      .domain(['STANDARD', 'PRIORITY', 'HAZARDOUS'])
      .range(['#2ca02c', '#ff7f0e', '#d62728']);

    const responseExtent = d3.extent(vis.data, d => d.RESPONSE_TIME_DAYS);
    vis.responseTimeColor = d3.scaleSequential()
      .domain([0, Math.min(responseExtent[1], 60)])
      .interpolator(d3.interpolateRdYlBu)
      .clamp(true);
    vis.responseTimeColorFn = d => vis.responseTimeColor(
      Math.min(responseExtent[1], 60) - d.RESPONSE_TIME_DAYS
    );

    const neighborhoods = [...new Set(vis.data.map(d => d.NEIGHBORHOOD))].sort();
    const neighborhoodPalette = [
      ...d3.schemeTableau10,
      ...d3.schemeSet3,
      ...d3.schemePastel1,
      ...d3.schemePastel2
    ];
    vis.neighborhoodColor = d3.scaleOrdinal()
      .domain(neighborhoods)
      .range(neighborhoodPalette);

    vis.agencyColor = d3.scaleOrdinal()
      .domain(['PUBLIC SERVICES', 'PARK DEPARTMENT'])
      .range(['#1f77b4', '#2ca02c']);
  }

  getColor(d) {
    let vis = this;
    switch (vis.colorBy) {
      case 'priority':
        return vis.priorityColor(d.PRIORITY);
      case 'responseTime':
        return vis.responseTimeColorFn(d);
      case 'neighborhood':
        return vis.neighborhoodColor(d.NEIGHBORHOOD);
      case 'agency':
        return vis.agencyColor(d.DEPT_NAME);
      default:
        return 'steelblue';
    }
  }

  renderDots() {
    let vis = this;

    vis.Dots = vis.svg.selectAll('circle')
      .data(vis.data)
      .join('circle')
        .attr('fill', d => vis.getColor(d))
        .attr('stroke', '#333')
        .attr('stroke-width', 0.5)
        .attr('opacity', 0.75)
        .attr('cx', d => vis.theMap.latLngToLayerPoint([d.LATITUDE, d.LONGITUDE]).x)
        .attr('cy', d => vis.theMap.latLngToLayerPoint([d.LATITUDE, d.LONGITUDE]).y)
        .attr('r', 4)
        .on('mouseover', function (event, d) {
          d3.select(this).transition()
            .duration(150)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('r', 7);

          d3.select('#tooltip')
            .style('opacity', 1)
            .style('z-index', 1000000)
            .html(`
              <div class="tooltip-title">${d.SR_TYPE_DESC}</div>
              <div class="tooltip-row"><strong>Date Created:</strong> ${d.DATE_CREATED}</div>
              <div class="tooltip-row"><strong>Date Updated:</strong> ${d.DATE_LAST_UPDATE || 'N/A'}</div>
              <div class="tooltip-row"><strong>Agency:</strong> ${d.DEPT_NAME}</div>
              <div class="tooltip-row"><strong>Priority:</strong> ${d.PRIORITY}</div>
              <div class="tooltip-row"><strong>Neighborhood:</strong> ${d.NEIGHBORHOOD || 'N/A'}</div>
              <div class="tooltip-row"><strong>Address:</strong> ${d.ADDRESS || 'N/A'}</div>
              <div class="tooltip-row"><strong>Status:</strong> ${d.SR_STATUS || 'N/A'}</div>
              <div class="tooltip-row"><strong>Response Time:</strong> ${d.RESPONSE_TIME_DAYS} days</div>
            `);
        })
        .on('mousemove', (event) => {
          d3.select('#tooltip')
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY + 10) + 'px');
        })
        .on('mouseleave', function () {
          d3.select(this).transition()
            .duration(150)
            .attr('stroke', '#333')
            .attr('stroke-width', 0.5)
            .attr('r', 4);

          d3.select('#tooltip').style('opacity', 0);
        });
  }

  updateVis() {
    let vis = this;

    vis.Dots
      .attr('cx', d => vis.theMap.latLngToLayerPoint([d.LATITUDE, d.LONGITUDE]).x)
      .attr('cy', d => vis.theMap.latLngToLayerPoint([d.LATITUDE, d.LONGITUDE]).y)
      .attr('fill', d => vis.getColor(d));
  }

  setColorBy(colorBy) {
    let vis = this;
    vis.colorBy = colorBy;
    vis.Dots.attr('fill', d => vis.getColor(d));
    vis.updateLegend();
  }

  toggleBasemap() {
    let vis = this;
    vis.theMap.removeLayer(vis.basemaps[vis.currentBasemap].layer);
    vis.currentBasemap = (vis.currentBasemap + 1) % vis.basemaps.length;
    vis.theMap.addLayer(vis.basemaps[vis.currentBasemap].layer);
    const nextIdx = (vis.currentBasemap + 1) % vis.basemaps.length;
    d3.select('#toggle-basemap').text(`Basemap: ${vis.basemaps[vis.currentBasemap].name}`);
  }

  updateLegend() {
    let vis = this;
    const legend = d3.select('#legend');
    legend.html('');

    if (vis.colorBy === 'priority') {
      const items = [
        { label: 'Standard', color: '#2ca02c' },
        { label: 'Priority', color: '#ff7f0e' },
        { label: 'Hazardous', color: '#d62728' }
      ];
      legend.append('div').attr('class', 'legend-title').text('Priority');
      items.forEach(item => {
        const row = legend.append('div').attr('class', 'legend-item');
        row.append('span').attr('class', 'legend-swatch')
          .style('background-color', item.color);
        row.append('span').text(item.label);
      });

    } else if (vis.colorBy === 'responseTime') {
      legend.append('div').attr('class', 'legend-title').text('Response Time (days)');
      const gradientDiv = legend.append('div').attr('class', 'legend-gradient');
      const canvas = gradientDiv.append('canvas')
        .attr('width', 200).attr('height', 15);
      const ctx = canvas.node().getContext('2d');
      for (let i = 0; i < 200; i++) {
        const t = i / 199;
        ctx.fillStyle = d3.interpolateRdYlBu(1 - t);
        ctx.fillRect(i, 0, 1, 15);
      }
      const labels = legend.append('div').attr('class', 'legend-gradient-labels');
      labels.append('span').text('0');
      labels.append('span').text('60+');

    } else if (vis.colorBy === 'neighborhood') {
      legend.append('div').attr('class', 'legend-title').text('Neighborhood (top 10)');
      const counts = d3.rollup(vis.data, v => v.length, d => d.NEIGHBORHOOD);
      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
      sorted.forEach(([name, count]) => {
        const row = legend.append('div').attr('class', 'legend-item');
        row.append('span').attr('class', 'legend-swatch')
          .style('background-color', vis.neighborhoodColor(name));
        row.append('span').text(`${name} (${count})`);
      });
      legend.append('div').attr('class', 'legend-item')
        .style('font-style', 'italic')
        .text(`+ ${vis.data.length > 0 ? new Set(vis.data.map(d => d.NEIGHBORHOOD)).size - 10 : 0} more`);

    } else if (vis.colorBy === 'agency') {
      legend.append('div').attr('class', 'legend-title').text('Public Agency');
      const items = [
        { label: 'Public Services', color: '#1f77b4' },
        { label: 'Park Department', color: '#2ca02c' }
      ];
      items.forEach(item => {
        const row = legend.append('div').attr('class', 'legend-item');
        row.append('span').attr('class', 'legend-swatch')
          .style('background-color', item.color);
        row.append('span').text(item.label);
      });
    }
  }
}
