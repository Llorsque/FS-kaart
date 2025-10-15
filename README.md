# Schoolschaatsen – v3 (snellere geocoding + Excel-export)

## Wat is nieuw
- **Keuze geocoder**: *PDOK Locatieserver (NL, sneller)* of *Nominatim (OSM)*.
- **Throttle instelbaar** (ms) om snelheid te balanceren met fair use.
- **Excel (XLSX) export**: download je geocodede dataset direct als `.xlsx` (ook CSV mogelijk).
- **Seizoenen-filters** en **range-filters** blijven actief.

## Gebruik
1. Open `map.html` → upload Excel → kies geocoder (PDOK/Nominatim) → stel throttle in → geocode.
2. Download **CSV** of **XLSX** met toegevoegde `lat`/`lon` kolommen.
3. `dashboard.html` voor analyses, met export van de **gefilterde** set naar Excel.

> Tip: laat de **geocoding-cache** staan in dezelfde browser voor snellere herhaalde runs (knop “Cache legen” wist deze).

**NL-only versneller:** PDOK is gericht op Nederlandse adressen en is doorgaans sneller en preciezer voor BAG-adressen. Nominatim is wereldwijd, maar beperkter in snelheid (hou fair use aan).
