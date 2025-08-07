// galeria.js - mostra rotas com mini mapas
async function openDB(){
  return new Promise((res,rej)=>{
    const req = indexedDB.open('gps-pakito-db',1);
    req.onsuccess = ()=> res(req.result);
    req.onerror = ()=> rej(req.error);
  });
}

async function loadRoutes(){
  const db = await openDB();
  const tx = db.transaction('rotas','readonly');
  const store = tx.objectStore('rotas');
  const allReq = store.getAll();
  allReq.onsuccess = ()=> render(allReq.result);
  allReq.onerror = ()=> console.error('Erro lendo rotas');
}

function render(rotas){
  const list = document.getElementById('lista');
  list.innerHTML = '';
  if (!rotas || !rotas.length){
    list.innerHTML = '<p>Nenhuma rota salva.</p>'; return;
  }
  rotas.forEach(r => {
    const id = r.id;
    const div = document.createElement('div');
    div.className = 'rota-card';
    div.innerHTML = `
      <div class="meta">
        <h3>${r.nome}</h3>
        <p>${new Date(r.dataInicio).toLocaleString()}</p>
        <p>Dist: ${r.distanciaKm.toFixed(2)} km — Dur: ${r.duracaoMin.toFixed(1)} min — Avg: ${r.velocidadeMediaKmh.toFixed(1)} km/h</p>
        <div class="card-actions">
          <button data-id="${id}" class="btn-view">🗺️ Ver</button>
          <button data-id="${id}" class="btn-gpx">💾 GPX</button>
          <button data-id="${id}" class="btn-del">🗑️ Excluir</button>
        </div>
      </div>
      <div id="mini-${id}" class="mini-map"></div>
    `;
    list.appendChild(div);
    setTimeout(()=>initMiniMap('mini-'+id, r.pontos),50);
  });
  document.querySelectorAll('.btn-gpx').forEach(b=>b.addEventListener('click', onGPX));
  document.querySelectorAll('.btn-del').forEach(b=>b.addEventListener('click', onDel));
  document.querySelectorAll('.btn-view').forEach(b=>b.addEventListener('click', onView));
}

function initMiniMap(containerId, pontos){
  const el = document.getElementById(containerId);
  if (!el) return;
  try{
    const mini = L.map(containerId, { attributionControl:false, zoomControl:false, dragging:false }).setView([0,0],3);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mini);
    const latlngs = pontos.map(p=>[p.lat,p.lon]);
    if (latlngs.length){
      L.polyline(latlngs,{color:'#2b7'}).addTo(mini);
      mini.fitBounds(latlngs);
    }
    mini.invalidateSize();
  }catch(e){ console.error(e); }
}

async function onGPX(e){
  const id = Number(e.target.dataset.id);
  const db = await openDB();
  const rota = await (await db.transaction('rotas').objectStore('rotas').get(id));
  const gpx = gerarGPX(rota.pontos);
  const blob = new Blob([gpx],{type:'application/gpx+xml'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (rota.nome||'rota')+'.gpx';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function onDel(e){
  if (!confirm('Excluir rota?')) return;
  const id = Number(e.target.dataset.id);
  const db = await openDB();
  const tx = db.transaction('rotas','readwrite');
  tx.objectStore('rotas').delete(id);
  tx.oncomplete = ()=> loadRoutes();
}

function onView(e){
  const id = Number(e.target.dataset.id);
  location.href = 'index.html?view='+id;
}

loadRoutes();