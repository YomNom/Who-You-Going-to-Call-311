class LollipopChart {
  constructor(config, data) {
    this.config = config;
    this.data = data;
    this.initVis();
  }

  initVis() {
    const vis = this;

    vis.margin = { top: 10, right: 16, bottom: 38, left: 115 };

    const container = document.getElementById(vis.config.parentElement);
    const totalWidth  = (container ? container.clientWidth  : null) || vis.config.containerWidth  || 400;
    const containerH  = (container ? container.clientHeight : null) || vis.config.containerHeight || 180;

    vis.width  = totalWidth - vis.margin.left - vis.margin.right;
    vis.height = containerH - vis.margin.top  - vis.margin.bottom;

    vis.svg = d3.select(`#${vis.config.parentElement}`)
      .append('svg')
      .attr('width',  totalWidth)
      .attr('height', containerH)
      .attr('viewBox', `0 0 ${totalWidth} ${containerH}`)
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .style('display', 'block')
      .append('g')
      .attr('transform', `translate(${vis.margin.left},${vis.margin.top})`);

    vis.xScale = d3.scaleLinear().range([0, vis.width]);
    vis.yScale = d3.scaleBand().range([0, vis.height]).padding(0.35);

    vis.xAxisG = vis.svg.append('g')
      .attr('transform', `translate(0,${vis.height})`);

    vis.yAxisG = vis.svg.append('g');

    vis.svg.append('text')
      .attr('class', 'axis-label')
      .attr('x', vis.width / 2)
      .attr('y', vis.height + vis.margin.bottom - 6)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', '#777')
      .text('Number of Requests');

    vis.tooltip = d3.select('#tooltip');

    vis.updateVis();
  }

  updateVis() {
    const vis = this;

    vis.xScale.domain([0, d3.max(vis.data, d => d.count) || 1]);
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
        .attr('r', 5)
        .on('mouseover', (event, d) => {
          vis.tooltip
            .style('opacity', 1)
            .style('left', (event.pageX + 12) + 'px')
            .style('top',  (event.pageY - 28) + 'px')
            .html(
              `<span class="tooltip-label">Method</span><br>${d.method}<br>` +
              `<span class="tooltip-label">Requests</span><br>${d3.format(',')(d.count)}`
            );
        })
        .on('mousemove', (event) => {
          vis.tooltip
            .style('left', (event.pageX + 12) + 'px')
            .style('top',  (event.pageY - 28) + 'px');
        })
        .on('mouseout', () => {
          vis.tooltip.style('opacity', 0);
        })
        .on('click', function(event, d) {
          const isSelected = d3.select(this).classed('selected');
          vis.svg.selectAll('.lollipop-circle').classed('selected', false).attr('opacity', 1);
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

    vis.xAxisG.call(
      d3.axisBottom(vis.xScale)
        .ticks(4)
        .tickFormat(d3.format('~s'))
        .tickSizeOuter(0)
    ).selectAll('text').style('font-size', '10px');

    vis.yAxisG.call(d3.axisLeft(vis.yScale).tickSizeOuter(0))
      .selectAll('text')
        .style('font-size', '10px')
        .each(function() {
          // truncate labels longer than ~16 chars to keep them inside margin
          const el = d3.select(this);
          const label = el.text();
          if (label.length > 16) el.text(label.slice(0, 15) + '…');
        });
  }

  filterData(rawRecords) {
    const vis = this;
    const methodCounts = d3.rollup(
      rawRecords,
      v => v.length,
      d => d.METHOD_RECEIVED
    );
    vis.data = Array.from(methodCounts, ([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count);

    vis.svg.selectAll('.lollipop-circle').classed('selected', false).attr('opacity', 1);
    vis.svg.selectAll('.lollipop-line').attr('opacity', 1);
    vis.updateVis();
  }
}
