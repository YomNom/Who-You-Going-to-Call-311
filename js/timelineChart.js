/**
 * TimelineChart – daily line chart of pothole requests across 2022.
 *
 * Design:
 *   - One point per calendar week (52 points) connected by a line
 *   - Tan-orange palette (#c77203 line, #e85d04 dots)
 *   - Filled area under the line for readability
 *   - d3 brushX for range selection → fires onBrush(filteredRecords)
 *   - filterData(records): dims area outside active range via an overlay rect
 */
class TimelineChart {
  constructor(config, data, onBrush) {
    this.config         = config;
    this.fullData       = data;
    this.onBrush        = onBrush || (() => {});
    this._suppressBrush = false;
    this.initVis();
  }

  // Date parsing
  static _parsers = [
    d3.timeParse('%m/%d/%Y %H:%M'),
    d3.timeParse('%m/%d/%Y'),
    d3.timeParse('%Y-%m-%d %H:%M:%S'),
    d3.timeParse('%Y-%m-%d'),
  ];

  static parseDate(str) {
    if (!str) return null;
    for (const p of TimelineChart._parsers) {
      const d = p(str.trim());
      if (d) return d;
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  // Bin records into daily buckets
  static binByDay(records) {
    records.forEach(d => {
      if (!('_parsedDate' in d))
        d._parsedDate = TimelineChart.parseDate(d.DATE_TIME_RECEIVED);
    });
    const withDates = records.filter(d => d._parsedDate);
    // Use numeric timestamp as key — Date objects fail Map equality (reference comparison)
    const counts = d3.rollup(
      withDates,
      v => v.length,
      d => d3.timeDay.floor(d._parsedDate).getTime(),
    );
    return Array.from(counts, ([ts, count]) => ({ day: new Date(ts), count }))
      .sort((a, b) => a.day - b.day);
  }

  initVis() {
    const vis = this;

    vis.margin = { top: 22, right: 20, bottom: 38, left: 48 };

    const container = document.getElementById(vis.config.parentElement);
    const panel = container
      ? (container.closest('#timeline-panel') || container.parentElement)
      : null;
    vis.containerWidth  = container ? container.clientWidth  - 4 : 1100;
    vis.containerHeight = panel     ? panel.clientHeight     - 4 : 140;

    vis.width  = vis.containerWidth  - vis.margin.left - vis.margin.right;
    vis.height = vis.containerHeight - vis.margin.top  - vis.margin.bottom;

    vis.svg = d3.select(`#${vis.config.parentElement}`)
      .append('svg')
      .attr('width',  vis.containerWidth)
      .attr('height', vis.containerHeight);

    // Title
    vis.svg.append('text')
      .attr('class', 'chart-title')
      .attr('x', vis.containerWidth / 2)
      .attr('y', 14)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .text('Pothole Requests by Day (2022) - drag to filter');

    vis.chart = vis.svg.append('g')
      .attr('transform', `translate(${vis.margin.left},${vis.margin.top})`);

    // Clip path
    vis.svg.append('defs').append('clipPath')
      .attr('id', 'timeline-clip')
      .append('rect').attr('width', vis.width).attr('height', vis.height + 4);

    vis.areaG = vis.chart.append('g').attr('clip-path', 'url(#timeline-clip)');

    // Scales
    vis.xScale = d3.scaleTime().range([0, vis.width]);
    vis.yScale = d3.scaleLinear().range([vis.height, 0]).nice();

    // Axes
    vis.xAxisG = vis.chart.append('g').attr('transform', `translate(0,${vis.height})`);
    vis.yAxisG = vis.chart.append('g');

    // Axis labels
    vis.chart.append('text')
      .attr('class', 'axis-label')
      .attr('x', vis.width / 2)
      .attr('y', vis.height + vis.margin.bottom - 4)
      .attr('text-anchor', 'middle')
      .text('Month (2022)');

    vis.chart.append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(vis.height / 2))
      .attr('y', -vis.margin.left + 12)
      .attr('text-anchor', 'middle')
      .text('Requests / Day');

    // Brush on top of everything
    vis.brush = d3.brushX()
      .extent([[0, 0], [vis.width, vis.height]])
      .on('brush', vis._brushLive.bind(vis))
      .on('end', vis._brushed.bind(vis));
    vis.brushG = vis.chart.append('g').attr('class', 'brush');

    vis.tooltip = d3.select('#tooltip');

    vis.dailyData = TimelineChart.binByDay(vis.fullData);
    vis.renderVis();
  }

  renderVis() {
    const vis = this;
    if (!vis.dailyData.length) return;

    const days = vis.dailyData.map(d => d.day);
    vis.xScale.domain([d3.min(days), d3.timeDay.offset(d3.max(days), 1)]);
    vis.yScale.domain([0, d3.max(vis.dailyData, d => d.count)]).nice();

    // Area generator
    const area = d3.area()
      .x(d => vis.xScale(d.day))
      .y0(vis.height)
      .y1(d => vis.yScale(d.count))
      .curve(d3.curveMonotoneX);

    // Line generator
    const line = d3.line()
      .x(d => vis.xScale(d.day))
      .y(d => vis.yScale(d.count))
      .curve(d3.curveMonotoneX);

    // Area fill (lighter)
    vis.areaG.selectAll('.timeline-area')
      .data([vis.dailyData])
      .join('path')
        .attr('class', 'timeline-area')
        .attr('d', area)
        .attr('fill', '#eee1cd')
        .attr('opacity', 0.7);

    // Line
    vis.areaG.selectAll('.timeline-line')
      .data([vis.dailyData])
      .join('path')
        .attr('class', 'timeline-line')
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', '#c77203')
        .attr('stroke-width', 2);

    // Visible markers, small but always shown at low opacity
    vis.areaG.selectAll('.timeline-dot')
      .data(vis.dailyData)
      .join('circle')
        .attr('class', 'timeline-dot')
        .attr('cx', d => vis.xScale(d.day))
        .attr('cy', d => vis.yScale(d.count))
        .attr('r', 2.5)
        .attr('fill', '#e85d04')
        .attr('stroke', 'none')
        .attr('opacity', 0.5)
        .attr('pointer-events', 'none');  // overlay handles events

    // Invisible overlay rect — bisector finds nearest day on mousemove
    vis.areaG.selectAll('.timeline-overlay')
      .data([null])
      .join('rect')
        .attr('class', 'timeline-overlay')
        .attr('width', vis.width)
        .attr('height', vis.height)
        .attr('fill', 'none')
        .attr('pointer-events', 'none'); // brush sits on top; attach events to brushG below

    // Tooltip to brushG, receives all mouse events over the chart
    vis.brushG
      .on('mousemove.tooltip', (event) => {
        const [mx] = d3.pointer(event);
        const hovDate = vis.xScale.invert(mx);
        const bisect = d3.bisector(d => d.day).left;
        const i = bisect(vis.dailyData, hovDate, 1);
        const d0 = vis.dailyData[i - 1];
        const d1 = vis.dailyData[i];
        const d = (!d1 || (hovDate - d0.day < d1.day - hovDate)) ? d0 : d1;
        if (!d) return;

        vis.areaG.selectAll('.timeline-dot')
          .attr('opacity', pt => pt.day.getTime() === d.day.getTime() ? 1 : 0.25)
          .attr('r',       pt => pt.day.getTime() === d.day.getTime() ? 4 : 2.5);

        vis.tooltip
          .style('opacity', 1)
          .style('left', event.pageX + 12 + 'px')
          .style('top',  event.pageY - 24 + 'px')
          .html(
            `<span class="tooltip-label">Date</span><br>${d3.timeFormat('%b %d, %Y')(d.day)}` +
            `<br><span class="tooltip-label">Requests</span><br>${d3.format(',')(d.count)}`
          );
      })
      .on('mouseleave.tooltip', () => {
        vis.areaG.selectAll('.timeline-dot').attr('opacity', 0.5).attr('r', 2.5);
        vis.tooltip.style('opacity', 0);
      });

    // Dim overlay, starts invisible, used by brush and filterData
    vis.dimOverlayL = vis.areaG.selectAll('.dim-overlay-l')
      .data([null]).join('rect').attr('class', 'dim-overlay-l')
      .attr('y', 0).attr('height', vis.height)
      .attr('fill', '#f7f7f7').attr('opacity', 0).attr('pointer-events', 'none');

    vis.dimOverlayR = vis.areaG.selectAll('.dim-overlay-r')
      .data([null]).join('rect').attr('class', 'dim-overlay-r')
      .attr('y', 0).attr('height', vis.height)
      .attr('fill', '#f7f7f7').attr('opacity', 0).attr('pointer-events', 'none');

    vis.xAxisG.call(
      d3.axisBottom(vis.xScale)
        .ticks(d3.timeMonth)
        .tickFormat(d3.timeFormat('%b'))
        .tickSizeOuter(0)
    );
    vis.yAxisG.call(
      d3.axisLeft(vis.yScale)
        .ticks(3)
        .tickSizeOuter(0)
    );

    vis.brushG.call(vis.brush);
  }

  // Show dim overlays outside [x0, x1] pixel range
  _applyDim(x0, x1) {
    const vis = this;
    const dimOpacity = 0.65;
    vis.dimOverlayL
      .attr('x', 0).attr('width', Math.max(0, x0)).attr('opacity', dimOpacity);
    vis.dimOverlayR
      .attr('x', x1).attr('width', Math.max(0, vis.width - x1)).attr('opacity', dimOpacity);
  }

  _clearDim() {
    const vis = this;
    vis.dimOverlayL && vis.dimOverlayL.attr('opacity', 0);
    vis.dimOverlayR && vis.dimOverlayR.attr('opacity', 0);
  }

  // Live brush handler — updates charts while dragging/moving
  _brushLive(event) {
    const vis = this;
    if (vis._suppressBrush || !event.selection) return;

    const [x0, x1] = event.selection;
    vis._applyDim(x0, x1);

    const startDate = vis.xScale.invert(x0);
    const endDate   = vis.xScale.invert(x1);

    const filtered = vis.fullData.filter(
      d => d._parsedDate && d._parsedDate >= startDate && d._parsedDate <= endDate
    );
    if (vis.onBrush) vis.onBrush(filtered);
  }

  // Brush end handler
  _brushed(event) {
    const vis = this;
    if (vis._suppressBrush) return;

    if (!event.selection) {
      vis._clearDim();
      if (vis.onBrush) vis.onBrush(vis.fullData);
      return;
    }

    const [x0, x1]  = event.selection;
    vis._applyDim(x0, x1);

    const startDate = vis.xScale.invert(x0);
    const endDate   = vis.xScale.invert(x1);

    const filtered = vis.fullData.filter(
      d => d._parsedDate && d._parsedDate >= startDate && d._parsedDate <= endDate
    );
    if (vis.onBrush) vis.onBrush(filtered);
  }

  // Linking filter from another chart
  filterData(rawRecords) {
    const vis = this;
    const isReset = rawRecords.length === vis.fullData.length;

    if (isReset) {
      vis._clearDim();
    } else {
      const dates = rawRecords.filter(d => d._parsedDate).map(d => d._parsedDate);
      if (dates.length) {
        const x0 = vis.xScale(d3.min(dates));
        const x1 = vis.xScale(d3.max(dates));
        vis._applyDim(x0, x1);
      }
    }

    vis._suppressBrush = true;
    vis.brushG.call(vis.brush.move, null);
    vis._suppressBrush = false;
  }
}
