# Project 2 Documentation: Who You Gonna Call? 3-1-1!

## 1. Motivation

The primary purpose of this application is to assist city officials, city planners, and citizens of Cincinnati in analyzing and visualizing a wide array of 311 service requests. While initially focused solely on potholes, the dashboard has been significantly expanded to cover several major urban quality-of-life categories including Littering, Dead Trees on Private Property, Dead Animals, and Illegal Dumping. 

Providing a dedicated, interactive dashboard serves two distinct motivations:
- **For Citizens:** To provide transparency on how quickly and effectively the city responds to infrastructure and sanitation complaints in their direct neighborhoods compared to others, and to visualize exactly what types of issues plague their streets.

- **For City Officials & Planners:** To identify spatial hotspots of degraded road infrastructure, track illegal dumping contents, allocate resource prioritization dynamically, and detect seasonal or periodic trends (like post-winter freeze-thaw cycles for potholes or shifting waste patterns). By exploring the data interactively through multiple map views and filtering via KPIs, stakeholders can easily pivot between analyzing neighborhood distribution to focusing directly on agency load.

## 2. The Data

This application visualizes the **Cincinnati 311 (Non-Emergency) Service Requests** dataset. 
* **Data Source:** [Cincinnati Open Data Portal](https://data.cincinnati-oh.gov/efficient-service-delivery/Cincinnati-311-Non-Emergency-Service-Requests/gcej-gmiw/about_data)

* **Dataset Scope:** We processed and cleaned the massive 2022 dataset to focus on five key, high-impact `SR_TYPE` categories: Potholes (`PTHOLE`, `POTHPARK`), Littering (`LITR-PRV`), Dead Trees (`TREEPR`), Dead Animals (`DAPUB1`), and Dumping (`DUMP-PVS`). The dataset features rich attributes including geolocation, response days, priority, requesting method, responsible agency, neighborhood, and textual descriptions of bulky items dumped.

## 3. Sketches & Initial Design

**Timeline Design Explanation:** 
When deciding how to design the timeline, we opted for an area/line chart approach. We aggregated the data by **Day** to provide high granularity of requests. A line/area chart was selected over bar charts because it inherently emphasizes the continuous nature of time, making peaks and "valleys" (like weekend dips or weather-related spikes) much easier to identify seamlessly.

## 4. Visualization Components & Justification of Choices

### Global Controls & KPIs
- **Header Filters:** Users can instantly swap the thematic color encoding, change Map Tile basemaps (e.g., Esri Topo, CartoDB Dark) for contrast, and toggle heatmaps.
- **Dynamic KPI Strip:** Displays exact top-level metrics for Total Requests, Average Response Days, and Total Neighborhoods impacted.
- **Data Toggles:** A checkbox array allows users to mix and match multiple 311 categories to uncover cross-correlations (e.g., are areas with high illegal dumping also areas with high littering?).

### Leaflet Point Map & Heatmap
- **Description:** The central component showing individual 311 requests mapped across Cincinnati. It allows toggling between point distributions and an aggregate heatmap for hotspot detection.
- **Interactions:** Users can drag to pan, scroll to zoom, brush a selection box over the map to filter all other charts by a specific spatial area, and toggle a categorical/quantitative color switch. 

### Chloropleth Map
- **Description:** Maps out the absolute counts of requests aggregated by Cincinnati neighborhoods ("Hottest neighborhoods").
- **Color Justification (Monochromatic Sequential):** We used a quantitative, sequential yellow-orange-red color scale (`d3.interpolateYlOrRd`). **Why?** Since request counts represent quantitative data scaling from low to high magnitudes, a sequential map correctly allows viewers to intuitively associate darker, more intense red shades with higher volumes of requests.

### Timeline Area Chart
- **Description:** A scrubber-enabled area chart across the middle spanning all of 2022. 
- **Interactions:** Allows users to brush a specific temporal window (e.g., Spring months) which instantly updates the map, KPIs, and attribute charts.

### Attribute Views (Lollipop, Bar, Donut, and Word Cloud Charts)
- **Method Received (Lollipop Chart):** Shows the count of requests by intake method (e.g., App, Call).
- **Priority (Bar Chart):** Shows how many requests fall under Standard vs. Emergency, etc.
- **Department (Donut Chart):** Shows the proportionate breakdown of responding city departments.
- **Illegal Dumping Profiler (Word Cloud):** Parses description texts of bulky items thrown away on the streets. Font size correlates to the frequency of the word mentioned. **Why?** Unstructured textual data (like descriptions of dumped garbage) is nominal. Mapping the frequency to size in a compact area allows users to immediately grasp the most common culprits (e.g., "mattress", "couch", "tire").
- **Interactions:** All of these charts are mutually linked. Clicking a specific Priority, Method, or Department filters the dataset and updates the rest of the application dashboard.

### Specific Color Scheme Justifications

1. **Priority Field:** 
   - **Type:** Ordinal Data
   - **Scheme Used:** Monochromatic/Sequential (Light Tan → Dark Orange/Brown: `#eee1cd` to `#8b4300`).
   - **Why?** Because priority has an inherent rank/order (Standard < Priority < Hazardous < Emergency), a sequential increase in color intensity naturally encodes higher importance or severity.

2. **Response Time Field:**
   - **Type:** Quantitative (Continuous) Data
   - **Scheme Used:** Diverging (Green → Yellow → Red: `#2b9e3e` to `#7b0d1e`).
   - **Why?** Shorter response times are positive (green) and strictly longer response times become problematic (red). A diverging palette perfectly captures this transition from a neutral state (yellow) into either a positive or negative extreme.

3. **Service Type, Neighborhood & Agency Fields:**
   - **Type:** Nominal (Categorical) Data
   - **Scheme Used:** Categorical Palette (`d3.schemeTableau10` and `d3.schemeSet2`).
   - **Why?** There is no numeric value or inherent order between different service types, neighborhoods or agencies. A qualitative scheme with highly distinct, contrasting colors was used so viewers can differentiate categories without implicitly assigning more weight to one over another.

## 5. Discoveries

*(Add screenshots for each discovery here)*

* **Discovery 1: The Spring Pothole Spike:**
 
  * **Image:** `[Insert screenshot highlighting the clustered peak on the Timeline chart around February/March with ONLY "Potholes" checked]`
  * **Finding:** By filtering only by Potholes and observing the timeline over the early months of the year, we notice a massive spike in requests. This aligns geographically with winter weather and the freeze-thaw cycles that severely damage road integrity. 

* **Discovery 2: The Anatomy of Illegal Dumping:**
 
  * **Image:** `[Insert screenshot highlighting the Word Cloud with only "Dumping(s)" checked]`
  * **Finding:** Filtering by Dumping and observing the Word Cloud instantly reveals that furniture and auto-parts are the primary issue. Words like "Mattress", "Tire", and "Couch" dominate the visualization, indicating that the city should potentially focus sanitation efforts on bulk-item pickup allowances for residents.

* **Discovery 3: Slow Response Hotspots & Department Loads:**

  * **Image:** `[Insert screenshot of the map colored by Response Time, zoomed into dark red areas with the Donut chart showing departments]`
  * **Finding:** When coloring the map by Response Time, utilizing the green-to-red diverging scale reveals direct localized pockets (deep reds) where it takes the city substantially longer to close tickets. Clicking specific departments in the Donut Chart reveals that the Public Services department handles a vastly different response timeline curve than the Transportation & Engineering department.

## 6. Process

* **Libraries & Tools Used:** D3.js (v6) for data aggregation and chart rendering, Leaflet.js for mapping, Leaflet.heat for heatmap generation, d3-cloud for the Word Cloud, and standard HTML/CSS/JS for DOM manipulation.

* **Code Structure:** Built in a heavily modular fashion. `index.html` stores the layout framework spanning flex and grid components. `main.js` orchestrates cross-component interactions (KPI updating, multi-way brushing), while dedicated class files (`timelineChart.js`, `leafletMap.js`, `wordCloud.js`, etc.) individually manage standard D3 update patterns.
* **How to Run:** 
  1. Clone the repository.
  2. Launch a local web server in the root directory (e.g., `python -m http.server 8000`).
  3. Navigate to `http://localhost:8000` via web browser.
* **Access Link:** `[https://who-you-going-to-call-311-tras.vercel.app/]`

## 7. Challenges and Future Work

* **Challenges:** Integrating mutual, multi-chart brushing logic alongside the new checkbox-based data filtering system was difficult. When users toggled an entirely new dataset (like switching from potholes to dumping), ensuring that the maps and word cloud correctly refreshed their bounds and domains without throwing D3 transition errors took significant debugging.

* **Future Work:** With more time, we would add more service types, implement map cluster-grouping to prevent point-overlap density issues on the Leaflet map at high zoom levels. Expanding the dataset to include an entire decade (rather than just 2022) would also allow year-over-year seasonal comparisons in the timeline.

## 8. Use of AI and Collaboration

* We utilized AI Assistants (Gemini inside VSCode) to help write this documents base on the constraints from the Project Requirement and the feedback that 1 of the team member got from Project 1

## 9. Who Did What 

* **[Quoc Huynh]:** Handled data pre-processing using Python to filter out only 2022 dataset and in charge of the Heatmap.
* **[Tyler Brunelle]:** .
* **[Dylan]:** .
* **[Ziyou]:** .
* **[Kaleab Alemu]:** The MVP.

## 10. Demo Video

**Link to Demo:** `[Insert Youtube link here]`

<!--
# Interactive Map with Leaflet


## Preprocessing Script

The preprocessing script filters the raw Cincinnati 311 dataset down to 2022 records, calculates response times, and removes rows with missing location data.

### Prerequisites

Create and activate a virtual environment, then install the required dependency:

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install pandas
```

### Input

Place the raw CSV file at:

```
data/Cincinnati_311_(Non-Emergency)_Service_Requests_20260309.csv
```

### Run

From the project root, run:

```bash
python preprocess_data.py
```

### Output

The cleaned dataset is saved to:

```
data/cincinnati_311_2022_cleaned.csv
```

It includes only 2022 records with complete neighborhood and coordinate data, plus a computed `RESPONSE_TIME_DAYS` column.
-->
