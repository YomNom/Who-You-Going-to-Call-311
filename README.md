# [Who You Gonna Call? 3-1-1!](https://who-you-going-to-call-311-tras.vercel.app/)

There's data portal by Cincinnati, Ohio where you can access a variety of data about the city (all data here: https://data.cincinnati-oh.gov/.). This includes non-emergency service requests for incidents such as graffiti, bike rack damage, and littering. This project utilizes that data to create an interactive dashboard displaying the data analytics for non-emergency service requests, specifically littering, dumping, dead trees, dead animals, and potholes. The dashboard is a web browser that was made using D3.js - "a popular, open-source JavaScript library used to create custom, interactive data visualizations in web browsers". Ultimately the purpose of this dashboard is to study and provide insight on the data surrounding the incidents that were focused on.

DEMO VIDEO: https://youtu.be/x6kx6qiMONI

### **How to Run**

> 1.  Clone the repository.
> 2.  Launch a local web server in the root directory (e.g., `python -m http.server 8000`).
> 3.  Navigate to `http://localhost:8000` via web browser.

## 2. The Data

The data used was exported from the **Cincinnati 311 (Non-Emergency) Service Requests** dataset ([Cincinnati Open Data Portal](https://data.cincinnati-oh.gov/efficient-service-delivery/Cincinnati-311-Non-Emergency-Service-Requests/gcej-gmiw/about_data)). There are 70 columns and 152816 rows. It is 81.6 mb. Due to it's large size we had to narrow the scope of our data to one year and focused only on five service request types: littering, dumping, dead trees, dead animals, and potholes.

We also only focused on 9 of the 70 columns:

1. SR_TYPE (Potholes (`PTHOLE`, `POTHPARK`), Littering (`LITR-PRV`), Dead Trees (`TREEPR`), Dead Animals (`DAPUB1`), and Dumping (`DUMP-PVS`))
2. PRIORITY (STANDARD, PRIORITY, HAZARDOUS, EMERGENCY)
3. DEPT_NAME
4. METHOD_RECEIVED
5. NEIGHBORHOOD
6. TIME_RECEIVED
7. DATE_CREATED
8. PLANNED_COMPLETION_DAYS
9. DATE_CLOSED

## 3. Sketch

Diseregarding all the interactions for the maps, we have 7 different kinds of graphs that we needed to layout: leaflet, chloropleth, timeline, lollipop graph, donut chart, word cloud, and a bar chart. The following is our sketch on the initial design/layout for our dashboard:

<img width="100%" alt="image" src="https://github.com/user-attachments/assets/49a1808f-1e89-4c25-8769-e491884427e4" />

In the end the timeline was switched with row two and heatmap was added as an option to view in the leaflet map.

## 4. Visualization Components

DELETETHISExplain each view of the data, the GUI, etc. Explain how you can interact with your application, and how the views update in response to these interactions. Please include screenshots to illustrate, and relate these screenshots to the text.

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

### 4.1 Specific Color Scheme Justifications

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

The default colors for the service types were chosen to be distinct and bright to be able to easily spot each service in the clusters. Green for tree dumping for the general green foliage of trees. Blue for the potholes for wanting it to be standardly addressed. The color for the trash services were simply chosen because they stood out of the chosen colors and to be unappetizing.

## 5. Discoveries

_(Add screenshots for each discovery here)_

- **Discovery 1: The Spring Pothole Spike:**
  - **Image:** `[Insert screenshot highlighting the clustered peak on the Timeline chart around February/March with ONLY "Potholes" checked]`
  - **Finding:** By filtering only by Potholes and observing the timeline over the early months of the year, we notice a massive spike in requests. This aligns geographically with winter weather and the freeze-thaw cycles that severely damage road integrity.

- **Discovery 2: The Anatomy of Illegal Dumping:**
  - **Image:** `[Insert screenshot highlighting the Word Cloud with only "Dumping(s)" checked]`
  - **Finding:** Filtering by Dumping and observing the Word Cloud instantly reveals that furniture and auto-parts are the primary issue. Words like "Mattress", "Tire", and "Couch" dominate the visualization, indicating that the city should potentially focus sanitation efforts on bulk-item pickup allowances for residents.

- **Discovery 3: Slow Response Hotspots & Department Loads:**
  - **Image:** `[Insert screenshot of the map colored by Response Time, zoomed into dark red areas with the Donut chart showing departments]`
  - **Finding:** When coloring the map by Response Time, utilizing the green-to-red diverging scale reveals direct localized pockets (deep reds) where it takes the city substantially longer to close tickets. Clicking specific departments in the Donut Chart reveals that the Public Services department handles a vastly different response timeline curve than the Transportation & Engineering department.

## 6. Libraries & Other Tools

D3.js (v6) for data aggregation and chart rendering, Leaflet.js for mapping, Leaflet.heat for heatmap generation, d3-cloud for the Word Cloud, and standard HTML/CSS/JS for DOM manipulation.

## 7. Code Structure

We kept things modular by having each chart have its own file so everyone was able to work on their levels independently without much conflict. Here's how the project is laid out:

```
├── index.html                 # Main page layout (flex/grid)
├── preprocess_data.py         # Python script we used to clean and filter the raw data
├── requirements.txt           # Python dependencies
├── css/
│   ├── style.css              # All the dashboard styling
│   └── leaflet.css            # Styles for the Leaflet map
├── js/
│   ├── main.js                # Loads data, wires up brushing & KPI updates
│   ├── leafletMap.js          # Point map with brushing and color toggles
│   ├── choroplethMap.js       # Neighborhood choropleth (request counts by area)
│   ├── potholeMap.js          # Pothole-specific map view
│   ├── timelineChart.js       # Brushable timeline area chart
│   ├── barchartPriority.js    # Priority bar chart
│   ├── lollipopChart.js       # Method-received lollipop chart
│   ├── donutChart.js          # Department breakdown donut chart
│   ├── wordCloud.js           # Word cloud for illegal dumping descriptions
│   ├── d3.v6.min.js           # D3.js v6 library
│   ├── d3.layout.cloud.js     # D3 word cloud layout plugin
│   ├── leaflet.js             # Leaflet.js library
│   └── leaflet-heat.js        # Leaflet heatmap plugin
├── data/
│   ├── cincinnati_311_2022_cleaned.csv  # Cleaned 311 data for 2022
│   └── cincinnati.geojson               # Cincinnati neighborhood boundaries
└── images/                    # Map marker and layer icons
```

Each visualization lives in its own class file and follows the standard D3 update pattern (enter, update, exit). `main.js` ties everything by handling data loading, filtering by the checkboxes, and making sure that when you brush on one chart, all the others update accordingly.

## 7. Challenges and Future Work

- **Challenges:** Integrating mutual, multi-chart brushing logic alongside the new checkbox-based data filtering system was difficult. When users toggled an entirely new dataset (like switching from potholes to dumping), ensuring that the maps and word cloud correctly refreshed their bounds and domains without throwing D3 transition errors took significant debugging.

- **Future Work:** With more time, we would add more service types, implement map cluster-grouping to prevent point-overlap density issues on the Leaflet map at high zoom levels. Expanding the dataset to include an entire decade (rather than just 2022) would also allow year-over-year seasonal comparisons in the timeline.

## 8. Use of AI and Collaboration

AI(Gemini inside VSCode) was used by Quoc Huynh (kiq2908) to set up outline of the documentation. Github Copilot was utilized for debugging. Claude Code was used by Dylan and Kaleab for boilerplate generation and debugging.

## 9. Who Did What

- **[Quoc Huynh] kiq2908:** Handled data pre-processing using Python to filter out only 2022 dataset and in charge of the Heatmap.
- **[Tyler Brunelle]:** Worked on the timeline (lvl2) and merging all graphs into one dashboard and linking interactions/filters (lvl4).
- **[Dylan]:** Handled the part 1: the map and its interactions, and part 5, the brushing of the map and visualization updates.
- **[Joey Yong] YomNom:** Handled viewing data and the control panel for the different service types. This includes the checkbox data selection and custom legend color selection. She also took care of the bar chart showing the priority of the displayed services.
- **Kaleab Alemu:** Worked on the choropleth map (requests by neighborhood), lollipop chart (requests by submission method), and donut chart (requests by department) (lvl3). Also built the word cloud of the most frequently reported bulky waste items (lvl8), and redesigned the overall dashboard layout.
