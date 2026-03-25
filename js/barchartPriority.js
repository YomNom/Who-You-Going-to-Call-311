// plots the priority of the data
class barchartPriority {
  /**
   * Class constructor with basic chart configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _data) {
    // Configuration object with defaults
    this.config = {
      parentElement: _config.parentElement,
      colorScale: _config.colorScale,
      containerWidth: _config.containerWidth || 260,
      containerHeight: _config.containerHeight || 400,
      margin: _config.margin || {top: 25, right: 20, bottom: 20, left: 40},
    }
    this.data = _data;
    this.initVis();
  }
  
  /**
   * Initialize scales/axes and append static elements, such as axis titles
   */
  initVis() {
    let vis = this;

    // Read container width so the chart fills its panel column
    const container = document.getElementById(vis.config.parentElement);
    const containerW = (container ? container.clientWidth : null) || vis.config.containerWidth;
    const containerH = vis.config.containerHeight;

    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.width  = containerW - vis.config.margin.left - vis.config.margin.right;
    vis.height = containerH - vis.config.margin.top  - vis.config.margin.bottom;

    // Initialize scales and axes
    
    // Use provided color scale from main.js when available.
    vis.colorScale = vis.config.colorScale || d3.scaleOrdinal()
      .range(['#eee1cd', '#ca9f5f', '#c77203', '#8b4300'])
      .domain(['Standard','Priority','Hazardous', 'Emergency']);
    
    // Important: we flip array elements in the y output range to position the rectangles correctly
    vis.yScale = d3.scaleLinear()
        .range([vis.height, 0]) 

    vis.xScale = d3.scaleBand()
        .range([0, vis.width])
        .paddingInner(0.2);

    vis.xAxis = d3.axisBottom(vis.xScale)
      .tickSizeOuter(0);

    vis.yAxis = d3.axisLeft(vis.yScale)
        .ticks(6)
        .tickSizeOuter(0)

    // Define size of SVG drawing area
    vis.svg = d3.select(`#${vis.config.parentElement}`)
      .append('svg')
      .attr('width',  containerW)
      .attr('height', containerH)
      .attr('viewBox', `0 0 ${containerW} ${containerH}`)
      .attr('preserveAspectRatio', 'xMinYMin meet');

    // SVG Group containing the actual chart; D3 margin convention
    vis.chart = vis.svg.append('g')
        .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    // Append empty x-axis group and move it to the bottom of the chart
    vis.xAxisG = vis.chart.append('g')
        .attr('class', 'axis x-axis')
        .attr('transform', `translate(0,${vis.height})`);
    
    // Append y-axis group 
    vis.yAxisG = vis.chart.append('g')
        .attr('class', 'axis y-axis');

    // Append axis title
    vis.svg.append('text')
        .attr('class', 'axis-title')
        .attr('x', 0)
        .attr('y', 0)
        .attr('dy', '.71em')
      .text('Priority');

    vis.updateVis();
  }

  /**
   * Prepare data and scales before we render it
   */
  updateVis() {
    let vis = this;

    vis.aggregatedData = vis.data
      .filter(d => d.priority && String(d.priority).trim() !== '')
      .map(d => ({ key: String(d.priority).trim(), count: +d.count || 0 }));

    const orderedKeys = ['Standard','Priority','Hazardous', 'Emergency'];
    vis.aggregatedData = vis.aggregatedData.sort((a,b) => {
      return orderedKeys.indexOf(a.key) - orderedKeys.indexOf(b.key);
    });

    // Specificy accessor functions
    vis.colorValue = d => d.key;
    vis.xValue = d => d.key;
    vis.yValue = d => d.count;

    // Set the scale input domains
    vis.xScale.domain(vis.aggregatedData.map(vis.xValue));
    vis.yScale.domain([0, d3.max(vis.aggregatedData, vis.yValue)]);

    vis.renderVis();
  }

  /**
   * Bind data to visual elements
   */
  renderVis() {
    let vis = this;

    // Add rectangles
    const bars = vis.chart.selectAll('.bar')
        .data(vis.aggregatedData, vis.xValue)
      .join('rect')
        .attr('class', 'bar')
        .attr('x', d => vis.xScale(vis.xValue(d)))
        .attr('width', vis.xScale.bandwidth())
        .attr('height', d => vis.height - vis.yScale(vis.yValue(d)))
        .attr('y', d => vis.yScale(vis.yValue(d)))
        .attr('fill', d => vis.colorScale(vis.colorValue(d)))
        // Linking click to filter by priority
        .on('click', function(event, d) {
          const isSelected = d3.select(this).classed('selected');
          vis.chart.selectAll('.bar')
            .classed('selected', false)
            .attr('opacity', 1);
          if (!isSelected) {
            d3.select(this).classed('selected', true);
            vis.chart.selectAll('.bar:not(.selected)').attr('opacity', 0.25);
            if (window.onDashboardFilter) window.onDashboardFilter('PRIORITY', d.key);
          } else {
            if (window.onDashboardFilter) window.onDashboardFilter(null, null);
          }
        });

    // Update axes
    vis.xAxisG.call(vis.xAxis);
    vis.yAxisG.call(vis.yAxis);
  }

  // Linking re-aggregated data from raw records based on priority field
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

    // Clear selection state
    vis.chart.selectAll('.bar').classed('selected', false).attr('opacity', 1);
    vis.updateVis();
  }
}
