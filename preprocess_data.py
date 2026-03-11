# pip install pandas
import pandas as pd
import os

# Define file paths
input_file = "data/Cincinnati_311_(Non-Emergency)_Service_Requests_20260311.csv"
output_file = "data/cincinnati_311_2022_cleaned.csv"

# Check if input file exists
if not os.path.exists(input_file):
    print(f"Error: {input_file} not found in the current directory.")
    exit(1)

try:
    # Read the CSV file
    print(f"Reading {input_file}...")
    df = pd.read_csv(input_file)
    
    print(f"Total records in original file: {len(df)}")
    
    # 1. Filter for 2022 data only as per project requirements
    df['DATE_CREATED'] = pd.to_datetime(df['DATE_CREATED'], errors='coerce')
    df_2022 = df[df['DATE_CREATED'].dt.year == 2022].copy()
    
    # 2. Calculate response time (in days) from DATE_CLOSED - DATE_CREATED
    df_2022['DATE_CLOSED'] = pd.to_datetime(df_2022['DATE_CLOSED'], errors='coerce')
    df_2022['RESPONSE_TIME_DAYS'] = (df_2022['DATE_CLOSED'] - df_2022['DATE_CREATED']).dt.days
    
    # 3. Clean location data (Drop rows missing key location info)
    df_clean = df_2022.dropna(subset=['NEIGHBORHOOD', 'LATITUDE', 'LONGITUDE'])
    
    output_file = "data/cincinnati_311_2022_cleaned.csv"
    
    # Save filtered and cleaned data to new CSV
    df_clean.to_csv(output_file, index=False)
    print(f"\nFiltered 2022 data saved to {output_file}")
    
    # Display summary statistics for log purpose
    print("\n--- Summary ---")
    print(f"Original records: {len(df)}")
    print(f"Records from 2022: {len(df_2022)}")
    print(f"Records with complete location data: {len(df_clean)}")
    print(f"Percentage of usable records: {(len(df_clean)/len(df)*100):.2f}%")
    
    # Show sample of filtered data
    print("\n--- Sample of cleaned data ---")
    print(df_clean[['SR_NUMBER', 'SR_TYPE', 'DATE_CREATED', 'DATE_CLOSED', 'RESPONSE_TIME_DAYS', 'NEIGHBORHOOD', 'LATITUDE', 'LONGITUDE']].head())
    
except Exception as e:
    print(f"Error processing file: {str(e)}")
    exit(1)
