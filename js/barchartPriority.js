// plots the priority of the data
class barchartPriority {
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      colorScale: _config.colorScale,
      containerWidth: _config.containerWidth || 260,
      containerHeight: _config.containerHeight || 180,
      margin: _config.margin || { top: 10, right: 14, bottom: 50, left: 40 },
    };
    this.data = _data;
    this.initVis();
  }

  initVis() {
    let vis = this;

    const container = document.getElementById(vis.config.parentElement);
    const containerW = (container ? container.clientWidth  : null) || vis.config.containerWidth;
    const containerH = (container ? container.clientHeight : null) || vis.config.containerHeight;

    vis.width  = containerW - vis.config.margin.left - vis.config.margin.right;
    vis.height = containerH - vis.config.margin.top  - vis.config.margin.bottom;

    vis.colorScale = vis.config.colorScale || d3.scaleOrdinal()
      .range(['#eee1cd', '#ca9f5f', '#c77203', '#8b4300'])
      .domain(['Standard', 'Priority', 'Hazardous', 'Emergency']);

    vis.yScale = d3.scaleLinear().range([vis.height, 0]);
    vis.xScale = d3.scaleBand().range([0, vis.width]).paddingInner(0.22);

    vis.xAxis = d3.axisBottom(vis.xScale).tickSizeOuter(0);
    vis.yAxis = d3.axisLeft(vis.yScale).ticks(4).tickSizeOuter(0).tickFormat(d3.format('~s'));

    vis.svg = d3.select(`#${vis.config.parentElement}`)
      .append('svg')
      .attr('width',  containerW)
      .attr('height', containerH)
      .attr('viewBox', `0 0 ${containerW} ${containerH}`)
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .style('display', 'block');

    vis.chart = vis.svg.append('g')
      .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    vis.xAxisG = vis.chart.append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0,${vis.height})`);

    vis.yAxisG = vis.chart.append('g')
      .attr('class', 'axis y-axis');

    vis.tooltip = d3.select('#tooltip');

    vis.updateVis();
  }

  updateVis() {
    let vis = this;

    const orderedKeys = ['Standard', 'Priority', 'Hazardous', 'Emergency'];

    vis.aggregatedData = vis.data
      .filter(d => d.priority && String(d.priority).trim() !== '')
      .map(d => ({ key: String(d.priority).trim(), count: +d.count || 0 }))
      .sort((a, b) => orderedKeys.indexOf(a.key) - orderedKeys.indexOf(b.key));

    vis.total = d3.sum(vis.aggregatedData, d => d.count);

    vis.xScale.domain(vis.aggregatedData.map(d => d.key));
    vis.yScale.domain([0, d3.max(vis.aggregatedData, d => d.count)]);

    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    vis.chart.selectAll('.bar')
      .data(vis.aggregatedData, d => d.key)
      .join('rect')
        .attr('class', 'bar')
        .attr('x',      d => vis.xScale(d.key))
        .attr('width',  vis.xScale.bandwidth())
        .attr('y',      d => vis.yScale(d.count))
        .attr('height', d => vis.height - vis.yScale(d.count))
        .attr('fill',   d => vis.colorScale(d.key))
        .on('mouseover', function(event, d) {
          const pct = vis.total > 0 ? ((d.count / vis.total) * 100).toFixed(1) : '0.0';
          vis.tooltip
            .style('opacity', 1)
            .style('left', (event.pageX + 12) + 'px')
            .style('top',  (event.pageY - 28) + 'px')
            .html(
              `<span class="tooltip-label">Priority</span><br>${d.key}<br>` +
              `<span class="tooltip-label">Requests</span><br>${d3.format(',')(d.count)}<br>` +
              `<span class="tooltip-label">Share</span><br>${pct}%`
            );
          if (!d3.select(this).classed('selected')) {
            d3.select(this).attr('opacity', 0.78);
          }
        })
        .on('mousemove', function(event) {
          vis.tooltip
            .style('left', (event.pageX + 12) + 'px')
            .style('top',  (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
          vis.tooltip.style('opacity', 0);
          if (!d3.select(this).classed('selected')) {
            d3.select(this).attr('opacity', 1);
          }
        })
        .on('click', function(event, d) {
          const isSelected = d3.select(this).classed('selected');
          vis.chart.selectAll('.bar').classed('selected', false).attr('opacity', 1);
          if (!isSelected) {
            d3.select(this).classed('selected', true);
            vis.chart.selectAll('.bar:not(.selected)').attr('opacity', 0.25);
            if (window.onDashboardFilter) window.onDashboardFilter('PRIORITY', d.key);
          } else {
            if (window.onDashboardFilter) window.onDashboardFilter(null, null);
          }
        });

    vis.xAxisG.call(vis.xAxis)
      .selectAll('text')
        .attr('transform', 'rotate(-32)')
        .style('text-anchor', 'end')
        .attr('dx', '-0.4em')
        .attr('dy',  '0.55em')
        .style('font-size', '10px');

    vis.yAxisG.call(vis.yAxis)
      .selectAll('text')
        .style('font-size', '10px');
  }

  filterData(rawRecords) {
    const vis = this;
    const priorityOrder = ['Standard', 'Priority', 'Hazardous', 'Emergency'];
    const priorityLabelLookup = new Map(priorityOrder.map(p => [p.toUpperCase(), p]));

    const priorityCounts = d3.rollup(
      rawRecords,
      v => v.length,
      d => {
        const raw = (d.PRIORITY ?? '').trim();
        return priorityLabelLookup.get(raw.toUpperCase()) || raw;
      }
    );

    vis.data = priorityOrder.map(priority => ({
      priority,
      count: priorityCounts.get(priority) ?? 0,
    }));

    vis.chart.selectAll('.bar').classed('selected', false).attr('opacity', 1);
    vis.updateVis();
  }
}
