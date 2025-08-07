function gerarGPX(points){
  const header = '<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="GPS Pakito" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>Rota</name><trkseg>';
  const pts = points.map(p=>`<trkpt lat="${p.lat}" lon="${p.lon}"><time>${p.time||''}</time></trkpt>`).join('\n');
  const footer='</trkseg></trk></gpx>';
  return header+pts+footer;
}