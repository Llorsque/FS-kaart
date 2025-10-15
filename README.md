# Schoolschaatsen – Kaart & Dashboard
Statische webapp voor Excel → Kaart + Trends. Zet in een GitHub-repo en publiceer via GitHub Pages.

## Pagina's
- `map.html` – Kaart met geocoding (Nominatim) en live aantallen per filter + per jaar.
- `dashboard.html` – Filters, kerncijfers, trendlijn (line) en jaar-op-jaar (bar).
- `index.html` – Startpagina met links.

## Excel
- Herkent alle kolommen automatisch.
- Jaarkolommen (`2021`, `2022/2023`, `2022-2023`) worden als deelnamekolommen gezien (WAAR/ONWAAR, JA/NEE, TRUE/FALSE, 1/0).
- Voor geocoding worden `Adres`, `Postcode`, `Plaats` gebruikt (naam voor popup wordt uit `Naam` of `School` gehaald).

## Filters
- Automatisch gegenereerd voor niet-jaar kolommen met ≤ 50 unieke waarden.

## Geocoding
- Publieke Nominatim (fair use ~1 req/sec) met throttling + localStorage cache.
- CSV-export met toegevoegde `Lat`/`Lon` op de Kaart-pagina.

## GitHub Pages
Upload alle bestanden en activeer Pages (branch `main`, root). Open `index.html`.
