import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

for (const file of ['.env', '.env.local']) {
  try { process.loadEnvFile(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
if (!token) throw new Error('Configura NEXT_PUBLIC_MAPBOX_TOKEN para generar las vistas.');
const routes = JSON.parse(await readFile('data/rutas_produccion_final.json', 'utf8'));
const stops = JSON.parse(await readFile('data/gtfs/stops.json', 'utf8'));
const origin = [-102.04234, 19.42687];
const station = (id) => {
  const stop = stops.find((item) => item.stop_id === id);
  return [stop.stop_lon, stop.stop_lat];
};
const presidencia = station('TEL_E4');
const route = routes.find((item) => item.name === 'Ruta 11' && item.original_name.includes('(Ida)'));
const nearestIndex = (path, point) => path.reduce((best, coordinate, index) =>
  Math.hypot(coordinate[0] - point[0], coordinate[1] - point[1]) <
  Math.hypot(path[best][0] - point[0], path[best][1] - point[1]) ? index : best, 0);
const startIndex = nearestIndex(route.path, origin);
const trips = [
  { id: 'centro-historico', destination: 'Centro Histórico', end: station('TEL_E5'), stationIds: [], stages: ['start', 'walk', 'bus', 'finish'] },
  { id: 'mercado-poniente', destination: 'Mercado Poniente', end: station('TEL_E6'), stationIds: ['TEL_E4', 'TEL_E5', 'TEL_E6'], stages: ['start', 'bus', 'transfer', 'cable', 'finish'] },
  { id: 'hospital-regional', destination: 'Hospital Regional', end: station('TEL_E1'), stationIds: ['TEL_E4', 'TEL_E3', 'TEL_E2', 'TEL_E1'], stages: ['start', 'bus', 'transfer', 'cable', 'finish'] },
];
const output = resolve('public/landing/journeys');
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;background:#0c1518;color:#eef2ea;font-family:Arial,sans-serif}
    #map{position:absolute;inset:116px 0 102px}header{height:116px;padding:20px 22px;border-bottom:1px solid #ffffff24}
    .brand{font-size:18px;font-weight:800;color:#b8e840} .eyebrow{float:right;font-size:10px;color:#bbc7c0;padding-top:6px}
    header small{display:block;color:#becac4;font-size:11px;margin-top:15px}h1{font-size:22px;margin:5px 0 0;line-height:1.2}
    footer{position:absolute;bottom:0;left:0;right:0;height:102px;padding:18px 22px;border-top:1px solid #ffffff24}
    footer small{font-size:11px;color:#9cafaf}footer strong{display:block;font-size:18px;margin-top:8px}
    .pin{width:30px;height:30px;border:3px solid #fff;border-radius:50%;background:#0c1518;color:white;display:grid;place-items:center;font-weight:700;font-size:13px;box-shadow:0 2px 6px #0008}
    .pin-a{background:#247b4b}.pin-b{background:#ad2838}.pin-current{background:#087e8d;width:24px;height:24px}
  </style></head><body><header><span class="brand">UruGo</span><span class="eyebrow">VISTA DEL RECORRIDO</span><small>Central de Autobuses →</small><h1 id="destination"></h1></header><div id="map"></div><footer><small id="mode"></small><strong id="stage"></strong></footer></body></html>`;
  await page.route('http://localhost:3000/__landing_capture', (route) => route.fulfill({ contentType:'text/html', body:html }));
  await page.goto('http://localhost:3000/__landing_capture');
  await page.addStyleTag({ path: resolve('node_modules/mapbox-gl/dist/mapbox-gl.css') });
  await page.addScriptTag({ path: resolve('node_modules/mapbox-gl/dist/mapbox-gl.js') });
  await page.evaluate(async (accessToken) => {
    mapboxgl.accessToken = accessToken;
    const map = new mapboxgl.Map({ container: 'map', style: 'mapbox://styles/mapbox/streets-v12', center: [-102.05,19.42], zoom: 12, preserveDrawingBuffer: true, attributionControl: false });
    map.addControl(new mapboxgl.AttributionControl({ compact: false }), 'bottom-right');
    await new Promise((resolve) => map.on('load', resolve));
    window.previewMap = map;
    window.previewMarkers = [];
  }, token);

  for (const trip of trips) {
    const busEnd = trip.stationIds.length ? presidencia : trip.end;
    const endIndex = nearestIndex(route.path, busEnd);
    if (endIndex <= startIndex) throw new Error(`Sentido inválido para ${trip.id}`);
    const bus = route.path.slice(startIndex, endIndex + 1);
    const cable = trip.stationIds.map(station);
    for (const [index, stage] of trip.stages.entries()) {
      await page.evaluate(async ({ trip, bus, cable, stage, origin, presidencia }) => {
        const map = window.previewMap;
        window.previewMarkers.forEach((marker) => marker.remove());
        window.previewMarkers = [];
        const line = (coordinates, color, dashed = false) => ({ type:'Feature', properties:{ color, dashed }, geometry:{ type:'LineString', coordinates } });
        const features = [line(bus, '#168da2')];
        if (cable.length) features.push(line(cable, '#ae6d00'));
        // Dashed lines indicate the connection to the route, not a surveyed walking path.
        features.push(line([origin, bus[0]], '#52645e', true));
        features.push(line([bus.at(-1), cable[0] ?? trip.end], '#52645e', true));
        const data = { type:'FeatureCollection', features };
        if (map.getSource('journey')) map.getSource('journey').setData(data);
        else {
          map.addSource('journey', { type:'geojson', data });
          map.addLayer({ id:'journey-outline', type:'line', source:'journey', paint:{ 'line-color':'#ffffff', 'line-width':8 } });
          map.addLayer({ id:'journey-line', type:'line', source:'journey', filter:['==',['get','dashed'],false], paint:{ 'line-color':['get','color'], 'line-width':4 } });
          map.addLayer({ id:'journey-walk', type:'line', source:'journey', filter:['==',['get','dashed'],true], paint:{ 'line-color':['get','color'], 'line-width':3, 'line-dasharray':[1,2] } });
        }
        const pin = (point, text, className) => {
          const element = document.createElement('div');
          element.className = `pin ${className}`; element.textContent = text;
          window.previewMarkers.push(new mapboxgl.Marker({element}).setLngLat(point).addTo(map));
        };
        pin(origin, 'A', 'pin-a'); pin(trip.end, 'B', 'pin-b');
        const labels = { start:'Central de Autobuses', walk:'Camina a la parada', bus:'Ruta 11', transfer:'Estación Presidencia', cable:`Hacia ${trip.destination}`, finish:trip.destination };
        const modes = { start:'SALIDA', walk:'CONEXIÓN A PIE', bus:'EN CAMIÓN', transfer:'TRANSBORDO', cable:'EN TELEFÉRICO', finish:'DESTINO' };
        document.getElementById('destination').textContent = trip.destination;
        document.getElementById('mode').textContent = modes[stage];
        document.getElementById('stage').textContent = labels[stage];
        let points = [...bus, ...cable, origin, trip.end];
        if (stage === 'walk') points = [origin,bus[0]];
        if (stage === 'bus') { points = bus; pin(bus[Math.floor(bus.length/2)], '•', 'pin-current'); }
        if (stage === 'transfer') { points = [bus.at(-1),presidencia]; pin(presidencia,'T','pin-current'); }
        if (stage === 'cable') { points = cable; pin(cable[Math.floor((cable.length-1)/2)],'T','pin-current'); }
        if (stage === 'finish') points = [trip.end];
        const bounds = points.reduce((bounds, point) => bounds.extend(point), new mapboxgl.LngLatBounds());
        map.fitBounds(bounds, { padding:55, duration:0, maxZoom:stage==='finish'?15.2:15.8 });
        await new Promise((resolve) => { if(map.loaded()) resolve(); else map.once('idle',resolve); });
      }, { trip, bus, cable, stage, origin, presidencia });
      await page.waitForTimeout(300);
      await page.screenshot({ path: resolve(output, `${trip.id}-${index}.webp`), type:'webp', quality:85 });
      console.log(`Captured ${trip.id} / ${stage}`);
    }
  }
} finally { await browser.close(); }
