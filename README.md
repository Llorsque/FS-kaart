# Schoolschaatsen – v5 (fix: alle pins, betere geocoding, rijke popup)
- **Elke rij wordt geplot**: marker clustering voorkomt overlap; geen “1 pin”-probleem meer.
- **Robuuste geocoding**: verbeterde adresopbouw (straat + huisnr + toevoeging + postcode + plaats + provincie + NL), cache v2.
- **Fallback-strategie**: kies PDOK→Nominatim of omgekeerd; of forceer één van beide.
- **Sneller**: throttle standaard 200ms (pas aan indien nodig).
- **Popup met alle kolommen** van de betreffende rij.

Verder aanwezig:
- Seizoensfilters, range-filters, module switch, desktop/mobile popup & toggle, export naar CSV/XLSX.
