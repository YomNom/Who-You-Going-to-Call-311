class ChoroplethMap {
  constructor(config, geojson, counts) {
    this.config = config;
    this.geojson = geojson;
    this.counts = counts;
    this.initVis();
  }

  initVis() {
    const vis = this;

    vis._selectedNeighborhood = null;
    vis.map = L.map(vis.config.parentElement);

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community",
        maxZoom: 16,
        minZoom: 10,
      },
    ).addTo(vis.map);

    const maxCount = d3.max([...vis.counts.values()]);
    vis.colorScale = d3
      .scaleSequential(d3.interpolateYlOrRd)
      .domain([0, maxCount]);

    vis.tooltip = d3.select("#tooltip");

    vis.geoLayer = L.geoJSON(vis.geojson, {
      style: (feature) => {
        const name = feature.properties.name?.trim().toUpperCase();
        const count = vis.counts.get(name) ?? 0;
        return {
          fillColor: vis.colorScale(count),
          fillOpacity: 0.75,
          weight: 1.5,
          color: "#555",
          opacity: 1,
        };
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties.name;
        const count = vis.counts.get(name?.trim().toUpperCase()) ?? 0;
        layer.on({
          mouseover: (e) => {
            e.target.setStyle({ weight: 3, color: "#222" });
            vis.tooltip
              .style("opacity", 1)
              .style("left", e.originalEvent.pageX + 10 + "px")
              .style("top", e.originalEvent.pageY - 20 + "px")
              .html(
                `<span class="tooltip-label">Neighborhood</span><br>${name}<br><span class="tooltip-label">Pothole Requests</span><br>${count}`,
              );
          },
          mousemove: (e) => {
            vis.tooltip
              .style("left", e.originalEvent.pageX + 10 + "px")
              .style("top", e.originalEvent.pageY - 20 + "px");
          },
          mouseout: (e) => {
            vis.geoLayer.resetStyle(e.target);
            // Re-apply selection styles after reset
            if (vis._selectedNeighborhood) {
              const n = e.target.feature.properties.name?.trim().toUpperCase();
              if (n === vis._selectedNeighborhood) {
                e.target.setStyle({ weight: 3, color: "#222", fillOpacity: 0.95 });
              } else {
                e.target.setStyle({ fillOpacity: 0.2 });
              }
            }
            vis.tooltip.style("opacity", 0);
          },
          click: (e) => {
            const clickedName = name?.trim().toUpperCase();
            const isSelected = vis._selectedNeighborhood === clickedName;

            vis.geoLayer.eachLayer((l) => vis.geoLayer.resetStyle(l));

            if (isSelected) {
              vis._selectedNeighborhood = null;
              if (window.onDashboardFilter) window.onDashboardFilter(null, null);
            } else {
              vis._selectedNeighborhood = clickedName;
              e.target.setStyle({ weight: 3, color: "#222", fillOpacity: 0.95 });
              vis.geoLayer.eachLayer((l) => {
                if (l !== e.target) l.setStyle({ fillOpacity: 0.2 });
              });
              vis._selfTriggered = true;
              if (window.onDashboardFilter) window.onDashboardFilter("NEIGHBORHOOD", name?.trim());
              vis._selfTriggered = false;
            }
          },
        });
      },
    }).addTo(vis.map);

    vis.map.fitBounds(vis.geoLayer.getBounds());

    vis.addLegend(maxCount);
  }

  filterData(rawRecords) {
    const vis = this;
    if (!vis._selfTriggered) {
      vis._selectedNeighborhood = null;
    }
    vis.counts = d3.rollup(
      rawRecords,
      (v) => v.length,
      (d) => (d.NEIGHBORHOOD ?? "").trim().toUpperCase(),
    );
    const maxCount = d3.max([...vis.counts.values()]) || 1;
    vis.colorScale.domain([0, maxCount]);
    vis.geoLayer.eachLayer((layer) => {
      const n = layer.feature.properties.name?.trim().toUpperCase();
      const isSelected = vis._selectedNeighborhood === n;
      const count = vis.counts.get(n) ?? 0;
      layer.setStyle({
        fillColor: vis.colorScale(count),
        fillOpacity: vis._selectedNeighborhood ? (isSelected ? 0.95 : 0.2) : 0.75,
        weight: isSelected ? 3 : 1.5,
        color: isSelected ? "#222" : "#555",
        opacity: 1,
      });
    });
  }

  addLegend(maxCount) {
    const vis = this;
    const legend = L.control({ position: "bottomright" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "legend");
      const steps = 5;
      div.innerHTML = "<strong>Pothole Requests</strong><br>";
      for (let i = steps; i >= 0; i--) {
        const value = Math.round((i / steps) * maxCount);
        div.innerHTML += `<i style="background:${vis.colorScale(value)}"></i> ${value}<br>`;
      }
      return div;
    };
    legend.addTo(vis.map);
  }
}
