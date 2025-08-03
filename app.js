let map, path = [], watchId;

function initMap() {
  map = L.map('map').setView([-14.2, -51.9], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map);
}

function startRecording() {
  path = [];
  document.getElementById('startBtn').disabled = true;
  document.getElementById('stopBtn').disabled = false;
  document.getElementById('saveBtn').disabled = true;

  watchId = navigator.geolocation.watchPosition(pos => {
    const { latitude, longitude } = pos.coords;
    const latlng = [latitude, longitude];
    path.push({ lat: latitude, lon: longitude, time: new Date().toISOString() });
    L.marker(latlng).addTo(map);
    map.setView(latlng, 16);
  }, console.error, {
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 10000
  });
}

function stopRecording() {
  navigator.geolocation.clearWatch(watchId);
  document.getElementById('startBtn').disabled = false;
  document.getElementById('stopBtn').disabled = true;
  document.getElementById('saveBtn').disabled = false;
}

function saveGPX() {
  const gpxData = convertToGPX(path);
  const blob = new Blob([gpxData], { type: 'application/gpx+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `rota-${new Date().toISOString()}.gpx`;
  a.click();
}

document.getElementById('startBtn').onclick = startRecording;
document.getElementById('stopBtn').onclick = stopRecording;
document.getElementById('saveBtn').onclick = saveGPX;

initMap();
