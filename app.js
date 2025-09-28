/* global maplibregl, osmtogeojson, turf */
const bbox = '40.4774,-74.2591,40.9176,-73.7004'; // south,west,north,east

const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors'
      }
    },
    layers: [
      { id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }
    ]
  },
  center: [-74.0060, 40.7128],
  zoom: 11
});

async function loadGeoJSON(query, sourceId, layer) {
  const url = 'https://overpass-api.de/api/interpreter';
  const response = await fetch(url, {
    method: 'POST',
    body: `[out:json][timeout:25];${query};out geom;`
  });
  const json = await response.json();
  const geo = osmtogeojson(json);
  map.addSource(sourceId, { type: 'geojson', data: geo });
  map.addLayer(Object.assign({ id: sourceId, source: sourceId }, layer));
}

let scenicData = null;
let dangerData = null;
let startMarker = null;
let viaMarker = null;
let endMarker = null;
const routeId = 'route';

map.on('load', async () => {
  await loadGeoJSON(`way["railway"="subway"](${bbox})`, 'subway-lines', {
    type: 'line',
    paint: { 'line-color': '#ff0000', 'line-width': 2 }
  });

  await loadGeoJSON(`node["highway"="bus_stop"](${bbox})`, 'bus-stops', {
    type: 'circle',
    paint: { 'circle-radius': 2, 'circle-color': '#0000ff' }
  });

  await loadGeoJSON(`way["highway"="cycleway"](${bbox})`, 'bike-lanes', {
    type: 'line',
    paint: { 'line-color': '#00ff00', 'line-width': 1 }
  });

  await loadGeoJSON(`way["route"="ferry"](${bbox})`, 'ferry-routes', {
    type: 'line',
    paint: { 'line-color': '#00ffff', 'line-width': 2, 'line-dasharray': [2,2] }
  });

  await loadGeoJSON(`node["aeroway"="aerodrome"](${bbox})`, 'airports', {
    type: 'circle',
    paint: { 'circle-radius': 4, 'circle-color': '#ffa500' }
  });

  scenicData = await fetch('data/scenic.geojson').then(r => r.json());
  map.addSource('scenic', { type: 'geojson', data: scenicData });
  map.addLayer({ id: 'scenic', type: 'line', source: 'scenic', paint: { 'line-color': '#006600', 'line-width': 2, 'line-dasharray': [1,1] } });

  dangerData = await fetch('data/dangerous.geojson').then(r => r.json());
  map.addSource('danger', { type: 'geojson', data: dangerData });
  map.addLayer({ id: 'danger', type: 'line', source: 'danger', paint: { 'line-color': '#660000', 'line-width': 2, 'line-dasharray': [1,2] } });
});

map.on('click', e => {
  const mode2 = document.getElementById('mode2').value;
  if (!startMarker) {
    startMarker = new maplibregl.Marker({ color: 'green' }).setLngLat(e.lngLat).addTo(map);
  } else if (mode2 !== 'none' && !viaMarker) {
    viaMarker = new maplibregl.Marker({ color: 'blue' }).setLngLat(e.lngLat).addTo(map);
  } else if (!endMarker) {
    endMarker = new maplibregl.Marker({ color: 'red' }).setLngLat(e.lngLat).addTo(map);
    getRoute();
  } else {
    if (map.getLayer(routeId)) {
      map.removeLayer(routeId);
      map.removeSource(routeId);
    }
    startMarker.remove();
    if (viaMarker) viaMarker.remove();
    endMarker.remove();
    startMarker = new maplibregl.Marker({ color: 'green' }).setLngLat(e.lngLat).addTo(map);
    viaMarker = null;
    endMarker = null;
  }
});

async function getRoute() {
  const mode1 = document.getElementById('mode1').value;
  const mode2 = document.getElementById('mode2').value;
  const start = startMarker.getLngLat();
  const end = endMarker.getLngLat();
  const legs = [];
  let totalDuration = 0;

  const firstTarget = viaMarker ? viaMarker.getLngLat() : end;
  const url1 = `https://router.project-osrm.org/route/v1/${mode1}/${start.lng},${start.lat};${firstTarget.lng},${firstTarget.lat}?overview=full&geometries=geojson`;
  const res1 = await fetch(url1);
  const json1 = await res1.json();
  legs.push(json1.routes[0].geometry.coordinates);
  totalDuration += json1.routes[0].duration;

  if (viaMarker && mode2 !== 'none') {
    const via = viaMarker.getLngLat();
    const url2 = `https://router.project-osrm.org/route/v1/${mode2}/${via.lng},${via.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    const res2 = await fetch(url2);
    const json2 = await res2.json();
    legs.push(json2.routes[0].geometry.coordinates);
    totalDuration += json2.routes[0].duration;
  }

  const allCoords = legs.flat();
  const data = { type: 'LineString', coordinates: allCoords };
  const feature = { type: 'Feature', geometry: data };

  if (map.getSource(routeId)) {
    map.getSource(routeId).setData(feature);
  } else {
    map.addSource(routeId, { type: 'geojson', data: feature });
    map.addLayer({ id: routeId, type: 'line', source: routeId, paint: { 'line-color': '#000', 'line-width': 4 } });
  }

  let scenicCount = 0;
  let dangerCount = 0;
  scenicData.features.forEach(f => { if (turf.booleanIntersects(feature, f)) scenicCount++; });
  dangerData.features.forEach(f => { if (turf.booleanIntersects(feature, f)) dangerCount++; });
  let reliability = 0.9 - 0.05 * dangerCount + 0.02 * scenicCount;
  reliability = Math.max(0, Math.min(1, reliability));

  const departStr = document.getElementById('depart').value;
  const deadlineStr = document.getElementById('deadline').value;
  let info = '';
  if (departStr) {
    const depart = new Date(departStr);
    const arrival = new Date(depart.getTime() + totalDuration * 1000);
    info += `Arrival: ${arrival.toLocaleString()}\n`;
    if (deadlineStr) {
      const deadline = new Date(deadlineStr);
      if (arrival > deadline) info += 'Warning: arrival past deadline\n';
    }
  }
  info += `Duration: ${(totalDuration / 60).toFixed(1)} min\nReliability: ${(reliability * 100).toFixed(0)}%\nScenic segments: ${scenicCount}\nDangerous segments: ${dangerCount}`;

  const preferScenic = document.getElementById('prefer-scenic').checked;
  const avoidDanger = document.getElementById('avoid-danger').checked;
  if (preferScenic && scenicCount === 0) info += '\nNo scenic segments in route';
  if (avoidDanger && dangerCount > 0) info += '\nRoute includes dangerous segments';

  document.getElementById('info').innerText = info;
}
