// ======= Kaart setup =======
const map = L.map('map').setView([52.2, 5.3], 7);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap-bijdragers'
}).addTo(map);

let allClubs = [];      // {naam, adres, postcode, plaats, lat, lon}
let markers = [];
const markerGroup = L.layerGroup().addTo(map);

// ======= UI referenties =======
const fileInput = document.getElementById('fileInput');
const clearCacheBtn = document.getElementById('clearCacheBtn');
const downloadBtn = document.getElementById('downloadBtn');
const filterPlaats = document.getElementById('filterPlaats');
const filterNaam = document.getElementById('filterNaam');
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const progressText = document.getElementById('progressText');
const progressBar = document.getElementById('progressBar');

// ======= Helpers =======
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function setProgress(current, total, phase='Geocoding'){
  const pct = total ? Math.round((current/total)*100) : 0;
  progressText.textContent = total ? `${phase}: ${current}/${total} (${pct}%)` : 'Gereed.';
  progressBar.style.width = pct + '%';
}
function normalizeHeader(v){
  if(!v) return '';
  return String(v).trim().toLowerCase();
}
function toCSV(rows){
  // rows: array of objects
  const headers = ['Naam','Adres','Postcode','Plaats','Lat','Lon'];
  const lines = [
    headers.join(',')
  ];
  for(const r of rows){
    const vals = [
      r.naam ?? '',
      r.adres ?? '',
      r.postcode ?? '',
      r.plaats ?? '',
      r.lat ?? '',
      r.lon ?? ''
    ].map(x => {
      const s = String(x ?? '');
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
    });
    lines.push(vals.join(','));
  }
  return lines.join('\n');
}

// ======= Local cache voor geocoding =======
const GEO_CACHE_KEY = 'geo_cache_v1';
function loadGeoCache(){
  try{
    return JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || '{}');
  }catch{ return {}; }
}
function saveGeoCache(cache){
  localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
}

// ======= Nominatim geocoding (gratis) =======
// Fair-use: ~1 req/sec. We bouwen een queue met throttling.
async function geocodeAddress(address, country='nl'){
  // Cache check
  const cache = loadGeoCache();
  if(cache[address]) return cache[address];

  const params = new URLSearchParams({
    format: 'jsonv2',
    q: address,
    addressdetails: '0',
    limit: '1',
    countrycodes: country,
    'accept-language':'nl'
    // Je kunt optioneel een email toevoegen volgens Nominatim policy:
    // email: 'VERVANG_MET_JOUW_EMAIL@example.com'
  });
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  const res = await fetch(url, { headers: { 'Accept':'application/json' } });
  if(!res.ok){
    throw new Error('Nominatim error: ' + res.status);
  }
  const json = await res.json();
  if(Array.isArray(json) && json.length > 0){
    const { lat, lon } = json[0];
    const result = { lat: parseFloat(lat), lon: parseFloat(lon) };
    cache[address] = result;
    saveGeoCache(cache);
    return result;
  }else{
    const result = { lat: null, lon: null };
    cache[address] = result;
    saveGeoCache(cache);
    return result;
  }
}

async function geocodeAll(rows){
  const total = rows.length;
  let done = 0;
  setProgress(done, total, 'Geocoding');
  const out = [];
  for(const r of rows){
    const full = `${r.adres}, ${r.postcode} ${r.plaats}, Nederland`;
    try{
      const coords = await geocodeAddress(full, 'nl');
      out.push({ ...r, lat: coords.lat, lon: coords.lon });
    }catch(e){
      console.error('Geocode fout voor', full, e);
      out.push({ ...r, lat: null, lon: null });
    }
    done++;
    setProgress(done, total, 'Geocoding');
    // Respecteer ±1 req/sec om blokkades te voorkomen
    await sleep(1100);
  }
  return out;
}

// ======= Plotten =======
function renderMarkers(rows){
  markerGroup.clearLayers();
  markers.length = 0;
  for(const r of rows){
    if(!r.lat || !r.lon) continue;
    const m = L.marker([r.lat, r.lon]);
    m.bindPopup(`<strong>${r.naam ?? ''}</strong><br>${r.adres ?? ''}<br>${r.postcode ?? ''} ${r.plaats ?? ''}`);
    m.addTo(markerGroup);
    markers.push(m);
  }
  if(markers.length){
    const grp = L.featureGroup(markers);
    map.fitBounds(grp.getBounds().pad(0.1));
  }
}

// ======= Filters =======
function applyFilters(){
  const plaatsQ = (filterPlaats.value || '').trim().toLowerCase();
  const naamQ = (filterNaam.value || '').trim().toLowerCase();
  const filtered = allClubs.filter(r=>{
    const okPlaats = !plaatsQ || (r.plaats||'').toLowerCase().includes(plaatsQ);
    const okNaam = !naamQ || (r.naam||'').toLowerCase().includes(naamQ);
    return okPlaats && okNaam;
  });
  renderMarkers(filtered);
}

function resetFilters(){
  filterPlaats.value = '';
  filterNaam.value = '';
  renderMarkers(allClubs);
}

// ======= Excel inlezen =======
async function handleFile(file){
  progressText.textContent = 'Bestand lezen...';
  progressBar.style.width = '0%';
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type:'array' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' }); // array-of-arrays

  if(!raw || raw.length === 0){
    progressText.textContent = 'Leeg bestand.';
    return;
  }

  // Check of eerste rij headers bevat (A-D: Naam, Adres, Postcode, Plaats)
  let startRow = 0;
  let rows = [];
  if(raw[0] && raw[0].length >= 4){
    const h0 = normalizeHeader(raw[0][0]);
    const h1 = normalizeHeader(raw[0][1]);
    const h2 = normalizeHeader(raw[0][2]);
    const h3 = normalizeHeader(raw[0][3]);
    const isHeader = (h0.includes('naam') && h1.includes('adres') && h2.includes('post') && h3.includes('plaats'));
    if(isHeader){
      startRow = 1;
    }
  }
  for(let i=startRow;i<raw.length;i++){
    const row = raw[i];
    if(!row || row.length < 4) continue;
    const obj = {
      naam: String(row[0]||'').trim(),
      adres: String(row[1]||'').trim(),
      postcode: String(row[2]||'').trim(),
      plaats: String(row[3]||'').trim(),
    };
    // sla lege regels over
    if(!(obj.naam || obj.adres || obj.postcode || obj.plaats)) continue;
    rows.push(obj);
  }
  if(rows.length === 0){
    progressText.textContent = 'Geen geldige rijen gevonden (verwacht 4 kolommen: Naam, Adres, Postcode, Plaats).';
    return;
  }

  // Geocoding
  const geocoded = await geocodeAll(rows);
  allClubs = geocoded;

  // UI en kaart
  renderMarkers(allClubs);
  progressText.textContent = `Gereed. Geocoded: ${allClubs.filter(r=>r.lat&&r.lon).length}/${allClubs.length}.`;
  progressBar.style.width = '100%';
  downloadBtn.disabled = false;
}

// ======= Events =======
fileInput.addEventListener('change', (e)=>{
  const f = e.target.files?.[0];
  if(!f) return;
  handleFile(f);
});

applyFiltersBtn.addEventListener('click', applyFilters);
resetFiltersBtn.addEventListener('click', resetFilters);

clearCacheBtn.addEventListener('click', ()=>{
  localStorage.removeItem('geo_cache_v1');
  alert('Geocoding-cache geleegd.');
});

downloadBtn.addEventListener('click', ()=>{
  const csv = toCSV(allClubs);
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sportclubs_geocoded.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});
