class LollipopChart {
  constructor(config, data) {
    this.config = config;
    this.data = data;
    this.initVis();
  }

  initVis() {
    const vis = this;

    vis.margin = { top: 14, right: 20, bottom: 44, left: 140 };

    const container = document.getElementById(vis.config.parentElement);
    const totalWidth = container.clientWidth || 800;

    vis.width = totalWidth - vis.margin.left - vis.margin.right;
    vis.height = (vis.config.containerHeight || 230) - vis.margin.top - vis.margin.bottom;

    const svgH = vis.height + vis.margin.top + vis.margin.bottom;
    vis.svg = d3.select(`#${vis.config.parentElement}`)
      .append('svg')
      .attr('width', totalWidth)
      .attr('height', svgH)
      .attr('viewBox', `0 0 ${totalWidth} ${svgH}`)
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .append('g')
      .attr('transform', `translate(${vis.margin.left},${vis.margin.top})`);

    vis.xScale = d3.scaleLinear().range([0, vis.width]);
    vis.yScale = d3.scaleBand().range([0, vis.height]).padding(0.3);

    vis.xAxisG = vis.svg.append('g')
      .attr('transform', `translate(0,${vis.height})`);

    vis.yAxisG = vis.svg.append('g');

    vis.svg.append('text')
      .attr('class', 'axis-label')
      .attr('x', vis.width / 2)
      .attr('y', vis.height + vis.margin.bottom - 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#555')
      .text('Number of Requests');

    vis.tooltip = d3.select('#tooltip');

    vis.updateVis();
  }

  updateVis() {
    const vis = this;

    const maxCount = d3.max(vis.data, d => d.count);

    vis.xScale.domain([0, maxCount]);
    vis.yScale.domain(vis.data.map(d => d.method));

    const midY = d => vis.yScale(d.method) + vis.yScale.bandwidth() / 2;

    vis.svg.selectAll('.lollipop-line')
      .data(vis.data)
      .join('line')
      .attr('class', 'lollipop-line')
      .attr('x1', 0)
      .attr('x2', d => vis.xScale(d.count))
      .attr('y1', midY)
      .attr('y2', midY);

    vis.svg.selectAll('.lollipop-circle')
      .data(vis.data)
      .join('circle')
      .attr('class', 'lollipop-circle')
      .attr('cx', d => vis.xScale(d.count))
      .attr('cy', midY)
      .attr('r', 6)
      .on('mouseover', (event, d) => {
        vis.tooltip
          .style('opacity', 1)
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 20 + 'px')
          .html(`<span class="tooltip-label">Method</span><br>${d.method}<br><span class="tooltip-label">Requests</span><br>${d3.format(',')(d.count)}`);
      })
      .on('mousemove', (event) => {
        vis.tooltip
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 20 + 'px');
      })
      .on('mouseout', () => {
        vis.tooltip.style('opacity', 0);
      })
      // Linking click to filter by method received
      .on('click', function(event, d) {
        const isSelected = d3.select(this).classed('selected');
        vis.svg.selectAll('.lollipop-circle')
          .classed('selected', false)
          .attr('opacity', 1);
        vis.svg.selectAll('.lollipop-line').attr('opacity', 1);
        if (!isSelected) {
          d3.select(this).classed('selected', true);
          vis.svg.selectAll('.lollipop-circle:not(.selected)').attr('opacity', 0.2);
          vis.svg.selectAll('.lollipop-line').filter(ld => ld.method !== d.method).attr('opacity', 0.2);
          if (window.onDashboardFilter) window.onDashboardFilter('METHOD_RECEIVED', d.method);
        } else {
          if (window.onDashboardFilter) window.onDashboardFilter(null, null);
        }
      });

    vis.xAxisG.call(d3.axisBottom(vis.xScale).tickFormat(d3.format(',')));
    vis.yAxisG.call(d3.axisLeft(vis.yScale));
  }

  // Linking re-aggregated data from raw records based on priority field
  filterData(rawRecords) {
    const vis = this;
    const methodCounts = d3.rollup(
      rawRecords,
      v => v.length,
      d => d.METHOD_RECEIVED
    );
    vis.data = Array.from(methodCounts, ([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count);

    // Clear selection state
    vis.svg.selectAll('.lollipop-circle').classed('selected', false).attr('opacity', 1);
    vis.svg.selectAll('.lollipop-line').attr('opacity', 1);
    vis.updateVis();
  }
}
