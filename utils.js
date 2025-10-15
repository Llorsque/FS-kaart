function normalizeHeader(v){ return (v??'').toString().trim(); }
function slugId(s){ return normalizeHeader(s).toLowerCase().replace(/[^a-z0-9]+/g,'_'); }
function parseBoolCell(val){
  const s = (val??'').toString().trim().toLowerCase();
  if(s==='') return null;
  return ['waar','ja','true','1','x','y'].includes(s) ? true :
         ['onwaar','nee','false','0','n'].includes(s) ? false : null;
}
function parseNumber(val){
  if(val===null||val===undefined||val==='') return null;
  const s = (''+val).replace(',','.');
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}
function extractSeasonKey(text){
  const s = (text??'').toString();
  const m = s.match(/(\d{4})\s*[,\/-]\s*(\d{4})/);
  if(m){ return `${m[1]}/${m[2]}`; }
  const y = s.match(/\b(\d{4})\b/);
  if(y){ return y[1]; }
  return null;
}
let updateProgress = (c,t,p)=>{};

function buildDynamicFilters(data, yearSeasons, options={}){
  const excluded = new Set(options.excludedColumns||[]);
  const container = document.getElementById('dynamicFilters');
  container.innerHTML = '';
  const selects = {};
  if(!data.length) return ()=>true;

  const sample = data[0];
  const cols = Object.keys(sample)
    .filter(k=>!excluded.has(k))
    .filter(k=>!k.startsWith('_season__') && !['_lat','_lon','lat','lon'].includes(k));

  for(const col of cols){
    const values = Array.from(new Set(data.map(r=>(r[col]??'').toString().trim()).filter(v=>v!=='')));
    const allNumeric = values.every(v=>!isNaN(parseFloat(v.replace(',','.'))));
    if(allNumeric) continue;
    if(values.length>=2 && values.length<=50){
      const wrap = document.createElement('label'); wrap.textContent = col+': ';
      const sel = document.createElement('select');
      const optAll = document.createElement('option'); optAll.value=''; optAll.textContent='Alle'; sel.appendChild(optAll);
      values.sort((a,b)=>a.localeCompare(b,'nl')).forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v; sel.appendChild(o); });
      wrap.appendChild(sel); container.appendChild(wrap); selects[col]=sel;
    }
  }

  const seasonBox = document.createElement('div'); seasonBox.className='card';
  const seasonTitle = document.createElement('h4'); seasonTitle.textContent='Seizoenen (deelname/aangemeld)'; seasonBox.appendChild(seasonTitle);
  const seasonWrap = document.createElement('div'); seasonWrap.className='inline';
  const seasonChecks = {};
  for(const s of yearSeasons){
    const id = 's_'+slugId(s);
    const lab = document.createElement('label'); lab.className='inline';
    const cb = document.createElement('input'); cb.type='checkbox'; cb.id=id;
    const sp = document.createElement('span'); sp.textContent = s;
    lab.appendChild(cb); lab.appendChild(sp);
    seasonWrap.appendChild(lab);
    seasonChecks[s]=cb;
  }
  const hint = document.createElement('div'); hint.className='small'; hint.textContent='OR-filter: toon rijen die in ≥1 gekozen seizoen deelnamen/aangemeld zijn.';
  seasonBox.appendChild(seasonWrap); seasonBox.appendChild(hint);
  container.appendChild(seasonBox);

  const numericBox = document.createElement('div'); numericBox.className='card';
  const numTitle = document.createElement('h4'); numTitle.textContent='Range-filters (min/max)'; numericBox.appendChild(numTitle);
  const numericWrap = document.createElement('div'); numericWrap.className='filters-block';
  const numericInputs = [];
  const numCols = cols.filter(c=>{
    const values = data.map(r=>r[c]).map(parseNumber).filter(v=>v!==null);
    return values.length>0;
  });
  for(const col of numCols){
    const values = data.map(r=>r[col]).map(parseNumber).filter(v=>v!==null);
    if(!values.length) continue;
    const min = Math.min(...values), max = Math.max(...values);
    const row = document.createElement('div'); row.className='inline';
    const label = document.createElement('span'); label.textContent = col+':';
    const minIn = document.createElement('input'); minIn.type='number'; minIn.placeholder='min'; minIn.step='1'; minIn.min=''+Math.floor(min); minIn.max=''+Math.ceil(max);
    const maxIn = document.createElement('input'); maxIn.type='number'; maxIn.placeholder='max'; maxIn.step='1'; maxIn.min=''+Math.floor(min); maxIn.max=''+Math.ceil(max);
    row.appendChild(label); row.appendChild(minIn); row.appendChild(maxIn);
    numericWrap.appendChild(row);
    numericInputs.push({col, minEl:minIn, maxEl:maxIn});
  }
  if(numericInputs.length){ numericBox.appendChild(numericWrap); container.appendChild(numericBox); }

  return (row)=>{
    for(const [k,sel] of Object.entries(selects)){
      if(sel.value && (row[k]??'') !== sel.value) return false;
    }
    const selectedSeasons = Object.entries(seasonChecks).filter(([s,cb])=>cb.checked).map(([s])=>s);
    if(selectedSeasons.length){
      const ok = selectedSeasons.some(s=> row['_season__'+s] === true );
      if(!ok) return false;
    }
    for(const {col,minEl,maxEl} of numericInputs){
      const val = parseNumber(row[col]);
      if(val===null) continue;
      if(minEl.value!=='' && val < parseFloat(minEl.value)) return false;
      if(maxEl.value!=='' && val > parseFloat(maxEl.value)) return false;
    }
    return true;
  };
}

