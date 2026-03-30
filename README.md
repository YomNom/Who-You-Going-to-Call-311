# Project 2 Documentation: Who You Gonna Call? 3-1-1!

## 1. Motivation

The primary purpose of this application is to assist city officials, city planners, and citizens of Cincinnati in analyzing and visualizing pothole-related 311 service requests. Potholes are a common and highly visible urban issue that affects daily commuters and vehicle maintenance overhead. Providing a dedicated, interactive dashboard for pothole data , with some extra service types, serves two distinct motivations:
- **For Citizens:** To provide transparency on how quickly and effectively the city responds to infrastructure complaints in their direct neighborhoods compared to others.
- **For City Planners/Officials:** To identify spatial hotspots of degraded road infrastructure, allocate resource prioritization dynamically, and detect seasonal or periodic trends, where service requests spike. By exploring the data interactively, stakeholders can easily pivot between analyzing neighborhood distribution to focusing directly on agency load.

## 2. The Data

This application visualizes the **Cincinnati 311 (Non-Emergency) Service Requests** dataset. 
* **Data Source:** [Cincinnati Open Data Portal](https://data.cincinnati-oh.gov/efficient-service-delivery/Cincinnati-311-Non-Emergency-Service-Requests/gcej-gmiw/about_data)
* **Dataset Scope:** We specifically filtered the dataset to visualize mainly "Pothole" related service requests (`SR_TYPE` containing 'PTHOLE' or 'POTHPARK') from the year 2022 to maintain high relevancy and app performance, as well as some additional service types. It includes rich attributes such as geolocation, response days, priority, requesting method, responsible agency, and neighborhood.

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
