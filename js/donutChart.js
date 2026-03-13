class DonutChart {
  constructor(config, data) {
    this.config = config;
    this.data = data;
    this.initVis();
  }

  initVis() {
    const vis = this;

    vis.margin = { top: 20, right: 20, bottom: 20, left: 20 };
    vis.size = 340;
    vis.radius = vis.size / 2 - 20;
    vis.innerRadius = vis.radius * 0.5;

    vis.svg = d3
      .select(`#${vis.config.parentElement}`)
      .append("svg")
      .attr("width", vis.size + vis.margin.left + vis.margin.right)
      .attr("height", vis.size + vis.margin.top + vis.margin.bottom);

    vis.chartG = vis.svg
      .append("g")
      .attr(
        "transform",
        `translate(${vis.size / 2 + vis.margin.left},${vis.size / 2 + vis.margin.top})`,
      );

    vis.centerLabel = vis.chartG
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.3em")
      .style("font-size", "22px")
      .style("font-weight", "600")
      .style("fill", "#333");

    vis.centerSub = vis.chartG
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1.2em")
      .style("font-size", "11px")
      .style("fill", "#888")
      .text("total pothole requests");

    vis.colorScale = d3
      .scaleOrdinal()
      .range(["#e85d04", "#f48c06", "#faa307", "#ffba08", "#d62828"]);

    vis.pie = d3
      .pie()
      .value((d) => d.count)
      .sort(null);
    vis.arc = d3.arc().innerRadius(vis.innerRadius).outerRadius(vis.radius);
    vis.arcHover = d3
      .arc()
      .innerRadius(vis.innerRadius)
      .outerRadius(vis.radius + 8);

    vis.tooltip = d3.select("#tooltip");

    vis.updateVis();
  }

  updateVis() {
    const vis = this;

    const total = d3.sum(vis.data, (d) => d.count);

    vis.colorScale.domain(vis.data.map((d) => d.department));

    vis.centerLabel.text(d3.format(",")(total));

    const arcs = vis.chartG
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
          .style("top", event.pageY - 20 + "px")
          .html(
            `<span class="tooltip-label">Department</span><br>${d.data.department}<br><span class="tooltip-label">Requests</span><br>${d3.format(",")(d.data.count)}<br><span class="tooltip-label">Share</span><br>${pct}%`,
          );
      })
      .on("mousemove", function (event) {
        vis.tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 20 + "px");
      })
      .on("mouseout", function () {
        d3.select(this).attr("d", vis.arc);
        vis.tooltip.style("opacity", 0);
      });

    // Legend
    const legendG = vis.svg
      .selectAll(".legend-group")
      .data(vis.data)
      .join("g")
      .attr("class", "legend-group")
      .attr(
        "transform",
        (_d, i) =>
          `translate(${vis.margin.left + 10}, ${vis.size + vis.margin.top - (vis.data.length - i) * 22 + 30})`,
      );

    legendG
      .selectAll("rect")
      .data((d) => [d])
      .join("rect")
      .attr("width", 14)
      .attr("height", 14)
      .attr("rx", 2)
      .attr("fill", (d) => vis.colorScale(d.department));

    legendG
      .selectAll("text")
      .data((d) => [d])
      .join("text")
      .attr("x", 20)
      .attr("y", 11)
      .style("font-size", "11px")
      .style("fill", "#444")
      .text((d) => `${d.department} (${d3.format(",")(d.count)})`);
  }
}