function deriveSeasonsAndFlags(rows){
  if(!rows.length) return {yearSeasons:[], rows};
  const headers = Object.keys(rows[0]);
  const seasons = new Set();
  const seasonFlagCols = {};
  for(const h of headers){
    const s = extractSeasonKey(h);
    if(!s) continue;
    seasons.add(s);
    const H = h.toUpperCase();
    if(H.startsWith('DEELNAME')){ seasonFlagCols[s] = seasonFlagCols[s]||{}; seasonFlagCols[s].deelname = h; }
    else if(H.startsWith('AANGEMELD')){ seasonFlagCols[s] = seasonFlagCols[s]||{}; seasonFlagCols[s].aangemeld = h; }
  }
  const enriched = rows.map(r=>{
    const out = {...r};
    for(const s of seasons){
      const cols = seasonFlagCols[s]||{};
      const v1 = parseBoolCell(r[cols.deelname]);
      const v2 = parseBoolCell(r[cols.aangemeld]);
      out['_season__'+s] = (v1===true || v2===true);
    }
    return out;
  });
  return {yearSeasons: Array.from(seasons).sort((a,b)=>parseInt(a)-parseInt(b)), rows: enriched};
}

const MODE_KEY = 'ss_mode_v1';
function applyMode(mode){
  if(mode==='mobile'){ document.body.classList.add('mobile'); }
  else{ document.body.classList.remove('mobile'); }
  localStorage.setItem(MODE_KEY, mode);
}
function ensureModePopup(){
  const current = localStorage.getItem(MODE_KEY);
  if(current==='desktop' || current==='mobile'){ applyMode(current); return; }
  const backdrop = document.createElement('div'); backdrop.className='modal-backdrop';
  const modal = document.createElement('div'); modal.className='modal';
  const h = document.createElement('h3'); h.textContent='Kies je weergave';
  const p = document.createElement('p'); p.textContent='Open de module in Desktop- of Mobile-weergave. Je keuze wordt onthouden.';
  const actions = document.createElement('div'); actions.className='actions';
  const bDesk = document.createElement('button'); bDesk.className='btn'; bDesk.textContent='Desktop';
  const bMob = document.createElement('button'); bMob.className='btn btn-ghost'; bMob.textContent='Mobile';
  actions.appendChild(bMob); actions.appendChild(bDesk);
  modal.appendChild(h); modal.appendChild(p); modal.appendChild(actions);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  bDesk.onclick=()=>{ applyMode('desktop'); document.body.removeChild(backdrop); };
  bMob.onclick=()=>{ applyMode('mobile'); document.body.removeChild(backdrop); };
}
