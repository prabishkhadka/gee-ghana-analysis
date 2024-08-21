# GEE Ghana Land Cover Analysis

This repository contains Google Earth Engine (GEE) code for analyzing land cover in Ghana using Landsat imagery. The analysis includes filtering, masking, classifying land cover, and generating visualizations.

## Overview

The provided script performs the following tasks:
- Loads Ghana boundary and Accra shapefiles
- Filters and masks Landsat imagery
- Analyzes water and vegetation
- Classifies land cover
- Calculates areas and generates visualizations

## Files

- **Scripts:**
  - `scripts/ghana_analysis.js`: Main GEE script for the analysis.

- **Data:**
  - **Ghana Boundary:** Defines the geographical boundary of Ghana.
    - **File Name:** `data/ghana_boundary.shp`
    - **Description:** Contains boundary coordinates for Ghana.
    - **Usage:** Loaded as a `FeatureCollection` in the GEE script.
  
  - **Accra:** Defines the area of interest within Ghana, specifically for the city of Accra.
    - **File Name:** `data/accra.shp`
    - **Description:** Contains boundary data for the city of Accra.
    - **Usage:** Used to clip the Landsat imagery to the city limits of Accra.

## Data Source

The shapefiles used in this project are from data.world (Ghana - Subnational Administrative Boundaries). Ensure you have the necessary permissions to use and share these files.

## Data Preparation

1. **Shapefiles:** Place the shapefiles in the `data` directory of the project. Ensure the files include the `.shp`, `.shx`, `.dbf`, and `.prj` extensions.
2. **Coordinate System:** Ensure that shapefiles are in the EPSG:4326 coordinate system for compatibility with the GEE script.
3. **Conversion (if needed):** Convert shapefiles to GeoJSON using a tool like [GDAL](https://gdal.org/) or [QGIS](https://qgis.org/). For example:
   ```bash
   ogr2ogr -f "GeoJSON" data/ghana_boundary.geojson data/ghana_boundary.shp


HOW TO RUN

1.	Open Google Earth Engine Code Editor: GEE Code Editor
2.	Copy and paste the content of scripts/ghana_analysis.js into the editor.
3.	Ensure that the shapefiles are correctly loaded and referenced in the script.
4.	Run the script to perform the analysis.

DEPENDENCIES

1.	Google Earth Engine Account: Required to run the GEE script.
2.	Google Earth Engine API: Installed and authenticated.

LICENSE

This code is provided for educational purposes.

CONTACT: For questions or feedback, please contact: prabishkhadka@gmail.com 
