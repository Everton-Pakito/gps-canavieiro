// GPS Pakito - app.js (v3)
let map, userMarker, polyline, watchId=null, points=[], startTime=null, distanceKm=0;
let wakeLock = null;

const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const btnExport = document.getElementById('btnExport');
const status = document.getElementById('status');

document.addEventListener('DOMContentLoaded', async () => {
  map = L.map('map').setView([0,0], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(p=>{
      const lat = p.coords.latitude, lon = p.coords.longitude;
      map.setView([lat,lon],17);
      userMarker = L.marker([lat,lon]).addTo(map).bindPopup('📍 Você está aqui').openPopup();
    }, err => {
      console.warn('geolocation error', err);
      status.textContent = 'Não foi possível obter localização inicial.';
    });
  } else {
    status.textContent = 'Geolocalização não suportada.';
  }

  await openDB();
  registerVisibilityHandler();
  registerSW();
});

btnStart.addEventListener('click', startRecording);
btnStop.addEventListener('click', stopRecording);
btnExport.addEventListener('click', exportCurrentGPX);

function registerVisibilityHandler(){
  document.addEventListener('visibilitychange', async ()=>{
    if (document.visibilityState === 'visible') {
      if (watchId && !wakeLock) requestWakeLock().catch(()=>{});
    }
  });
}

async function requestWakeLock(){
  try {
    if ('wakeLock' in navigator){
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', ()=>{ wakeLock = null; });
    }
  } catch(e){ console.warn('Wake lock failed', e); }
}

function startRecording(){
  points = [];
  distanceKm = 0;
  startTime = Date.now();
  polyline = L.polyline([], {color:'blue'}).addTo(map);
  btnStart.disabled = true; btnStop.disabled = false; btnExport.disabled = true;
  status.textContent = 'Gravando rota...';
  if (navigator.geolocation){
    watchId = navigator.geolocation.watchPosition(onPos, onErr, { enableHighAccuracy:true, maximumAge:1000, timeout:10000 });
    requestWakeLock().catch(()=>{});
  } else alert('Geolocalização não suportada.');
}

function onPos(p){
  const lat = p.coords.latitude, lon = p.coords.longitude;
  const t = new Date().toISOString();
  points.push({lat,lon,time:t,acc:p.coords.accuracy});
  if (!userMarker) userMarker = L.marker([lat,lon]).addTo(map);
  else userMarker.setLatLng([lat,lon]);
  polyline.addLatLng([lat,lon]);
  map.panTo([lat,lon]);
  if (points.length>1){
    const a = points[points.length-2], b = points[points.length-1];
    distanceKm += haversine(a.lat,a.lon,b.lat,b.lon);
  }
  statusDistance();
}

function onErr(e){ console.error(e); status.textContent = 'Erro de GPS: '+ (e.message || e.code); }

function stopRecording(){
  if (watchId) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  if (wakeLock){ try{ wakeLock.release(); }catch(e){} wakeLock=null; }
  btnStart.disabled=false; btnStop.disabled=true; btnExport.disabled=false;
  status.textContent = 'Gravação parada.';
  if (points.length>1){
    const endTime = Date.now();
    const durationMin = (endTime - startTime)/60000;
    const avgSpeed = durationMin>0? (distanceKm/(durationMin/60)):0;
    const defaultName = 'Rota '+(new Date()).toLocaleString();
    const nome = prompt('Nome da rota:', defaultName) || defaultName;
    const rota = {
      nome,
      dataInicio: new Date(startTime).toISOString(),
      dataFim: new Date(endTime).toISOString(),
      duracaoMin: durationMin,
      distanciaKm: distanceKm,
      velocidadeMediaKmh: avgSpeed,
      pontos: points
    };
    saveRouteToDB(rota);
  } else {
    alert('Pontos insuficientes para salvar rota.');
  }
}

function exportCurrentGPX(){
  if (!points || points.length<2) return alert('Sem rota gravada para exportar.');
  const gpx = gerarGPX(points);
  const blob = new Blob([gpx], {type:'application/gpx+xml'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'rota-'+new Date().toISOString()+'.gpx';
  a.click();
  URL.revokeObjectURL(a.href);
}

function statusDistance(){
  status.textContent = `Pontos: ${points.length} — Dist: ${distanceKm.toFixed(3)} km`;
}

function haversine(lat1,lon1,lat2,lon2){
  const R=6371;
  const dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function toRad(v){ return v*Math.PI/180; }

// IndexedDB helpers
function openDB(){
  return new Promise((res,rej)=>{
    const req = indexedDB.open('gps-pakito-db',1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('rotas')){
        db.createObjectStore('rotas',{keyPath:'id',autoIncrement:true});
      }
    };
    req.onsuccess = ()=> res(req.result);
    req.onerror = ()=> rej(req.error);
  });
}

async function saveRouteToDB(rota){
  const db = await openDB();
  const tx = db.transaction('rotas','readwrite');
  tx.objectStore('rotas').add(rota);
  tx.oncomplete = ()=> { alert('Rota salva na galeria.'); };
  tx.onerror = ()=> { alert('Erro ao salvar rota.'); };
}

// Service worker registration
function registerSW(){
  if ('serviceWorker' in navigator){
    navigator.serviceWorker.register('service-worker.js').then(()=>console.log('SW registrado')).catch(()=>{});
  }
}
