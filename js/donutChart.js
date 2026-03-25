class DonutChart {
  constructor(config, data) {
    this.config = config;
    this.data = data;
    this.initVis();
  }

  initVis() {
    const vis = this;

    // config.filterField  – CSV field to filter on (default: 'DEPT_NAME')
    // config.subtitle     – center label subtitle (default: 'total pothole requests')
    vis._filterField = vis.config.filterField || 'DEPT_NAME';
    vis._subtitle    = vis.config.subtitle    || 'by department';

    // Read actual container dimensions so the donut fills its cell
    const container = document.getElementById(vis.config.parentElement);
    const cellW = container ? container.clientWidth  : 200;
    const cellH = container ? container.clientHeight : 200;

    // Title takes ~20px, leave equal padding on sides
    const titleH   = 20;
    const pad       = 6;
    const available = Math.min(cellW - pad * 2, cellH - titleH - pad * 2);

    vis.size        = Math.max(80, available);
    vis.margin      = { top: titleH, right: pad, bottom: pad, left: pad };
    vis.radius      = vis.size / 2 - 6;
    vis.innerRadius = vis.radius * 0.45;

    const svgW = vis.size + vis.margin.left + vis.margin.right;
    const svgH = vis.size + vis.margin.top  + vis.margin.bottom;

    vis.svg = d3
      .select(`#${vis.config.parentElement}`)
      .append("svg")
      .attr("width",  svgW)
      .attr("height", svgH)
      .attr("viewBox", `0 0 ${svgW} ${svgH}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    // Title above ring
    vis.svg.append("text")
      .attr("x", svgW / 2)
      .attr("y", 14)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .style("font-weight", "600")
      .style("fill", "#444")
      .text(vis._subtitle);

    vis.chartG = vis.svg
      .append("g")
      .attr("transform",
        `translate(${vis.size / 2 + vis.margin.left},${vis.size / 2 + vis.margin.top})`);

    // Center count — font scales with donut size
    vis.centerLabel = vis.chartG.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("font-size", `${Math.max(11, Math.round(vis.size * 0.13))}px`)
      .style("font-weight", "600")
      .style("fill", "#333");

    vis.colorScale = vis.config.colorScale || d3.scaleOrdinal()
      .range(['#eee1cd', '#ca9f5f', '#c77203', '#e85d04', '#8b4300',
              '#f4a261', '#d4a373', '#a3785d', '#7a5230', '#4a2d14']);

    vis.pie = d3.pie().value((d) => d.count).sort(null);
    vis.arc = d3.arc().innerRadius(vis.innerRadius).outerRadius(vis.radius);
    vis.arcHover = d3.arc().innerRadius(vis.innerRadius).outerRadius(vis.radius + 8);

    vis.tooltip = d3.select("#tooltip");

    vis.updateVis();
  }

  updateVis() {
    const vis = this;

    const total = d3.sum(vis.data, (d) => d.count);
    // Only set domain on the internal scale; external scales keep their own domain
    if (!vis.config.colorScale) vis.colorScale.domain(vis.data.map((d) => d.department));
    vis.centerLabel.text(d3.format(",")(total));

    vis.chartG
      .selectAll(".arc")
      .data(vis.pie(vis.data))
      .join("path")
      .attr("class", "arc")
      .attr("fill", (d) => vis.colorScale(d.data.department))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("d", vis.arc)
      .on("mouseover", function (event, d) {
        d3.select(this).attr("d", vis.arcHover);
        const pct = ((d.data.count / total) * 100).toFixed(1);
        vis.tooltip
          .style("opacity", 1)
          .style("left", event.pageX + 10 + "px")
          .style("top",  event.pageY - 20 + "px")
          .html(
            `<span class="tooltip-label">${vis._filterField === 'NEIGHBORHOOD' ? 'Neighborhood' : 'Department'}</span><br>` +
            `${d.data.department}<br>` +
            `<span class="tooltip-label">Requests</span><br>${d3.format(",")(d.data.count)}<br>` +
            `<span class="tooltip-label">Share</span><br>${pct}%`
          );
      })
      .on("mousemove", function (event) {
        vis.tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top",  event.pageY - 20 + "px");
      })
      .on("mouseout", function () {
        d3.select(this).attr("d", vis.arc);
        vis.tooltip.style("opacity", 0);
      })
      .on("click", function (event, d) {
        const isSelected = d3.select(this).classed("selected");
        vis.chartG.selectAll(".arc")
          .classed("selected", false)
          .attr("opacity", 1)
          .attr("d", vis.arc);
        if (!isSelected) {
          d3.select(this).classed("selected", true);
          vis.chartG.selectAll(".arc:not(.selected)").attr("opacity", 0.25);
          if (window.onDashboardFilter) window.onDashboardFilter(vis._filterField, d.data.department);
        } else {
          if (window.onDashboardFilter) window.onDashboardFilter(null, null);
        }
      });
  }

  // Linking re-aggregated data from raw records based on priority field
  filterData(rawRecords) {
    const vis = this;
    const counts = d3.rollup(
      rawRecords,
      v => v.length,
      d => (d[vis._filterField] || "").trim()
    );
    vis.data = Array.from(counts, ([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    vis.chartG.selectAll(".arc").classed("selected", false).attr("opacity", 1);
    vis.updateVis();
  }
}
