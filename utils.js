function normalizeHeader(v){
  if(!v) return '';
  return String(v).trim().toLowerCase();
}
function parseBoolCell(val){
  if(val===true||String(val).toLowerCase().trim()==='waar'||String(val).toLowerCase().trim()==='ja'||String(val).trim()==='1'||String(val).toLowerCase().trim()==='true') return true;
  if(val===false||String(val).toLowerCase().trim()==='onwaar'||String(val).toLowerCase().trim()==='nee'||String(val).trim()==='0'||String(val).toLowerCase().trim()==='false') return false;
  return null;
}
function isYearHeader(h){
  if(!h) return false;
  const s = String(h).trim();
  return /^\d{4}$/.test(s) || /^\d{4}[\/-]\d{4}$/.test(s);
}
function toSeasonKey(h){
  const s = String(h).trim();
  if(/^\d{4}$/.test(s)) return s;
  if(/^\d{4}[\/-]\d{4}$/.test(s)) return s.replace('-', '/');
  return s;
}
const GEO_CACHE_KEY = 'geo_cache_schools_v1';
function loadGeoCache(){ try{ return JSON.parse(localStorage.getItem(GEO_CACHE_KEY)||'{}'); }catch{ return {}; } }
function saveGeoCache(cache){ localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache)); }
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
async function geocodeAddress(address, country='nl'){
  const cache = loadGeoCache();
  if(cache[address]) return cache[address];
  const params = new URLSearchParams({
    format:'jsonv2', q:address, addressdetails:'0', limit:'1', countrycodes:country, 'accept-language':'nl'
  });
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  const res = await fetch(url,{headers:{'Accept':'application/json'}});
  if(!res.ok) throw new Error('Nominatim error '+res.status);
  const json = await res.json();
  if(Array.isArray(json)&&json.length){
    const out = {lat:parseFloat(json[0].lat), lon:parseFloat(json[0].lon)};
    cache[address]=out; saveGeoCache(cache);
    return out;
  }
  const out = {lat:null, lon:null};
  cache[address]=out; saveGeoCache(cache);
  return out;
}
async function geocodeRows(rows, addrBuilder){
  const total = rows.length; let done = 0; updateProgress(0,total,'Geocoding');
  const out = [];
  for(const r of rows){
    const query = addrBuilder(r);
    try{
      const c = await geocodeAddress(query,'nl');
      out.push({...r, lat:c.lat, lon:c.lon});
    }catch(e){
      console.error('Geocode fout', query, e);
      out.push({...r, lat:null, lon:null});
    }
    done++; updateProgress(done,total,'Geocoding'); await sleep(1100);
  }
  return out;
}
function buildDynamicFilters(data, yearKeys){
  const cols = Object.keys(data[0]||{}).filter(k=>!yearKeys.includes(k) && !['lat','lon'].includes(k));
  const filterArea = document.getElementById('dynamicFilters');
  filterArea.innerHTML='';
  const selects = {};
  for(const col of cols){
    const vals = Array.from(new Set(data.map(r=>String(r[col]??'').trim()).filter(v=>v!=='')));
    if(vals.length>1 && vals.length<=50){
      const wrap = document.createElement('label'); wrap.textContent = col+': ';
      const sel = document.createElement('select');
      const optAll = document.createElement('option'); optAll.value=''; optAll.textContent='Alle'; sel.appendChild(optAll);
      vals.sort((a,b)=>a.localeCompare(b,'nl')).forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v; sel.appendChild(o); });
      wrap.appendChild(sel); filterArea.appendChild(wrap); selects[col]=sel;
    }
  }
  return ()=>{
    const active = Object.entries(selects).map(([k,sel])=>[k, sel.value]);
    return (row)=>active.every(([k,val])=>!val || String(row[k]??'')===val);
  };
}
function computeYearCounts(data, yearKeys){
  const counts = {}; for(const y of yearKeys) counts[y]=0;
  for(const row of data){ for(const y of yearKeys){ if(row[y]===true) counts[y]++; } }
  const entries = Object.entries(counts).sort((a,b)=>{
    const aKey = parseInt(String(a[0]).slice(0,4),10);
    const bKey = parseInt(String(b[0]).slice(0,4),10);
    return aKey - bKey;
  });
  return Object.fromEntries(entries);
}
function computeStability(data, yearKeys){
  let always = 0; let repeat3 = 0;
  for(const row of data){
    const truths = yearKeys.reduce((acc,y)=>acc + (row[y]===true ? 1:0), 0);
    if(truths===yearKeys.length && yearKeys.length>0) always++;
    if(truths>=3) repeat3++;
  }
  return {always, repeat3};
}
function yoyChanges(series){
  const keys = Object.keys(series);
  const deltas = {}; for(let i=1;i<keys.length;i++){ const k=keys[i], prev=keys[i-1]; deltas[k]=series[k]-series[prev]; }
  return deltas;
}
let updateProgress = (c,t,p)=>{};
