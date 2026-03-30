class WordCloud {
  constructor(config, fullBulkyData, fullPotholeCount) {
    this.config = config;
    this._fullBulkyData = fullBulkyData;
    this._currentBulkyData = fullBulkyData;
    this._fullPotholeCount = fullPotholeCount;
    this._selectedWord = null;
    this._layoutGen = 0;
    this.onWordClick = null;
    this.initVis();
  }

  initVis() {
    const vis = this;

    const container = document.getElementById(vis.config.parentElement);
    vis._w = container ? Math.max(container.clientWidth,  200) : 400;
    vis._h = container ? Math.max(container.clientHeight, 130) : 160;

    // HTML overlay for empty / error states — more reliable than SVG text
    vis.emptyMsg = d3
      .select(`#${vis.config.parentElement}`)
      .append("p")
      .attr("class", "wc-empty-msg");

    vis.svg = d3
      .select(`#${vis.config.parentElement}`)
      .append("svg")
      .attr("width",  vis._w)
      .attr("height", vis._h)
      .attr("viewBox", `0 0 ${vis._w} ${vis._h}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    // Centered group — d3-cloud places words relative to (0,0)
    vis.wordsG = vis.svg
      .append("g")
      .attr("transform", `translate(${vis._w / 2},${vis._h / 2})`);

    vis.colorScale = d3.scaleOrdinal(d3.schemeTableau10);

    vis.tooltip = d3.select("#tooltip");

    vis.updateVis();
  }

  _showEmpty(msg) {
    const vis = this;
    vis.emptyMsg.text(msg).style("display", "block");
    vis.svg.style("display", "none");
  }

  _hideEmpty() {
    const vis = this;
    vis.emptyMsg.style("display", "none");
    vis.svg.style("display", "block");
  }

  _aggregateItems(records) {
    const counts = new Map();

    records.forEach(d => {
      for (let i = 1; i <= 5; i++) {
        const item = (d[`BULKY_ITEM_${i}`] || "").trim().toUpperCase();
        if (item) counts.set(item, (counts.get(item) || 0) + 1);
      }
      if (d.NUM_TIRES    > 0) counts.set("TIRES",         (counts.get("TIRES")         || 0) + d.NUM_TIRES);
      if (d.NUM_FREONS   > 0) counts.set("FREON/AC UNIT", (counts.get("FREON/AC UNIT") || 0) + d.NUM_FREONS);
      if (d.NUM_SOFABEDS > 0) counts.set("SOFA BED",      (counts.get("SOFA BED")      || 0) + d.NUM_SOFABEDS);
    });

    return Array.from(counts, ([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 40);
  }

  updateVis() {
    const vis = this;
    const items = vis._aggregateItems(vis._currentBulkyData);
    const total = d3.sum(items, d => d.value);

    if (total === 0) {
      vis.wordsG.selectAll("text.cloud-word").remove();
      vis._showEmpty("No bulky items found for this selection.");
      return;
    }

    if (typeof d3.layout === "undefined" || typeof d3.layout.cloud !== "function") {
      vis._showEmpty("Word cloud library unavailable.");
      return;
    }

    vis._hideEmpty();

    const [minVal, maxVal] = d3.extent(items, d => d.value);
    const fontScale = d3.scaleSqrt()
      .domain([minVal, maxVal])
      .range([10, Math.min(36, vis._h * 0.22)]);

    vis.colorScale.domain(items.map(d => d.text));

    const gen = ++vis._layoutGen;

    d3.layout.cloud()
      .size([vis._w, vis._h])
      .words(items.map(d => ({ text: d.text, size: fontScale(d.value), value: d.value })))
      .padding(4)
      .rotate(() => Math.random() < 0.75 ? 0 : 90)
      .font("Segoe UI")
      .fontSize(d => d.size)
      .on("end", words => {
        if (gen !== vis._layoutGen) return;
        if (words.length === 0) {
          vis._showEmpty("No bulky items found for this selection.");
          return;
        }
        vis._drawWords(words);
      })
      .start();
  }

  _drawWords(words) {
    const vis = this;

    vis.wordsG
      .selectAll("text.cloud-word")
      .data(words, d => d.text)
      .join(
        enter => enter
          .append("text")
          .attr("class", "cloud-word")
          .attr("text-anchor", "middle")
          .style("font-family", "Segoe UI, Tahoma, sans-serif")
          .style("font-size",   d => d.size + "px")
          .style("fill",        d => vis.colorScale(d.text))
          .style("cursor", "pointer")
          .attr("transform",    d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
          .text(d => d.text)
          .style("opacity", 1)
          .call(s => vis._attachHandlers(s)),
        update => update
          .text(d => d.text)
          .call(s => s.transition().duration(400)
            .attr("transform", d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
            .style("font-size", d => d.size + "px")
            .style("fill",      d => vis.colorScale(d.text))),
        exit => exit
          .call(s => s.transition().duration(200).style("opacity", 0).remove())
      );
  }

  _attachHandlers(sel) {
    const vis = this;

    sel
      .on("mouseover", function(event, d) {
        vis.tooltip
          .style("opacity", 1)
          .style("left", event.pageX + 12 + "px")
          .style("top",  event.pageY - 28 + "px")
          .html(
            `<span class="tooltip-label">${d.text}</span><br>` +
            `<span class="tooltip-row">Count: <strong>${Math.round(d.value)}</strong></span>`
          );
      })
      .on("mousemove", function(event) {
        vis.tooltip
          .style("left", event.pageX + 12 + "px")
          .style("top",  event.pageY - 28 + "px");
      })
      .on("mouseout", function() {
        vis.tooltip.style("opacity", 0);
      })
      .on("click", function(event, d) {
        const wasSelected = vis._selectedWord === d.text;
        const prevSelected = vis._selectedWord;

        vis.wordsG.selectAll("text.cloud-word")
          .classed("wc-selected", false)
          .style("opacity", 1);

        if (wasSelected) {
          vis._selectedWord = null;
        } else {
          vis._selectedWord = d.text;
          d3.select(this).classed("wc-selected", true);
          vis.wordsG.selectAll("text.cloud-word:not(.wc-selected)")
            .style("opacity", 0.2);
        }

        if (vis._selectedWord !== null || prevSelected !== null) {
          if (vis.onWordClick) vis.onWordClick(vis._selectedWord);
        }
      });
  }

  filterData(rawPotholeRecords) {
    const vis = this;

    const dates = rawPotholeRecords
      .map(d => new Date(d.DATE_TIME_RECEIVED))
      .filter(dt => !isNaN(dt));

    if (dates.length === 0) {
      vis._currentBulkyData = vis._fullBulkyData;
    } else {
      const minDate = d3.min(dates);
      const maxDate = d3.max(dates);
      vis._currentBulkyData = vis._fullBulkyData.filter(d => {
        const dt = new Date(d.DATE_TIME_RECEIVED);
        return !isNaN(dt) && dt >= minDate && dt <= maxDate;
      });
    }

    if (vis._selectedWord !== null) {
      vis._selectedWord = null;
      vis.wordsG.selectAll("text.cloud-word")
        .classed("wc-selected", false)
        .style("opacity", 1);
      if (vis.onWordClick) vis.onWordClick(null);
    }

    vis.updateVis();
  }
}
