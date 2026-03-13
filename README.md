# Interactive Map with Leaflet

<!-- Instructions to Run Preprocessing Script -->

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
